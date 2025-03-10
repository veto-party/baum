import { asConst } from "json-schema-to-ts";

export const definition = asConst({
    type: 'object',
    properties: {
        minPods: {
            type: 'number'
        },
        maxPods: {
            type: 'number'
        },
        configuration: {
            type: 'object',
            patternProperties: {
                '.*': {
                    type: 'object',
                    required: ['type', 'average'],
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['AverageValue', 'Utilization']
                        },
                        average: {
                            type: 'string'
                        }
                    },
                    additionalProperties: false
                }
            }
        }
    },
    additionalProperties: false
});