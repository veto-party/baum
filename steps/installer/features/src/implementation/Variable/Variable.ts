import type { FromSchema } from "json-schema-to-ts";
import { BindingFeature } from "../Binding/Binding.js";
import { GroupFeature } from "../GroupFeature/GroupFeature.js";
import { definition } from "./definition.js";
import { BaseVariableFeature } from "./BaseVariable.js";

export class VariableFeature<
    T extends {}|Record<string, any> = typeof definition
> extends GroupFeature<T, 'variable', 'patternProperties.^[a-zA-Z0-9_]*$', FromSchema<T>> {

    protected do_construct(value: any, path: string | undefined): GroupFeature<any, 'variable', 'patternProperties.^[a-zA-Z0-9_]*$'> {
        return new VariableFeature<any>(value, 'variable', 'patternProperties.^[a-zA-Z0-9_]*$');
    }

    public static makeInstance() {
        const result = (new VariableFeature(definition, 'variable')).appendFeature(new BaseVariableFeature()).appendFeature(new BindingFeature());

        type T = typeof result extends GroupFeature<infer T, infer Path, infer WritePath, infer From> ? T : never;

        return result as unknown as VariableFeature<T>;
    }
}