import { FromSchema } from "json-schema-to-ts";

export type FeatureContainer<T> = {
    children: string[];
    feature: T;
}

export interface IFeature<T extends Record<string, any>|{} = {}, From = T extends {} ? any[]|any : FromSchema<T>> {

    /**
     * Verifies an object.
     * Might throw an error on invalid, or return false. 
     * 
     * @param element 
     */
    verifyObject(element: any): element is From;

    /**
     * This method is to be overridden, if a feature needs to merge data.
     * This method gets the data in tree form where 
     * 
     * @param objects 
     * @returns 
     */
    ingestObject(objects: Record<string, FeatureContainer<From>>): Promise<From[]|From>|From[]|From;
}