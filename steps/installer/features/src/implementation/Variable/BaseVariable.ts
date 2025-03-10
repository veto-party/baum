import type { FromSchema } from "json-schema-to-ts";
import type { IngestResult } from "../../interface/IFeature.js";
import { baseDefinition } from "./definition.js";
import { AFeature } from "../../abstract/AFeature.js";

export class BaseVariableFeature extends AFeature<typeof baseDefinition, undefined> {
    constructor() {
        super(baseDefinition, undefined);
    }
}