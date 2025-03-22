import { BaseInstaller, BindingFeature, ExposeFeature, GroupFeature, IFeature, JobFeature, MergeFeatures, NetworkFeature, ScalingFeature, SystemUsageFeature, UpdateStrategy, VariableFeature, VolumeFeature } from "@veto-party/baum__steps__installer__features";
import { ARendererManager } from "../ARendererManager.js";
import { IFeatureManager, IFilter, InferNewRenderer, InferToFeatureManager, IRendererFeatureManager, IRendererManager } from "../../interface/IRendererManager.js";
import { RenderFeatureManager } from "../RenderFeatureManager.js";
import { isEqual, merge } from 'lodash-es';
import { IWorkspace } from "@veto-party/baum__core";
import { ConfigMappingWithStore, IConfigMapRenderer, IConfigMapStructure } from "./interface/IConfigMapRenderer.js";
import { IDeploymentRenderer } from "./interface/IDeploymentRenderer.js";
import { ISecretRenderer } from "./interface/ISecretRenderer.js";
import { IJobRenderer } from "./interface/IJobRenderer.js";
import { IServiceRenderer } from "./interface/IServiceRenderer.js";
import { INetworkRenderer } from "./interface/INetworkRenderer.js";
import { INameProvider } from "../../interface/INameProvider.js";
import { ExposeStructure, IExposeRenderer } from "./interface/IExposeRenderer.js";
import { IWritable } from "./interface/IWritable.js";
import { RendererMetadata, InferStructure } from "../../interface/IRenderer.js";

type GivenFeature = typeof BaseInstaller.makeInstance extends () => IFeature<infer A0, infer A1, infer A2> ? typeof VariableFeature.makeInstance extends () => IFeature<infer B0, infer B1, infer B2> ? MergeFeatures<IFeature<A0, A1, A2>, 'properties', IFeature<B0, B1, B2>> extends infer Feature ? Feature : never : never : never;
export class HelmRenderer<T extends IFeature<any,any,any>> extends ARendererManager<T> {

    public bindingStorage = new Map<IWorkspace, Map<string, string>>();
    public propertyStorage = new Map<IWorkspace|undefined, IConfigMapStructure>();

    public jobStorage = new Map<IWorkspace|undefined, Map<string, typeof HelmRenderer['buildBaseInstance'] extends (...args: any[]) => HelmRenderer<IFeature<infer A0, infer A1, infer A2>> ? MergeFeatures<IFeature<A0, A1, A2>, undefined, JobFeature> extends IFeature<any, any, infer Structure> ? Structure : never : never>>;
    public jobBindingStorage = new Map<IWorkspace|undefined, Map<string, Map<string, string>>>();
    public jobPropertyStorage = new Map<IWorkspace|undefined, Map<string, IConfigMapStructure>>();

    public globalBindingStorage = new Map<string, ConfigMappingWithStore>();

    public writers: IWritable[] = [];
    
    protected constructor(
        feature: T,
        private secretRenderer: ISecretRenderer,
        private configMapRenderer: IConfigMapRenderer,
        private nameProvider: INameProvider,
    ) {
        super(feature);
    }

    public static mergeElements<A extends Map<any, any>, B extends Map<any, any>>(a: A, b: B): A extends Map<infer AKey, infer AValue> ? B extends Map<infer BKey, infer BValue> ? Map<AKey & BKey, AValue | BValue> : never : never {
        const aSet = new Set(a.keys());
        const bSet = new Set(b.keys());

        const newMap = new Map<any, any>(a.entries());

        aSet.difference(bSet).forEach((el) => {
            if (isEqual(a.get(el), b.get(el))) {
                return;
            }

            console.warn(`UNSAFE: ${el} will be overridden!`);
        });

        bSet.forEach((el) => {
            newMap.set(el, b.get(el)!);
        })


        return newMap as any;
    }

    private static ensurePropertyValueGenerator<SomeMap extends Map<any, any>>(map: SomeMap, generator: SomeMap extends Map<infer Key, infer Value> ? (workspace: Key) => Value : never) {
        return (key: SomeMap extends Map<infer U, any> ? U : never) : SomeMap extends Map<any, infer Value> ? Value : never => {
            if (!map.has(key)) {
                map.set(key, generator(key));
            }
            return map.get(key)!;
        }
    }

    private static buildVariableStorage<Key>(givenMap: Map<Key|undefined, IConfigMapStructure>, resolver: (...parameters: Parameters<Parameters<IFeatureManager<GivenFeature>['addRenderer']>[0]>) => Key) {
        return (feature: IFeatureManager<GivenFeature>): IFeatureManager<GivenFeature> => {
            const ensurePropertyStorage = HelmRenderer.ensurePropertyValueGenerator(givenMap, () => new Map());
            return feature.addRenderer((metadata, data) => {
                const key = resolver(metadata, data);
                let elem = ensurePropertyStorage(key);
                let globalElem = ensurePropertyStorage(undefined);

                for (const dataset of data) {
                    const allVars = Object.entries(dataset.variable ?? {} as Exclude<typeof dataset.variable, undefined>);
                    const [globalVars, otherVars] = allVars.reduce(([globalVars, otherVars], entry) => {
                        const [, value] = entry;
                        const scope = value.type === 'global' ? globalVars : otherVars;
                        scope.push(entry);
                        return [globalVars, otherVars];
                    }, [[] as typeof allVars, [] as typeof allVars] as const);


                    elem = HelmRenderer.mergeElements(elem, new Map(globalVars));
                    globalElem = HelmRenderer.mergeElements(globalElem, new Map(otherVars));
                }

                givenMap.set(key, elem);
                givenMap.set(undefined, globalElem);
            });
        }
    }

    public static buildBaseInstance(secretRenderer: ISecretRenderer, configMapRenderer: IConfigMapRenderer, nameProvider: INameProvider) {
        return (new HelmRenderer(BaseInstaller.makeInstance(), secretRenderer, configMapRenderer, nameProvider))
            .ensureFeature('properties' as const, VariableFeature.makeInstance(), function (feature) {
                return HelmRenderer.buildVariableStorage(this.propertyStorage, (metadata) => metadata.project.workspace)(feature);
            })
            .ensureFeature('properties' as const, new BindingFeature(), function (feature) {
                const ensureBindingStorage = HelmRenderer.ensurePropertyValueGenerator(this.bindingStorage, () => new Map());
                feature.addRenderer((metadata, data) => {
                    let binding = ensureBindingStorage(metadata.project.workspace);
                    for (const dataset of data) {
                        binding = HelmRenderer.mergeElements(binding, new Map(Object.entries(dataset.binding ?? {})));
                    }
                    this.bindingStorage.set(metadata.project.workspace, binding);
                })
                return feature;
            })
            .ensureFeature('properties' as const, new NetworkFeature(), (feature) => {
                feature.addRenderer((metadata, structure) => {
                    
                });
                return feature;
            })
            .ensureFeature('properties' as const, new VolumeFeature(), (feature) => {
                return feature;
            });
    }

    public static makeIntance(
        configMapRenderer: IConfigMapRenderer,
        secretRenderer: ISecretRenderer,
        deploymentRenderer: IDeploymentRenderer,
        exposeRenderer: IExposeRenderer,
        networkRenderer: INetworkRenderer,
        jobRenderer: IJobRenderer,
        serviceRenderer: IServiceRenderer,
        nameProvider: INameProvider
    ) {

        const exposeStorage = new Map<IWorkspace, Map<string, ExposeStructure>>();
        const ensureExposeStorage = HelmRenderer.ensurePropertyValueGenerator(exposeStorage, () => new Map());

        const baseRenderer = HelmRenderer.buildBaseInstance(secretRenderer, configMapRenderer,nameProvider);

            const jobStructure = BaseInstaller.makeInstance()
                .appendFeature(`patternProperties["^[a-zA-Z0-9]+$"]` as const, baseRenderer.getGroup())
                .appendFeature(`patternProperties["^[a-zA-Z0-9]+$"]` as const, new JobFeature());

            baseRenderer.ensureFeature('properties.job' as const, jobStructure, function (feature) {

                const ensureWorkspace = HelmRenderer.ensurePropertyValueGenerator(this.jobPropertyStorage, () => new Map());
                const ensureJob = HelmRenderer.ensurePropertyValueGenerator(this.jobStorage, () => new Map());

                feature.addRenderer(async (metadata, structure) => {
                    // undefined marks global.
                    const filteredStructure = new Map<string | undefined, Record<string | number, Exclude<(typeof structure)[number]['job'], undefined>[string][]>>();
                    const ensureFilteredStruct = HelmRenderer.ensurePropertyValueGenerator(filteredStructure, () => ({}));

                    structure.flatMap((obj) => Object.entries(obj.job ?? {}), 1).forEach(([key, value]) => {
                        const key2 = value.type === 'global' ? undefined : key
                        ensureFilteredStruct(key2)[key] ??= [];
                        ensureFilteredStruct(key2)[key].push(value);
                    }); 
                    
                    for (const [key, entries] of filteredStructure.entries()) {
                        for (const [jobKey, structure] of Object.entries(entries)) {

                            ensureJob(key === undefined ? undefined : metadata.project.workspace).set(jobKey, merge({}, ...structure));

                            const mockRenderer = new RenderFeatureManager<GivenFeature>();
                            HelmRenderer.buildVariableStorage(ensureWorkspace(key === undefined ? undefined : metadata.project.workspace), () => jobKey)(mockRenderer);
                            await mockRenderer.render(metadata, structure);
                        }
                    }
                
                });
                return feature;
            })
            .ensureFeature('properties' as const, new ExposeFeature(), (feature) => {
                return feature.addRenderer((metadata, data) => {
                    let storage = ensureExposeStorage(metadata.project.workspace);
                    for (const element of data) {
                        storage = HelmRenderer.mergeElements(storage, new Map(Object.entries(element.expose ?? {})));
                    }

                    exposeStorage.set(metadata.project.workspace, storage);
                });
            })
            .ensureFeature('properties' as const, new ScalingFeature(), (feature) => {
                return feature;
            })
            .ensureFeature('properties' as const, new SystemUsageFeature(), (feature) => {
                return feature;
            })
            .ensureFeature('properties' as const, new NetworkFeature(), (feature) => {
                return feature;
            })
            .ensureFeature('properties' as const, new UpdateStrategy(), (feature) => {
                return feature;
            })
            // .ensureFeature('properties' as const, ServiceFeature.makeInstance(), (feature) => {
            //     return feature;
            // });

        baseRenderer.addRenderer(async function (metadata) {
            const configResult = await configMapRenderer.render(metadata.project.workspace, this.propertyStorage, this.bindingStorage.get(metadata.project.workspace));
            this.writers.push(configResult);
            const secretResult = await secretRenderer.render(metadata.project.workspace, this.propertyStorage, this.bindingStorage.get(metadata.project.workspace));
            this.writers.push(secretResult);
            const portsResult = await exposeRenderer.render(metadata.project.workspace, exposeStorage.get(metadata.project.workspace));
            this.writers.push(portsResult);

            const itemsMap = HelmRenderer.mergeElements(await configResult.getResolvedWorkspaceVars(), await secretResult.getResolvedWorkspaceSecrets());

            itemsMap.entries().forEach(([key, entry]) => {
                if ('store' in entry && entry.store && entry.global) {
                    this.globalBindingStorage.set(key, entry);
                }
            });

            const deploymentResult = await deploymentRenderer.render(metadata.project.workspace, itemsMap, portsResult.getPorts());            
            this.writers.push(deploymentResult);
        });
    }

    public async render(metadata: RendererMetadata, structure: InferStructure<T>[]): Promise<void> {
        await super.render(metadata, structure);
        const binding = new Map(this.globalBindingStorage.entries().map(([key, value]) => [key, typeof value.store === 'string' ? value.key : undefined] as const).filter((entry): entry is readonly [string, string] => entry[1] !== undefined));

        const secretRenderer = await this.secretRenderer.render(undefined, this.propertyStorage, binding);
        this.writers.push(secretRenderer);

        const valueRenderer = await this.configMapRenderer.render(undefined, this.propertyStorage, binding);
        this.writers.push(valueRenderer);

        for (const writer of this.writers) {
            writer.write(this.nameProvider);
        }
    }

    ensureFeature<
        WritePath, 
        Feature extends IFeature<any, any, any>
    >(
            writePath: WritePath, 
            feature: Feature,
            creator: (this: HelmRenderer<MergeFeatures<T, WritePath, Feature>>, rendererGenerator: InferToFeatureManager<InferNewRenderer<WritePath, IFeatureManager<T>, Feature>>) => InferToFeatureManager<InferNewRenderer<WritePath, IFeatureManager<T>, Feature>>,
            filter?: IFilter<InferNewRenderer<WritePath, IFeatureManager<T>, Feature> extends IRendererManager<infer NewFeature> ? NewFeature : never> 
    ): HelmRenderer<MergeFeatures<T, WritePath, Feature>>  {
        return super.ensureFeature(writePath, feature, creator as any, filter) as any;
    }

    protected createSelf<U extends IFeature<any, any, any>>(feature: U): ARendererManager<U> {
        const helm = new HelmRenderer(feature, this.secretRenderer, this.configMapRenderer, this.nameProvider);
        helm.featureCache = new Map(this.featureCache) as any;
        return helm as any;
    }
    
    protected createFeatureManager(_: T): IRendererFeatureManager<T> {
        return new RenderFeatureManager<T>();
    }
}