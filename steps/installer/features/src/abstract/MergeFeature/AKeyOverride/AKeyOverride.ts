import { isEqual } from "lodash-es";
import type { IngestResult } from "../../../interface/IFeature.js";
import { AMergeFeature } from "../AMergeFeature.js";
import type { FromSchema } from "json-schema-to-ts";


export abstract class AKeyOverrideFeature<
    T extends {}|Record<string, any> = {}, 
    Path extends string|undefined = undefined, 
    From = T extends {} ? any[]|any : FromSchema<T>> extends AMergeFeature<T, Path, From
> {
    protected mergeLayers(base: any, layers: IngestResult<any>[]) {
        const newLayer = { ...base ?? {} };
        
        // Start merging layers.
        for (const layer of layers) {
            for (const key in layer.item) {
                if (!isEqual(layer.item[key], newLayer[key])) {
                    console.warn(`Key "${key}" in layer already present overriding it!`);
                }

                newLayer[key] = layer.item[key];
            }
        }

        return newLayer;
    }
}