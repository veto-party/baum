import type { FromSchema } from "json-schema-to-ts";
import { BindingFeature } from "../Binding/Binding.js";
import { GroupFeature } from "../../abstract/GroupFeature/GroupFeature.js";
import { definition, mappingStructure, pattern } from "./definition.js";

export class ServiceFeature<T extends {}|Record<string, any>, Path extends 'service'|undefined> extends GroupFeature<T, Path, FromSchema<T>> {


    protected constructor(value: T, path: Path) {
        super(value, path as any);
    }

    protected do_construct(value: any) {
        return new ServiceFeature(value, this.getPath()) as any;
    }

    public static makeInstance() {
        return (new ServiceFeature(mappingStructure, 'service')).appendFeature(`patternProperties["${pattern}"]` as const, new ServiceFeature(definition, undefined).appendFeature(undefined, new BindingFeature()));
    }
}