import { asConst } from 'json-schema-to-ts';

export const definition = asConst({
  type: 'object',
  properties: {
    type: {
      type: 'string'
    }
  },
  // additionalProperties: false,
  oneOf: [{
    type: 'object',
    properties: {
      type: {
        type: "string",
        enum: ['JOB']
      }
    },
    // additionalProperties: false,
  }, {
    type: 'object',
    properties: {
      type: {
        type: "string",
        enum: ['SERVICE']
      },
    },
    // additionalProperties: false,
  }],
  required: ['type']
});
