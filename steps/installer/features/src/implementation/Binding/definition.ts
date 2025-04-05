import { asConst } from 'json-schema-to-ts';
import { variableAccessorPattern } from '../Variable/definition.js';

export const definitionDefinitionPattern = '^[a-zA-Z0-9_]*$';

export const definition = asConst({
  type: 'object',
  patternProperties: {
    [definitionDefinitionPattern]: {
      type: 'string',
      pattern: variableAccessorPattern
    }
  },
  additionalProperties: false
});
