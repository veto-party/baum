import type { FromSchema } from "json-schema-to-ts";
import { BindingFeature } from "../Binding/Binding.js";
import { GroupFeature } from "../../abstract/GroupFeature/GroupFeature.js";
import { definition, mappingStructure, pattern } from "./definition.js";

export class ServiceFeature<T extends {}|Record<string, any>> extends GroupFeature<T, 'service', FromSchema<T>> {


    protected constructor(value: T) {
        super(value, 'service');
    }

    protected do_construct(value: any) {
        return new ServiceFeature(value) as any;
    }

    public static makeInstance() {
        return (new ServiceFeature(mappingStructure)).appendFeature(`patternProperties["${pattern}"]` as const, new ServiceFeature(definition).appendFeature(undefined, new BindingFeature()));
    }
}