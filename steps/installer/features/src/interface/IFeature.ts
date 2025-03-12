import { FromSchema } from "json-schema-to-ts";
import { FeatureContainer } from "./IFeatureContainer.js";

export type IngestResult<T> = {
    item: T;
    key?: string;
    sourcePath?: string;
}

export type ToObjectWithPath<Path extends string|undefined, Target> =   
    // No path is given, return target
    Path extends undefined ? Transformer<Target>: 
    // Path is given and contains . : return Key value pair recurisive 
    Path extends `${infer U}.${infer Rest}` ? Record<U, ToObjectWithPath<Rest, Target>> :
    // Path is given contain contains array access : return never, since we do not want to allow array access (for now).
    Path extends `${infer U}[${infer index}]${infer Rest}` ? never :
    Path extends string ? Record<Path, Target> :
    never;

export interface IFeature<T extends Record<string, any>|{} = {}, Path extends string|never = never, From = T extends {} ? any[]|any : FromSchema<T>> {
    /**
     * Verifies an object.
     * Might throw an error on invalid, or return false. 
     * 
     * @param element 
     */
    verifyObject(element: any): element is ToObjectWithPath<Path, From>;

    getSchema(): T;

    getPath(): Path extends never ? undefined : Path;

    /**
     * This method is to be overridden, if a feature needs to merge data.
     * This method gets the data in tree form where 
     * 
     * @param objects 
     * @returns 
     */
    ingestObject(objects: Record<string, FeatureContainer>): Promise<IngestResult<From>[]>|IngestResult<From>[];
}