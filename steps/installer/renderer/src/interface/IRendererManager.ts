import type { IFeature, MergeFeatures } from '@veto-party/baum__steps__installer__features';
import type { IFeatureRenderer, IRenderer, InferStructure, RendererMetadata } from './IRenderer.js';

export type IFilter<T extends IFeature<any, any, any>> =
  | (<U extends InferStructure<T>>(obj: U[]) => boolean)
  | {
      key: string;
      filter: <U extends InferStructure<T>>(obj: U[]) => boolean;
    };

export interface IFeatureManager<T extends IFeature<any, any, any>, Self> {
  addRenderer(renderer: (this: Self, metadata: RendererMetadata, structure: T extends IFeature<any, any, infer Structure> ? Structure[] : never) => void | Promise<void>): IFeatureManager<T, Self>;
  // removeRenderer(renderer: IRenderer<T>): void;
}

export interface IRendererFeatureManager<T extends IFeature<any, any, any>, Self> extends IFeatureRenderer<T>, IFeatureManager<T, Self> {}

export type InferNewRenderer<WritePath, R extends IRendererManager<any, any> | IFeatureManager<any, any>, Feature extends IFeature<any, any, any>> = R extends IRendererManager<infer T, any> ? IRenderer<MergeFeatures<T, WritePath, Feature>> : R extends IFeatureManager<infer T, any> ? IRenderer<MergeFeatures<T, WritePath, Feature>> : never;

export type InferToFeatureManager<T extends IRenderer<any>> = T extends IRenderer<infer Feature> ? IFeatureManager<Feature, any> : never;
export type InferToRendererManager<T extends IRenderer<any>> = T extends IRenderer<infer Feature> ? IRendererManager<Feature, any> : never;

export interface IRendererManager<T extends IFeature<any, any, any>, Self> extends IRenderer<T> {
  ensureFeature<WritePath, Feature extends IFeature<any, any, any>>(
    writePath: WritePath,
    feature: Feature,
    creator: (this: Self, rendererGenerator: InferToFeatureManager<InferNewRenderer<WritePath, IRendererManager<T, Self>, Feature>>) => InferToFeatureManager<InferNewRenderer<WritePath, IRendererManager<T, Self>, Feature>>,
    filter?: IFilter<InferNewRenderer<WritePath, IRendererManager<T, Self>, Feature> extends IRendererManager<infer NewFeature, any> ? NewFeature : never>
  ): InferNewRenderer<WritePath, IRendererManager<T, Self>, Feature>;
  getGroup(): T;
  // removeFeature<T extends IFeature<any, any, any>>(feature: { new(...args: any[]): T }): void;
}
