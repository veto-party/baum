import { BaseInstaller, BindingFeature, ExposeFeature, GroupFeature, IFeature, JobFeature, MergeFeatures, NetworkFeature, ScalingFeature, ServiceFeature, SystemUsageFeature, UpdateStrategy, VariableFeature, VolumeFeature } from "@veto-party/baum__steps__installer__features";
import { ARendererManager } from "../ARendererManager.js";
import { IFeatureManager, IFilter, InferNewRenderer, InferToFeatureManager, IRendererFeatureManager, IRendererManager } from "../../interface/IRendererManager.js";
import { RenderFeatureManager } from "../RenderFeatureManager.js";
import { get, isEqual, merge, property, uniq } from 'lodash-es';
import { IWorkspace } from "@veto-party/baum__core";
import { ConfigMappingWithStore, IConfigMapRenderer, IConfigMapStructure } from "./interface/IConfigMapRenderer.js";
import { IDeploymentRenderer } from "./interface/IDeploymentRenderer.js";
import { ISecretRenderer } from "./interface/ISecretRenderer.js";
import { IJobRenderer, JobStructure } from "./interface/IJobRenderer.js";
import { IServiceRenderer } from "./interface/IServiceRenderer.js";
import { INetworkRenderer } from "./interface/INetworkRenderer.js";
import { INameProvider } from "../../interface/INameProvider.js";
import { ExposeStructure, IExposeRenderer } from "./interface/IExposeRenderer.js";
import { IWritable } from "./interface/IWritable.js";
import { RendererMetadata, InferStructure } from "../../interface/IRenderer.js";
import { MergeDeepForToDefinitionStructureWithTupleMerge } from "@veto-party/baum__steps__installer__features/src/abstract/types/MergeDeepForToDefinitionStructureWithTupleMerge.js";
import { getDeepKeys } from "../../utility/getDeepKeys.js";

type VariableStorageFeature = typeof BaseInstaller.makeInstance extends () => IFeature<infer A0, infer A1, infer A2> ? typeof VariableFeature.makeInstance extends () => IFeature<infer B0, infer B1, infer B2> ? MergeFeatures<IFeature<A0, A1, A2>, 'properties', IFeature<B0, B1, B2>> extends infer Feature ? Feature : never : never : never;

type BindingStorageFeature = typeof BaseInstaller.makeInstance extends () => IFeature<infer A0, infer A1, infer A2> ? MergeFeatures<IFeature<A0, A1, A2>, 'properties', BindingFeature> extends infer Feature ? Feature : never : never;

const NOT_FOUND = Symbol('NOT_FOUND');

export class HelmRenderer<T extends IFeature<any,any,any>> extends ARendererManager<T> {

    /**
     * These are the bindings for the given workspace.
     * 
     * A binding is a key that maps to a key of a property.
     * It is done this way so that a variable can be refenced multiple times (from multiple bindings).
     */
    public bindingStorage = new Map<IWorkspace, Map<string, string>>();

    /**
     * Properties are a (workspace|undefined) mapping, where undefined represents the global scope.
     * Properties are the values (environment + secret environment), which in turn are consumed by the bindings. 
     */
    public propertyStorage = new Map<IWorkspace|undefined, IConfigMapStructure>();

    /**
     * Jobs are a (workspace|undefined) mapping, where undefined represents the global scope.
     * Jobs are the complete jobs, with bindings and properties.
     * Bindings and properties are stored twice to make it more easy to work with them.
     *
     * This is called jobs since every (workspace|undefined) can have multiple jobs which are accessed by name.
     */
    public jobStorage = new Map<IWorkspace|undefined, Map<string, JobStructure>>;

    /**
     * Job bindings are a (workspace|undefined)(string) which in turn are used to map the scoped or global variables(evironment + secrets) to a specified job.
     * An entry is not necessarrly presnet when a job storage is present, if this is not present, there are no bindings to a job.
     */
    public jobBindingStorage = new Map<IWorkspace|undefined, Map<string, Map<string, string>>>();

    /**
     * Job properties are a (workspace|undefined)(string) which in turn can be used multiple times.
     * These dependencies can also be accessed by the bindingStorage property.
     * 
     * The job somejob is defined and contains a variable called foo.
     * Then you access it using somejob.variable.a.
     */
    public jobPropertyStorage = new Map<IWorkspace|undefined, Map<string, IConfigMapStructure>>();

    /**
     * This is the storage for all the bindings that come from the global storage.
     * It is later used to build the global config map and the global config secret.
     */
    public globalBindingStorage = new Map<string | number, ConfigMappingWithStore>();

    /**
     * Writers are the temporary stored version a yaml file.
     * It is generated successfully, but not yet written to the file system.
     * 
     * A writer is usually returned by a renderer.
     * It might contain usefull information for additional steps.
     */
    public writers: IWritable[] = [];
    
    protected constructor(
        feature: T,
        private secretRenderer: ISecretRenderer,
        private configMapRenderer: IConfigMapRenderer,
        private nameProvider: INameProvider,
    ) {
        super(feature);
    }

    public static mergeElements<A extends Map<any, any>, B extends Map<any, any>>(a: A, b: B): A extends Map<infer AKey, infer AValue> ? B extends Map<infer BKey, infer BValue> ? Map<AKey | BKey, AValue | BValue> : never : never {
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

    public static warnAboutDifferences<A extends Record<any, any>, B extends Record<any, any>>(a: A, b: B): A extends Record<infer AKey, infer AValue> ? B extends Record<infer BKey, infer BValue> ? Record<AKey | BKey, MergeDeepForToDefinitionStructureWithTupleMerge<AValue, BValue>> : never : never {
        const keysToCheck = uniq([getDeepKeys(a), getDeepKeys(b)].flat());
        for (const key of keysToCheck) {
            const aValue = get(a, key, NOT_FOUND);
            const bValue = get(b, key, NOT_FOUND);
            if (aValue == NOT_FOUND || bValue == NOT_FOUND || isEqual(aValue, bValue)) {
                continue;
            }
        
            console.warn(`${key} is overridden`);
        }

        return merge(a, b) as any;
    }

    private static ensurePropertyValueGenerator<SomeMap extends Map<any, any>>(map: SomeMap, generator: SomeMap extends Map<infer Key, infer Value> ? (workspace: Key) => Value : never) {
        return (key: SomeMap extends Map<infer U, any> ? U : never) : SomeMap extends Map<any, infer Value> ? Value : never => {
            if (!map.has(key)) {
                map.set(key, generator(key));
            }
            return map.get(key)!;
        }
    }

    private static buildVariableStorage<Key>(givenMap: Map<Key|undefined, IConfigMapStructure>, resolver: (...parameters: Parameters<Parameters<IFeatureManager<VariableStorageFeature>['addRenderer']>[0]>) => Key) {
        return (feature: IFeatureManager<VariableStorageFeature>): IFeatureManager<VariableStorageFeature> => {
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

    private static buildBindingStorage<Key>(givenMap: Map<Key|undefined, Map<string, string>>, resolver: (...parameters: Parameters<Parameters<IFeatureManager<BindingStorageFeature>['addRenderer']>[0]>) => Key) {
        return (feature: IFeatureManager<BindingStorageFeature>): IFeatureManager<BindingStorageFeature> => {
            const ensureBindingStorage = HelmRenderer.ensurePropertyValueGenerator(givenMap, () => new Map());
            return feature.addRenderer((metadata, data) => {
                const key = resolver(metadata, data);
                let binding = ensureBindingStorage(key);
                for (const dataset of data) {
                    binding = HelmRenderer.mergeElements(binding, new Map(Object.entries(dataset.binding ?? {})));
                }
                givenMap.set(key, binding);
            });
        }
    }

    public static buildBaseInstance(secretRenderer: ISecretRenderer, configMapRenderer: IConfigMapRenderer, nameProvider: INameProvider) {
        return (new HelmRenderer(BaseInstaller.makeInstance(), secretRenderer, configMapRenderer, nameProvider))
            .ensureFeature('properties' as const, VariableFeature.makeInstance(), function (feature) {
                return HelmRenderer.buildVariableStorage(this.propertyStorage, (metadata) => metadata.project.workspace)(feature);
            })
            .ensureFeature('properties' as const, new BindingFeature(), function (feature) {
                return HelmRenderer.buildBindingStorage(this.bindingStorage, (metadata) => metadata.project.workspace)(feature);
            })
            .ensureFeature('properties' as const, new NetworkFeature(), (feature) => {
                return feature;
            })
            .ensureFeature('properties' as const, new VolumeFeature(), (feature) => {
                return feature;
            })
            .ensureFeature('properties' as const, new SystemUsageFeature(), (feature) => {
                return feature;
            });
    }



    public static makeInstance(
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

                const ensureJobBindings = HelmRenderer.ensurePropertyValueGenerator(this.jobBindingStorage, () => new Map());
                const ensureJobProperties = HelmRenderer.ensurePropertyValueGenerator(this.jobPropertyStorage, () => new Map());
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

                            const innerRenderer = new RenderFeatureManager<MergeFeatures<VariableStorageFeature, undefined, BindingStorageFeature>>();
                            HelmRenderer.buildVariableStorage(ensureJobProperties(key === undefined ? undefined : metadata.project.workspace), () => jobKey)(innerRenderer);
                            HelmRenderer.buildBindingStorage(ensureJobBindings(key === undefined ? undefined : metadata.project.workspace), () => jobKey)(innerRenderer);
                            await innerRenderer.renderFeature(metadata, structure);
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
                return feature.addRenderer(function(metadata, data) {
                    for (const element of data) {

                    }
                })
            })
            // .ensureFeature('properties' as const, new NetworkFeature(), (feature) => {
            //     return feature;
            // })
            .ensureFeature('properties' as const, new UpdateStrategy(), (feature) => {
                return feature;
            })
            .ensureFeature('properties' as const, ServiceFeature.makeInstance(), (feature) => {
                return feature;
            });

        
 

        baseRenderer.addRenderer(async function (metadata) {
            await (async () => {

                const configResult = await configMapRenderer.render(metadata.project.workspace, this.buildPropertyMap(this.propertyStorage, metadata.project.workspace), this.bindingStorage.get(metadata.project.workspace), `${this.nameProvider.getNameByWorkspace(metadata.project.workspace)}-vars`);
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
            })();

            await (async () => {
                for (const key in this.jobStorage.get(metadata.project.workspace) ?? {}) {
                    const propertyStorage = this.jobPropertyStorage.get(metadata.project.workspace);
                    const bindingStorage = this.jobBindingStorage.get(metadata.project.workspace)?.get(key);
    
                    if (!propertyStorage || !bindingStorage) {
                        continue;
                    }
    
                    const configResult = await configMapRenderer.render(key, this.buildPropertyMap(propertyStorage, metadata.project.workspace), bindingStorage, `${this.nameProvider.getNameByWorkspace(metadata.project.workspace)}-${key}-vars`);
                    this.writers.push(configResult);
                    const secretResult = await secretRenderer.render(key, propertyStorage, bindingStorage);
                    this.writers.push(secretResult);
    
                    const itemsMap = HelmRenderer.mergeElements(await configResult.getResolvedWorkspaceVars(), await secretResult.getResolvedWorkspaceSecrets());
    
                    itemsMap.entries().forEach(([key, entry]) => {
                        if ('store' in entry && entry.store && entry.global) {
                            this.globalBindingStorage.set(key, entry);
                        }
                    });
                }
            })();
        });
    }

    public async renderFeature(metadata: RendererMetadata, structure: InferStructure<T>[]): Promise<void> {
        await super.renderFeature(metadata, structure);
        const binding = new Map(this.globalBindingStorage.entries().map(([key, value]) => [key, typeof value.store === 'string' ? value.key : undefined] as const).filter((entry): entry is readonly [string, string] => entry[1] !== undefined));

        const allValues = this.jobPropertyStorage.get(undefined)?.values?.()?.toArray?.();
        const values = allValues?.reduce?.((a, b) => HelmRenderer.mergeElements(a, b), allValues?.shift?.()!);
        const propertyStorage = values ? new Map([[undefined as IWorkspace|undefined, HelmRenderer.mergeElements(this.propertyStorage.get(undefined)!, values)]] as const) : this.propertyStorage;

        const secretRenderer = await this.secretRenderer.render(undefined, propertyStorage, binding);
        this.writers.push(secretRenderer);

        const valueRenderer = await this.configMapRenderer.render(undefined, this.buildPropertyMap(propertyStorage, undefined), binding, 'global-vars');
        this.writers.push(valueRenderer);

        for (const writer of this.writers) {
            writer.write(this.nameProvider);
        }
    }

    public buildPropertyMap<Key>(properties: Map<Key, IConfigMapStructure>, workspace: IWorkspace | undefined) {
        const propertyMap = new Map([[undefined as undefined | string, properties]]);

        for (const [key, jobVariable] of HelmRenderer.mergeElements(this.jobPropertyStorage.get(undefined) ?? new Map(), this.jobPropertyStorage.get(workspace) ?? new Map()).entries()) {
            propertyMap.set(`job.${key}`, jobVariable);
        }

        return propertyMap;
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