import type { IFeature } from "@veto-party/baum__steps__installer__features";
import type { IFeatureManager, IRendererFEatureManager } from "../interface/IRendererManager.js";
import { IRenderer, InferStructure, RendererMetadata } from "../interface/IRenderer.js";

export class RenderFeatureManager<T extends IFeature<any, any, any>> implements IRendererFEatureManager<T> {
    
    private rendererInstances = new Set<IRenderer<T>['render']>();

    addRenderer(renderer: (this: this, metadata: RendererMetadata, features: InferStructure<T>[]) => void|Promise<void>): this {
        this.rendererInstances.add(renderer);
        return this;
    }
    
    async render(metadata: RendererMetadata, structure: InferStructure<T>[]) {
        for (const renderer of this.rendererInstances) {
            await renderer.call(this, metadata, structure);
        }
    }
    
}
