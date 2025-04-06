import type { IFeature } from '@veto-party/baum__steps__installer__features';
import type { IFeatureRenderer, InferStructure, RendererMetadata } from '../interface/IRenderer.js';
import type { IRendererFeatureManager } from '../interface/IRendererManager.js';

export class RenderFeatureManager<T extends IFeature<any, any, any>, Self> implements IRendererFeatureManager<T, Self> {
  private rendererInstances = new Set<Parameters<typeof this.addRenderer>[0]>();

  addRenderer(renderer: (this: Self, metadata: RendererMetadata, features: T extends IFeature<any, any, infer U> ? U[] : never) => void | Promise<void>): this {
    this.rendererInstances.add(renderer);
    return this;
  }

  async renderFeature(metadata: RendererMetadata, structure: InferStructure<T>[], ctx: any) {
    for (const renderer of this.rendererInstances) {
      await renderer.call(ctx, metadata, structure as any);
    }
  }
}
