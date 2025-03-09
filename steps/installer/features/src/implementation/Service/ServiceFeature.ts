import type { FromSchema } from "json-schema-to-ts";
import { BindingFeature } from "../Binding/Binding.js";
import { GroupFeature } from "../GroupFeature/GroupFeature.js";
import { definition } from "./definition.js";

export class ServiceFeature<
    T extends {}|Record<string, any> = {}, 
    Path extends string|undefined = undefined, 
    From = T extends {} ? any[]|any : FromSchema<T>
> extends GroupFeature<T, Path, From> {

    protected do_construct(value: any, path: string|undefined) {
        return new ServiceFeature(value, path);
    }

    public static makeInstance() {
        const result = (new ServiceFeature(definition, 'definition')).appendFeature(new BindingFeature());

        type T = typeof result extends GroupFeature<infer T, infer Path, infer From> ? T : never;
        type Path = typeof result extends GroupFeature<infer T, infer Path, infer From> ? Path : never;

        return result as ServiceFeature<T, Path>;
    }
}