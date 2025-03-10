import { FromSchema } from "json-schema-to-ts";
import { AFeature } from "../abstract/AFeature.js";
import { definition } from "./definition.js";

export class ScalingFeature extends AFeature<typeof definition, 'scaling', FromSchema<typeof definition>> {
    constructor() {
        super(definition, 'scaling');
    }
}