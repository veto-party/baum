import { EOL } from 'node:os';
import { AToken } from '../AToken.js';
import { ConditionalToken } from './ConditionalToken.js';

export class ArrayToken extends AToken {
  constructor(private tokens: (any | AToken)[]) {
    super();
  }

  write(): string {
    return this.tokens
      .map((token) => {
        if (token instanceof AToken) {
          const result = token.write().split(EOL);

          if (token instanceof ConditionalToken) {
            return `{{ ${token.condition} }}${EOL}  - ${result.join(`${EOL}  `)}${EOL}{{ end }}`;
          }

          return `${EOL}- ${result.join(`${EOL}  `)}`;
        }

        return `${EOL}- ${JSON.stringify(token)}`;
      })
      .join(EOL);
  }
}
