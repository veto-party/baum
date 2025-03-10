import { variableAccessorPattern } from "../Variable/definition.js";

export const definition = {
    type: 'object',
    patternProperties: {
      '.*': {
        type: 'string',
        pattern: variableAccessorPattern
      }
    },
    additionalProperties: false
  } as const;