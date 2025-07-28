import { asConst } from 'json-schema-to-ts';

export const definition = asConst({
  type: 'object',
  required: ['type', 'definition'],
  properties: {
    type: {
      type: 'string',
      enum: ['global', 'scoped']
    },
    definition: {
      type: 'object',
      oneOf: [
        {
          type: 'object',
          required: ['on', 'image'],
          properties: {
            on: {
              type: 'string'
            },
            image: {
              type: 'string'
            }
          },
          additionalProperties: false
        },
        {
          type: 'object',
          required: ['on', 'project'],
          properties: {
            on: {
              type: 'string'
            },
            project: {
              type: 'string'
            }
          },
          additionalProperties: false
        }
      ]
    }
  }
  // additionalProperties: true
});
