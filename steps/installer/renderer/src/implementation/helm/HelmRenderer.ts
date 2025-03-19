import { BaseInstaller, BindingFeature, ExposeFeature, GroupFeature, IFeature, NetworkFeature, ScalingFeature, ServiceFeature, SystemUsageFeature, UpdateStrategy, VariableFeature, VolumeFeature } from "@veto-party/baum__steps__installer__features";
import { ARendererManager } from "../ARendererManager.js";
import { IRendererFEatureManager, IRendererManager } from "../../interface/IRendererManager.js";
import { RenderFeatureManager } from "../RenderFeatureManager.js";
import { isEqual } from 'lodash-es';
import { IWorkspace } from "@veto-party/baum__core";

export class HelmRenderer<T extends IFeature<any,any,any>> extends ARendererManager<T> {
    
    protected constructor(feature: T) {
        super(feature);
    }


    public static isHelmRenderer<Feature extends IFeature<any, any, any>>(renderer: IRendererManager<Feature>): HelmRenderer<Feature>|undefined {
        if ((renderer as any) instanceof HelmRenderer) {
            return renderer as HelmRenderer<Feature>;
        }

        return undefined;
    } 

    public static makeIntance() {

        const bindingStorage = new Map<IWorkspace, Map<string, string>>();
        const propertyStorage = new Map<IWorkspace|undefined, typeof VariableFeature.makeInstance extends () => IFeature<any, any, infer Structure> ? Structure extends Record<infer Key, infer Value> ? Map<Key, Value> : never : never>();

        const ensurePropertyStorage = (workspace: IWorkspace|undefined) => {
            const possibleElem = propertyStorage.get(workspace);
            const elem = possibleElem ?? {};
            propertyStorage.set(workspace, new Map());
            return propertyStorage.get(workspace)!;
        }

        const renderer = (new HelmRenderer(BaseInstaller.makeInstance()))
            .ensureFeature('properties' as const, VariableFeature.makeInstance(), (feature) => {
                return feature.addRenderer((metadata, data) => {

                    const mergeElements = (a: ReturnType<typeof ensurePropertyStorage>, b: ReturnType<typeof ensurePropertyStorage>) => {
                        const aSet = new Set(a.keys());
                        const bSet = new Set(b.keys());

                        aSet.difference(bSet).forEach((el) => {
                            if (isEqual(a.get(el), b.get(el))) {
                                return;
                            }

                            console.warn(`UNSAFE: ${el} will be overridden in ${metadata.project.workspace.getName()}`);
                        });

                        bSet.forEach((el) => {
                            a.set(el, b.get(el)!);
                        })
                    }

                    const elem = ensurePropertyStorage(metadata.project.workspace);
                    const globalElem = ensurePropertyStorage(undefined);

                    for (const dataset of data) {
                        const allVars = Object.entries(dataset.variable ?? {} as Exclude<typeof dataset.variable, undefined>);
                        const [globalVars, otherVars] = allVars.reduce(([globalVars, otherVars], entry) => {
                            const [, value] = entry;
                            const scope = value.type === 'global' ? globalVars : otherVars;
                            scope.push(entry);
                            return [globalVars, otherVars];
                        }, [[] as typeof allVars, [] as typeof allVars] as const);


                        mergeElements(elem, new Map(globalVars));
                        mergeElements(globalElem, new Map(otherVars));
                    }
                });
            })
            .ensureFeature('properties' as const, new BindingFeature(), (feature) => {
                feature.addRenderer((metadata, data) => {
                    for (const dataset of data) {
                        bindingStorage.set(metadata.project.workspace, new Map(Object.entries(dataset.binding ?? {})));
                    }
                })
                return feature;
            })
            .ensureFeature('properties' as const, new VolumeFeature(), (feature) => {
                return feature;
            })
            .ensureFeature('oneOf[1].properties' as const, new ExposeFeature(), (feature) => {
                return feature;
            })
            .ensureFeature('oneOf[1].properties' as const, new ScalingFeature(), (feature) => {
                return feature;
            })
            .ensureFeature('oneOf[1].properties' as const, new SystemUsageFeature(), (feature) => {
                return feature;
            })
            .ensureFeature('oneOf[1].properties' as const, new NetworkFeature(), (feature) => {
                return feature;
            })
            .ensureFeature('oneOf[1].properties' as const, new UpdateStrategy(), (feature) => {
                return feature;
            })
            // .ensureFeature('oneOf[1].properties' as const, ServiceFeature.makeInstance(), (feature) => {
            //     return feature;
            // });

        const helmRenderer = HelmRenderer.isHelmRenderer(renderer);
        if (!helmRenderer) {
            throw new Error('Renderer is not of expected type.');
        }

        helmRenderer.addRenderer((metadata, _) => {

        });
    }

    protected createSelf<U extends IFeature<any, any, any>>(feature: U): ARendererManager<U> {
        const helm = new HelmRenderer(feature);
        helm.featureCache = new Map(this.featureCache) as any;
        return helm as any;
    }
    
    protected createFeatureManager(_: T): IRendererFEatureManager<T> {
        return new RenderFeatureManager<T>();
    }
}