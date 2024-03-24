import { EOL } from 'node:os';
import { AToken } from '../AToken.js';
import { ArrayToken } from './ArrayToken.js';
import { ConditionalToken } from './ConditionalToken.js';

export class ObjectToken extends AToken {
  constructor(private value: Record<string, any | AToken> = {}) {
    super();
  }

  write(): string {
    let result = '';

    Object.entries(this.value).forEach(([key, value]) => {
      const originalValue = value;
      if (value instanceof AToken) {
        const resultingValue = value.write().split(EOL);

        if (resultingValue.length > 1 || originalValue instanceof ObjectToken || originalValue instanceof ArrayToken) {
          value = EOL + resultingValue.map((line) => `  ${line}`).join(EOL);
        } else {
          value = resultingValue.join(EOL);
        }

        if (originalValue instanceof ConditionalToken) {
          result += `{{ ${originalValue.condition} }}${EOL}${JSON.stringify(key)}: ${value}${EOL}{{ end }}`;
          return;
        }
      } else {
        value = JSON.stringify(value);
      }

      result += `${JSON.stringify(key)}: ${value}${EOL}`;
    });

    return result;
  }
}
