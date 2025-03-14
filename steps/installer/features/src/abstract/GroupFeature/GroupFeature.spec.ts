import { describe, expect, test } from "vitest";
import { GroupFeature } from "./GroupFeature.js";
import { asConst, type FromSchema } from "json-schema-to-ts";
import { AFeature } from "../AFeature.js";
import { BindingFeature } from "../../implementation/Binding/Binding.js";
import { variableAccessorPattern } from "../../implementation/Variable/definition.js";
import { definitionDefinitionPattern } from "../../implementation/Binding/definition.js";

describe('GroupFeature', () => {
    describe('should be able to merge structure to equal type', () => {
        test('simple', () => {
            
            const definition = asConst({
                type: 'object',
                properties: {
                    'hello': {
                        type: 'string'
                    }
                },
                additionalProperties: false
            });

            const Group = class extends GroupFeature<typeof definition, undefined, FromSchema<typeof definition>> {
                constructor(defintion: any) {
                    super(definition, undefined);
                }
            };

            class SomeFeature extends AFeature<typeof definition, undefined, FromSchema<typeof definition>> {
                constructor() {
                    super(definition, undefined);
                }
            }


            const groupInstance = new Group(definition);

            const clonedGroup = groupInstance.appendFeature('properties.test' as const, new SomeFeature());
            expect(clonedGroup.getSchema()).toStrictEqual({
                type: 'object',
                additionalProperties: false,
                properties: {
                    'hello': {
                        type: 'string'
                    },
                    test: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            'hello': {
                                type: 'string'
                            }
                        }
                    }
                }
            });
        });
    });

    test('more complex and real example', () => {
        const definition = asConst({
            type: 'object',
            properties: {
                'hello': {
                    type: 'string'
                }
            },
            additionalProperties: false
        });

        const Group = class extends GroupFeature<typeof definition, undefined, FromSchema<typeof definition>> {
            constructor(defintion: any) {
                super(definition, undefined);
            }
        };

        class SomeFeature extends AFeature<typeof definition, undefined, FromSchema<typeof definition>> {
            constructor() {
                super(definition, undefined);
            }
        }


        const groupInstance = new Group(definition);

        const clonedGroup = groupInstance.appendFeature('properties.test' as const, new SomeFeature());
        expect(clonedGroup.getSchema()).toStrictEqual({
            type: 'object',
            additionalProperties: false,
            properties: {
                'hello': {
                    type: 'string'
                },
                test: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        'hello': {
                            type: 'string'
                        }
                    }
                }
            }
        });

        const cloned02 = clonedGroup.appendFeature(`patternProperties.["${variableAccessorPattern}"].properties` as const, new BindingFeature());

        expect(cloned02.getSchema()).toStrictEqual({
            type: 'object',
            additionalProperties: false,
            properties: {
                'hello': {
                    type: 'string'
                },
                test: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        'hello': {
                            type: 'string'
                        }
                    }
                }
            },
            patternProperties: {
                [variableAccessorPattern]: {
                    properties: {
                        binding: {
                            type: 'object',
                            additionalProperties: false,
                            patternProperties: {
                                [definitionDefinitionPattern]: {
                                    type: 'string',
                                    pattern: variableAccessorPattern
                                }
                            }
                        }
                    }
                }
            }
        });
    })
});