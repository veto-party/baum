import { FromSchema } from "json-schema-to-ts";
import { AKeyOverrideFeature } from "../../abstract/AMergeFeature/AKeyOverride/AKeyOverride.js";
import { definition } from "./definition.js";

export class ExposeFeature extends AKeyOverrideFeature<typeof definition, 'expose', FromSchema<typeof definition>> {
    constructor() {
        super(definition, 'expose');
    }
}