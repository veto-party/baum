import { FromSchema } from "json-schema-to-ts";
import { FeatureContainer } from "./IFeatureContainer.js";

export type IngestResult<T> = {
    item: T;
    key?: string;
    sourcePath?: string;
}

type StringToNumber<S extends string> = 
  S extends "0" ? 0 :
  S extends "1" ? 1 :
  S extends "2" ? 2 :
  S extends "3" ? 3 :
  S extends "4" ? 4 :
  S extends "5" ? 5 :
  S extends "6" ? 6 :
  S extends "7" ? 7 :
  S extends "8" ? 8 :
  S extends "9" ? 9 :
  never;

 
type MakeTuple<T, N extends number = 1, Items extends any[] = []> = N extends Items['length'] ? Items extends [infer _, ...infer All] ? [...All, T] : unknown : MakeTuple<T, N, [unknown, ...Items]>;

type KeyValuePair<A extends string|unknown, Target> = A extends string ? { [key in A]: Target } : never; 

export type ToDefinitionStructure<Path, Target> =

    Path extends string ?

        // No path is given, return target
        Path extends undefined ? Target: 

        Path extends '' ? Target : 
        // Aray witn prefix


        Path extends `${infer U}.${infer Rest}` ? ToDefinitionStructure<U, ToDefinitionStructure<Rest, Target>> :
        Path extends `${infer U}["${infer Path}"].${infer Rest}` ?  ToDefinitionStructure<U, KeyValuePair<Path, ToDefinitionStructure<Rest, Target>>> :
        Path extends `${infer U}[${infer index}].${infer Rest}` ? ToDefinitionStructure<U, MakeTuple<ToDefinitionStructure<Rest, Target>, StringToNumber<index>>> : 
        // Path is given contain contains array access : return unknown, since we do not want to allow array access (for now).
        Path extends `["${infer Path}"].${infer Rest}` ?  ToDefinitionStructure<Path, ToDefinitionStructure<Rest, Target>> :
        Path extends `[${infer index}].${infer Rest}` ? MakeTuple<ToDefinitionStructure<Rest, Target>, StringToNumber<index>> : 
        // Path is given and contains . : return Key value pair recurisive 

        Path extends `["${infer Path}"]` ? KeyValuePair<Path, Target> :
        Path extends `[${infer index}]` ? MakeTuple<Target, StringToNumber<index>> :
        KeyValuePair<Path, Target>
    : Target;

export interface IFeature<T extends Record<string, any>|{}, Path , From = T extends {} ? any[]|any : FromSchema<T>> {
    /**
     * Verifies an object.
     * Might throw an error on invalid, or return false. 
     * 
     * @param element 
     */
    verifyObject(element: any): element is ToDefinitionStructure<Path, From>;

    getSchema(): T;

    getPath(): Path extends string ? Path : undefined;

    /**
     * This method is to be overridden, if a feature needs to merge data.
     * This method gets the data in tree form where 
     * 
     * @param objects 
     * @returns 
     */
    ingestObject(objects: Record<string, FeatureContainer>): Promise<IngestResult<From>[]>|IngestResult<From>[];
}