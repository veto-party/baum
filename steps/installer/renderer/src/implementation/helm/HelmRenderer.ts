import { GroupFeature } from "@veto-party/baum__steps__installer__features";
import { ARendererManager } from "../ARendererManager.js";
import { IRendererFeatureManager } from "../../interface/IRendererManager.js";
import { RenderFeatureManager } from "../RenderFeatureManager.js";

export class HelmRenderer<T extends GroupFeature<any,any,any>> extends ARendererManager<T> {
    
    protected createSelf<U extends ARendererManager<any> | unknown>(feature: U extends ARendererManager<infer GroupFeature> ? GroupFeature : GroupFeature<any, any, any>): U extends unknown ? ARendererManager<any> : U {
        const helm = new HelmRenderer(feature);
        helm.featureCache = new Map(this.featureCache);
        return helm as any;
    }
    
    protected createFeatureManager(_: T): IRendererFeatureManager<T> {
        return new RenderFeatureManager();
    }
    
}
  