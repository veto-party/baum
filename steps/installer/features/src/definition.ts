import { asConst } from 'json-schema-to-ts';

export const variableDefinitionPattern = '^[a-zA-Z0-9_]*$';

export const definition = asConst({
  type: 'array',
  items: {
    type: 'object',
    oneOf: [{
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['JOB']
        }
      }
    }, {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['SERVICE']
        },
        alias: {
          type: 'string'
        },
      }
    }]
  }
});
