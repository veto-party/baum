import { AToken } from "../AToken.js";
import { EOL } from 'node:os';
import { ConditionalToken } from "./ConditionalToken.js";

export class ObjectToken extends AToken {
    constructor(
        private value: Record<string, any|AToken> = {}
    ) { super(); }

    write(): string {

        let result = '';

        Object.entries(this.value).forEach(([key ,value]) => {
            const originalValue = value;
            if (value instanceof AToken) {
                value = EOL + value.write().split(EOL).map((line) => `  ${line}`).join(EOL);
                if (originalValue instanceof ConditionalToken) {
                    result += `{{ ${originalValue.condition} }}${EOL}${JSON.stringify(key)}: ${value}${EOL}{{ end }}`;
                    return;
                }
            } else {
                value = JSON.stringify(value);
            }

            result += `${JSON.stringify(key)}:${value}${EOL}`;
        });

        return result;
    }

    get(key: any) {
        return this.value[key];
    }
}