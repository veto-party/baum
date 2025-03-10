import { asConst } from "json-schema-to-ts";

export const definition = asConst({
    type: 'object',
    properties: {
        limit: {
        type: 'object',
        properties: {
            cpu: {
            type: 'string'
            },
            memory: {
            type: 'string'
            }
        },
        additionalProperties: false
        },
        requested: {
        type: 'object',
        properties: {
            cpu: {
            type: 'string'
            },
            memory: {
            type: 'string'
            }
        },
        additionalProperties: false
        }
    }
});
