import { asConst } from 'json-schema-to-ts';

export const definition = asConst({
  type: 'array',
  items: {
    type: 'object',
    properties: {
      type: {
        type: 'string'
      }
    },
    additionalProperties: false,
    oneOf: [{
      type: 'object',
      properties: {
        type: {
          type: "string",
          enum: ['JOB']
        }
      },
      additionalProperties: false,
    }, {
      type: 'object',
      properties: {
        type: {
          type: "string",
          enum: ['SERVICE']
        },
        alias: {
          type: 'string'
        },
      },
      additionalProperties: false,
    }],
    required: ['type']
  }
});
