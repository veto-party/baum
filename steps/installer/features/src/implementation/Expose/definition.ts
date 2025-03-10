import { asConst } from "json-schema-to-ts";

export const definition = asConst({
    type: 'object',
    patternProperties: {
        '(0-9)+': {
            type: 'object',
            required: ['type'],
            oneOf: [
                {
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['load-balancer']
                        },
                        cors: {
                            type: 'object',
                            required: [],
                            properties: {
                                self: {
                                    type: 'boolean'
                                },
                                methods: {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    }
                                },
                                origins: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            relative: {
                                                type: 'boolean'
                                            },
                                            source: {
                                                type: 'string'
                                            }
                                        },
                                        required: ['source'],
                                        additionalProperties: false
                                    }
                                },
                                additionalProperties: false
                            }
                        },
                        path: {
                            type: 'string'
                        },
                        doNotStripPrefix: {
                            type: 'boolean'
                        },
                        prefix: {
                            type: 'string'
                        },
                        domainPrefix: {
                            type: 'string'
                        }
                    }
                },
                {
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['internal']
                        },
                        path: {
                            type: 'string'
                        },
                        doNotStripPrefix: {
                            type: 'boolean'
                        },
                        domainPrefix: {
                            type: 'string'
                        }
                    }
                }
            ]
        }
    }
});