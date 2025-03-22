import { asConst, FromSchema, JSONSchema } from "json-schema-to-ts";
import { IFeature } from "../../interface/IFeature.js";
import { ToDefinitionStructure } from "../../interface/types/ToDefinitionStructure.js";
import { ToDefinitionStructureWithTupleMerge } from "./ToDefinitionStructureWithTupleMerge.js";

// Resolves the correct feature path
export type ResolveFeaturePath<WritePath, B extends string | undefined> =
    WritePath extends string ? 
        B extends undefined ? 
            WritePath  : 
        `${WritePath}.${B}` : 
    B;

export type MergeFeatures<A extends IFeature<any, any, any>, Path, B extends IFeature<any, any, any>> = 
    A extends IFeature<infer TypeA, infer PathA, any> ?
        B extends IFeature<infer TypeB, infer PathB, any> ? 
            PathB extends string|undefined ? 
                ToDefinitionStructureWithTupleMerge<ResolveFeaturePath<Path, PathB>, TypeB, TypeA> extends infer NewType ?
                    NewType extends JSONSchema ? 
                        IFeature<NewType, PathA, FromSchema<NewType>> :
                    never :
                never :
            never :
        never :
    never;