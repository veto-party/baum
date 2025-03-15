import type { IFeature } from "@veto-party/baum__steps__installer__features";
import type { IRendererFeatureManager } from "../interface/IRendererManager.js";
import { IRenderer, InferStructure } from "../interface/IRenderer.js";

export class RenderFeatureManager<T extends IFeature<any, any, any>> implements IRendererFeatureManager<T> {
    
    private rendererInstances = new Set<IRenderer<T>>();

    addRenderer(renderer: IRenderer<T>): void {
        this.rendererInstances.add(renderer);
    }
    
    render<U extends InferStructure<T>>(structure: U) {
        for (const renderer of this.rendererInstances) {
            renderer.render(structure);
        }
    }
    
}
