import { definitions } from "../../utils/definition.js";
import { AKeyOverrideFeature } from "../../abstract/AMergeFeature/AKeyOverride/AKeyOverride.js";

export class BindingFeature extends AKeyOverrideFeature<typeof definitions.properties.binding, 'bindings'> {
    constructor() {
        super(definitions.properties.binding, 'bindings');
    }
}