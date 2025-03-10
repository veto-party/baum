import { definitions } from "../../utils/definition.js";
import { AKeyOverrideFeature } from "../../abstract/AMergeFeature/AKeyOverride/AKeyOverride.js";
import { definition } from "./definition.js";

export class BindingFeature extends AKeyOverrideFeature<typeof definition, 'bindings'> {
    constructor() {
        super(definition, 'bindings');
    }
}