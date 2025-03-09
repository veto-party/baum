import type { FromSchema } from "json-schema-to-ts";
import { definitions } from "../../utils/definition.js";
import { AMergeFeature } from "../abstract/AMergeFeature.js";
import { CachedFN } from "@veto-party/baum__core";
import type { IngestResult } from "../../interface/IFeature.js";
import { generatePassword } from "./utils/generatePassword.js";
import { isAbsolute, join,  } from 'node:path';
import { readFile, stat } from "node:fs/promises";
import { isEqual } from "lodash-es";

export class VariableFeature extends AMergeFeature<typeof definitions.properties.variable, 'variable'> {
    constructor() {
        super(definitions.properties.variable, 'variable' as const);
    }

    @CachedFN(true, [true, true, false])
    private async generateOrLoadFile(_key: string, path: string, item: FromSchema<typeof definitions.properties.variable>[string]) {

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

    protected async mergeLayers(base: FromSchema<typeof definitions.properties.variable>|undefined, layers: IngestResult<FromSchema<typeof definitions.properties.variable>>[]) {
        
        // Prepare layers.
        for (const key in layers) {
            for (const variableKey in layers[key].item) {
                if (!(await stat(layers[key].sourcePath ?? key).then(() => true, () => false))) {
                    throw new Error(`Cannot resolve path of template: checked (${layers[key].sourcePath ?? key})`);
                }

                layers[key].item[variableKey] = await this.generateOrLoadFile(`${layers[key].key}-${key}`, layers[key].sourcePath ?? key, layers[key].item[key]);
            }
        }

        let newLayer = { ...base ?? {}};

        // Start merging layers.
        for (const layer of layers) {
            for (const key in layer.item) {
                if (!isEqual(layer.item[key], newLayer[key])) {
                    console.warn(`Key "${key}" in layer already present overriding it!`);
                }

                newLayer[key] = layer.item[key];
            }
        }

        return newLayer;
    }

}