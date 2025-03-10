import { FromSchema } from "json-schema-to-ts";
import { AMergeFeature } from "../../abstract/AMergeFeature/AMergeFeature.js";
import { definition } from "./definition.js";
import { IngestResult } from "../../interface/IFeature.js";

export class NetworkFeature extends AMergeFeature<typeof definition, 'network', FromSchema<typeof definition>> {
    public constructor() {
        super(definition, 'network');
    }

    public mergeLayers(base: FromSchema<typeof definition>|undefined, parentLayers: IngestResult<FromSchema<typeof definition>>[]): FromSchema<typeof definition> {
        return [...(base ?? []), ...parentLayers.map((layer) => layer.item).flat(1)];
    }
}