import type { IFeature } from "@veto-party/baum__steps__installer__features";
import type { IFeatureManager, IRendererFEatureManager } from "../interface/IRendererManager.js";
import { IRenderer, InferStructure, RendererMetadata } from "../interface/IRenderer.js";

export class RenderFeatureManager<T extends IFeature<any, any, any>> implements IRendererFEatureManager<T> {
    
    private rendererInstances = new Set<IRenderer<T>['render']>();

    addRenderer(renderer: (metadata: RendererMetadata, features: InferStructure<T>[]) => void|Promise<void>): IFeatureManager<T> {
        this.rendererInstances.add(renderer);
        return this;
    }
    
    render(metadata: RendererMetadata, structure: InferStructure<T>[]) {
        for (const renderer of this.rendererInstances) {
            renderer(metadata, structure);
        }
    }
    
}
