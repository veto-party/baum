import type { FromSchema } from "json-schema-to-ts";
import { BindingFeature } from "../Binding/Binding.js";
import { GroupFeature } from "../../abstract/GroupFeature/GroupFeature.js";
import { definition } from "./definition.js";

export class ServiceFeature<T extends {}|Record<string, any> = typeof definition> extends GroupFeature<T, 'service', FromSchema<T>> {


    protected constructor(value: any) {
        super(value, 'service');
    }

    protected do_construct(value: any) {
        return new ServiceFeature(value) as any;
    }

    public static makeInstance() {
        const result = (new ServiceFeature(definition)).appendFeature(undefined, new BindingFeature());

        type T = typeof result extends infer A ? A extends GroupFeature<infer T, infer Path, infer Last> ? T : never : never;

        return result as unknown as ServiceFeature<T>;
    }
}