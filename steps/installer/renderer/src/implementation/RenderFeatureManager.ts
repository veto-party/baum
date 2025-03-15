import type { IFeature } from "@veto-party/baum__steps__installer__features";
import type { IFeatureManager, IRendererFEatureManager } from "../interface/IRendererManager.js";
import { IRenderer, InferStructure, RendererMetadata } from "../interface/IRenderer.js";

export class RenderFeatureManager<T extends IFeature<any, any, any>> implements IRendererFEatureManager<T> {
    
    private rendererInstances = new Set<IRenderer<T>['render']>();

    addRenderer(renderer: IRenderer<T>['render']): void {
        this.rendererInstances.add(renderer);
    }
    
    render<U extends InferStructure<T>>(metadata: RendererMetadata, structure: U) {
        for (const renderer of this.rendererInstances) {
            renderer(metadata, structure);
        }
    }
    
}
