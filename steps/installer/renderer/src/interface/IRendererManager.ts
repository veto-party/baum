import type { GroupFeature, IFeature, MergeFeatures } from "@veto-party/baum__steps__installer__features";
import type { InferStructure, IRenderer, RendererMetadata } from "./IRenderer.js";
import { asConst, FromSchema, JSONSchema } from "json-schema-to-ts";

export type IFilter<T extends IFeature<any, any, any>> = {
    <U extends InferStructure<T>>(obj: U[]): boolean
} | {
    key: string;
    filter: <U extends InferStructure<T>>(obj: U[]) => boolean;
}

export interface IFeatureManager<T extends IFeature<any, any, any>> {
    addRenderer(renderer: (this: IFeatureManager<T>, metadata: RendererMetadata, structure: T extends IFeature<any, any, infer Structure> ? Structure[] : never) => void|Promise<void>): IFeatureManager<T>;
    // removeRenderer(renderer: IRenderer<T>): void;
}

export interface IRendererFeatureManager<T extends IFeature<any, any, any>> extends IRenderer<T>, IFeatureManager<T> {

};

export type InferNewRenderer<
    WritePath, 
    R extends IRendererManager<any>|IFeatureManager<any>, 
    Feature extends IFeature<any, any, any>
> = 
    R extends IRendererManager<infer T> ? 
        IRenderer<MergeFeatures<T, WritePath, Feature>> :
    R extends IFeatureManager<infer T> ? 
        IRenderer<MergeFeatures<T, WritePath, Feature>> :
    never;

export type InferToFeatureManager<T extends IRenderer<any>> = T extends IRenderer<infer Feature> ? IFeatureManager<Feature> : never
export type InferToRendererManager<T extends IRenderer<any>> = T extends IRenderer<infer Feature> ? IRendererManager<Feature> : never;



export interface IRendererManager<T extends IFeature<any, any, any>> extends IRenderer<T> {
    ensureFeature<
            WritePath, 
            Feature extends IFeature<any, any, any>
        >(
                writePath: WritePath, 
                feature: Feature,
                creator: (this: IRendererManager<T>, rendererGenerator: InferToFeatureManager<InferNewRenderer<WritePath, IRendererManager<T>, Feature>>) => InferToFeatureManager<InferNewRenderer<WritePath, IRendererManager<T>, Feature>>,
                filter?: IFilter<InferNewRenderer<WritePath, IRendererManager<T>, Feature> extends IRendererManager<infer NewFeature> ? NewFeature : never>,
        ): InferNewRenderer<WritePath, IRendererManager<T>, Feature>;
    getGroup(): T;
    // removeFeature<T extends IFeature<any, any, any>>(feature: { new(...args: any[]): T }): void;
}
