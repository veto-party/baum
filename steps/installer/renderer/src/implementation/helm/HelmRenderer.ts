import { BaseInstaller, BindingFeature, ExposeFeature, GroupFeature, NetworkFeature, ScalingFeature, ServiceFeature, SystemUsageFeature, UpdateStrategy, VariableFeature, VolumeFeature } from "@veto-party/baum__steps__installer__features";
import { ARendererManager } from "../ARendererManager.js";
import { IFeatureManager, IRendererFEatureManager, IRendererManager } from "../../interface/IRendererManager.js";
import { RenderFeatureManager } from "../RenderFeatureManager.js";

export class HelmRenderer<T extends GroupFeature<any,any,any>> extends ARendererManager<T> {
    
    protected constructor(feature: T) {
        super(feature);
    }

    public static makeIntance() {
        const renderer = (new HelmRenderer(BaseInstaller.makeInstance()))
            .ensureFeature('properties' as const, VariableFeature.makeInstance(), (feature) => {
                feature.addRenderer((metadata, structure) => {
                })
                return feature;
            })
            .ensureFeature('properties' as const, new BindingFeature(), (feature) => {
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
            .ensureFeature('oneOf[1].properties' as const, ServiceFeature.makeInstance(), (feature) => {
                return feature;
            });
    }

    protected createSelf<U extends IRendererManager<any>>(feature: U extends ARendererManager<infer Feature> ? Feature : GroupFeature<any, any, any>): U {
        const helm = new HelmRenderer(feature);
        helm.featureCache = new Map(this.featureCache) as any;
        return helm as any;
    }
    
    protected createFeatureManager(_: T): IRendererFEatureManager<T> {
        return new RenderFeatureManager();
    }
}
  