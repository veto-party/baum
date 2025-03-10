import type { FromSchema } from "json-schema-to-ts";
import { definitions } from "../../utils/definition.js";
import { CachedFN } from "@veto-party/baum__core";
import type { IngestResult } from "../../interface/IFeature.js";
import { generatePassword } from "./utils/generatePassword.js";
import { isAbsolute, join } from 'node:path';
import { readFile, stat } from "node:fs/promises";
import { AKeyOverrideFeature } from "../../abstract/AMergeFeature/AKeyOverride/AKeyOverride.js";
import { cloneDeep } from "lodash-es";
import { baseDefinition } from "./definition.js";

export class BaseVariableFeature extends AKeyOverrideFeature<typeof baseDefinition, 'variable'> {
    constructor() {
        super(baseDefinition, 'variable' as const);
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

    protected async mergeLayers(base: FromSchema<typeof definitions.properties.variable>|undefined, originalLayers: IngestResult<FromSchema<typeof definitions.properties.variable>>[]) {

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

        return super.mergeLayers(base, layers);
    }

}