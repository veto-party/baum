import { AFeature } from "../abstract/AFeature.js";
import { definition } from "./definition.js";

export class SystemUsageFeature extends AFeature<typeof definition, 'system_usage'> {
    constructor() {
        super(definition, 'system_usage');
    }
}