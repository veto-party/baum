import { FromSchema } from "json-schema-to-ts";
import { AKeyOverrideFeature } from "../../abstract/AMergeFeature/AKeyOverride/AKeyOverride.js";
import { definition } from "./definition.js";

export class BindingFeature extends AKeyOverrideFeature<typeof definition, 'binding', FromSchema<typeof definition>> {
    constructor() {
        super(definition, 'binding' as const);
    }
}