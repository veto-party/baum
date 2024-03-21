import { AToken } from "../AToken.js";
import { EOL } from 'node:os';
import { ConditionalToken } from "./ConditionalToken.js";

export class ArrayToken extends AToken {
    constructor(
        private tokens: (any|AToken)[]
    ) {
        super();
    }

    write(): string {
        return this.tokens.map((token) => {
            if (token instanceof AToken) {
                let result = token.write().split(EOL);

                if (result.length > 1) {
                    result.push(...result.splice(1, result.length - 1).map((line) => `  ${line}`));
                }

                if (!(token instanceof ConditionalToken)) {
                    return `- ${result.join(EOL)}`;
                }

                return `{{ ${token.condition} }}${EOL}${result.join(EOL)}${EOL}{{ end }}`
            } else {
                return `- ${JSON.stringify(token)}`;
            }
        }).join(EOL);
    }

    get(key: any) {
        return this.tokens[key];
    }
}