import { FromSchema } from "json-schema-to-ts";
import { AFeature } from "../../abstract/AFeature.js";
import { definition } from "./definition.js";

export class JobFeature extends AFeature<typeof definition, undefined, FromSchema<typeof definition>> {
    constructor() {
        super(definition, undefined);
    }
}