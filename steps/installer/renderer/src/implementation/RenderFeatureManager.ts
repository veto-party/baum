import type { IFeature } from "@veto-party/baum__steps__installer__features";
import type { IFeatureManager, IRendererFeatureManager } from "../interface/IRendererManager.js";
import { IFeatureRenderer, IRenderer, InferStructure, RendererMetadata } from "../interface/IRenderer.js";

export class RenderFeatureManager<T extends IFeature<any, any, any>> implements IRendererFeatureManager<T> {
    
    private rendererInstances = new Set<IFeatureRenderer<T>['renderFeature']>();

    addRenderer(renderer: (this: this, metadata: RendererMetadata, features: T extends IFeature<any, any, infer U> ? U[] : never) => void|Promise<void>): this {
        this.rendererInstances.add(renderer);
        return this;
    }
    
    async renderFeature(metadata: RendererMetadata, structure: InferStructure<T>[]) {
        for (const renderer of this.rendererInstances) {
            await renderer.call(this, metadata, structure);
        }
    }
    
}
