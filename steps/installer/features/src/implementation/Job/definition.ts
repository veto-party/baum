import { asConst } from 'json-schema-to-ts';

export const definition = asConst({
  type: 'object',
  required: ['type'],
  properties: {
    type: {
      type: 'string',
      enum: ['global', 'scoped']
    },
    definition: {
      type: 'object',
      properties: {
        on: {
          type: 'string'
        },
        image: {
          type: 'string'
        }
      }
      // additionalProperties: false
    },
  }
  // additionalProperties: true
});
