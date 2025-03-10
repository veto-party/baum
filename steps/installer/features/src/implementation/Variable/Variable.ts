import type { FromSchema } from "json-schema-to-ts";
import { BindingFeature } from "../Binding/Binding.js";
import { GroupFeature } from "../../abstract/GroupFeature/GroupFeature.js";
import { baseDefinition, definition } from "./definition.js";
import { BaseVariableFeature } from "./BaseVariable.js";
import { AMergeFeature } from "../../abstract/AMergeFeature/AMergeFeature.js";
import { FeatureContainer } from "../../interface/IFeatureContainer.js";
import { IngestResult } from "../../interface/IFeature.js";
import { cloneDeep } from 'lodash-es';
import { CachedFN } from "@veto-party/baum__core";
import { generatePassword } from "./utils/generatePassword.js";
import { isAbsolute, join } from 'node:path';
import { readFile, stat } from "node:fs/promises";
import { AKeyOverrideFeature } from "../../abstract/AMergeFeature/AKeyOverride/AKeyOverride.js";

export class VariableFeature<
    T extends Record<string, any> = typeof definition
> extends GroupFeature<T, 'variable', FromSchema<T>> {

    protected constructor(value: T) {
        super(value, 'variable');
    }

    @CachedFN(true, [true, true, false])
    private async generateOrLoadFile(_key: string, path: string, item: FromSchema<typeof baseDefinition>) {

        const resolvedDefinition = { ...item };

        if (resolvedDefinition.generated) {
            if (resolvedDefinition.default) {
                throw new Error(`Try to remove default from variable when using a resolvedDenifition.generated.`);
            }
            resolvedDefinition.default = generatePassword(resolvedDefinition.generated);
            delete resolvedDefinition.generated;
        }

        if (resolvedDefinition.file) {
            if (!isAbsolute(resolvedDefinition.file)) {
                resolvedDefinition.file = join(path, resolvedDefinition.file);
            }

            if (resolvedDefinition.default) {
                throw new Error(`Try to remove default from variable when using a resolvedDenifition.file.`);
            }
            resolvedDefinition.default = (await readFile(resolvedDefinition.file)).toString();
            delete resolvedDefinition.file;
        }

        return resolvedDefinition;
    }

    protected do_construct(value: any, path: string | undefined): GroupFeature<any, 'variable'> {
        return new VariableFeature<any>(value);
    }

    public static makeInstance() {
        const result = (new VariableFeature(definition)).appendFeature('patternProperties.^[a-zA-Z0-9_]*$', new BaseVariableFeature()).appendFeature('patternProperties.^[a-zA-Z0-9_]*$.properties', new BindingFeature());

        type T = typeof result extends GroupFeature<infer T, infer _Path, infer _From> ? T : never;

        return result as unknown as VariableFeature<T>;
    }

    protected async mergeLayers(base: any|undefined, originalLayers: any[]): Promise<any[]> {

        const layers = cloneDeep(originalLayers);
        
        // Prepare layers.
        for (const key in layers) {
            for (const variableKey in layers[key].item) {
                if (!(await stat(layers[key].sourcePath ?? key).then(() => true, () => false))) {
                    throw new Error(`Cannot resolve path of template: checked (${layers[key].sourcePath ?? key})`);
                }

                layers[key].item[variableKey] = await this.generateOrLoadFile(`${layers[key].key}-${key}`, layers[key].sourcePath ?? key, layers[key].item[key]);
            }
        }

        return (AKeyOverrideFeature<T, 'variable', FromSchema<T>>).prototype.mergeLayers(base, layers);
    }
    

    public async ingestObject(objects: Record<string, FeatureContainer>): Promise<IngestResult<FromSchema<T>>[]> {
        return await (AMergeFeature<T, 'variable', FromSchema<T>>).prototype.ingestObject.call(this, objects) as unknown as any;
    }
}