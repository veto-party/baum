import type { FromSchema } from "json-schema-to-ts";
import { BindingFeature } from "../Binding/Binding.js";
import { GroupFeature } from "../GroupFeature/GroupFeature.js";
import { definition } from "./definition.js";

export class ServiceFeature<T extends {}|Record<string, any> = typeof definition> extends GroupFeature<T, 'service', 'properties', FromSchema<T>> {

    protected do_construct(value: any, path: string|undefined) {
        return new ServiceFeature(value, 'service', 'properties') as any;
    }

    public static makeInstance() {
        const result = (new ServiceFeature(definition, 'service', undefined)).appendFeature(new BindingFeature());

        type T = typeof result extends infer A ? A extends GroupFeature<infer T, infer Path, infer WritePath, infer Last> ? T : never : never;

        return result as unknown as ServiceFeature<T>;
    }
}