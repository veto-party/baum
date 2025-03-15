import type { GroupFeature, IFeature, ToDefinitionStructureWithTupleMerge } from "@veto-party/baum__steps__installer__features";
import type { InferStructure, IRenderer } from "./IRenderer.js";
import { asConst, FromSchema, JSONSchema } from "json-schema-to-ts";

export type IFilter<T extends IFeature<any, any, any>> = {
    <U extends InferStructure<T>>(obj: U): boolean
} | {
    key: string;
    filter: <U extends InferStructure<T>>(obj: U) => boolean;
}

export interface IRendererFeatureManager<T extends IFeature<any, any, any>> extends IRenderer<T> {
    addRenderer(renderer: IRenderer<T>): void;
    // removeRenderer(renderer: IRenderer<T>): void;
}

export type InferNewRenderer<WritePath extends string|undefined, T extends IRendererManager<any>, Feature extends IFeature<any, any, any>> = T extends IFeature<any, infer Path, any> ? IRendererManager<Feature extends IFeature<infer D, infer B, infer _> ? ReturnType<typeof asConst<ToDefinitionStructureWithTupleMerge<WritePath extends string ? B extends undefined ? WritePath : B extends string ? `${WritePath}.${B}` : never : B extends string ? B : never, D, T>>> extends infer Some ? GroupFeature<
Some extends Record<string, any> ? Some : never,
Path, 
FromSchema<Some extends JSONSchema ? Some : never>
> : IFeature<never, never, never> : IFeature<never, never, never>> : unknown;

export interface IRendererManager<T extends IFeature<any, any, any>> extends IRenderer<T> {
    ensureFeature<
            WritePath extends string|undefined, 
            Feature extends IFeature<any, any, any>
        >(
                writePath: WritePath extends undefined ? undefined : WritePath, 
                feature: Feature,
                creator: (rendererGenerator: InferNewRenderer<WritePath, IRendererManager<T>, Feature>) => InferNewRenderer<WritePath, IRendererManager<T>, Feature>,
                filter?: IFilter<InferNewRenderer<WritePath, IRendererManager<T>, Feature> extends IRendererManager<infer NewFeature> ? NewFeature : never>,
        ): InferNewRenderer<WritePath, IRendererManager<T>, Feature>;
    getGroup(): T;
    // removeFeature<T extends IFeature<any, any, any>>(feature: { new(...args: any[]): T }): void;
}
