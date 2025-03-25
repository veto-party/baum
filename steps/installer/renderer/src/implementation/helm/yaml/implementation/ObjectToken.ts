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

        value = (resultingValue.length > 1 ? resultingValue.map((line) => `  ${line}`) : resultingValue).join(EOL);
        if (originalValue instanceof ObjectToken || originalValue instanceof ArrayToken) {
          value = EOL + value;
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