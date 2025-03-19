import { test, describe, expectTypeOf } from 'vitest';
import { ToDefinitionStructureWithTupleMerge } from '../ToDefinitionStructureWithTupleMerge.js';
import { MergeDeepForToDefinitionStructureWithTupleMerge } from '../MergeDeepForToDefinitionStructureWithTupleMerge.js';

describe('Type merge test', () => {
    test('Merge 2 complex objects', () => {

        type ToTestA = {
            items: {
                oneOf: [void, {
                    properties: {
                        test: {
                            type: 'string'
                        }
                    }
                }]
            }
        };

        type ToTestB = {
            type: 'array';
            items: {
                type: 'object';
                additionalProperties: false;
                oneOf: [{ 
                    type: 'object';
                    properties: {
                        ehllo: {
                            type: 'string';
                            enum: ['world'];
                        };
                    };
                    additionalProperties: false;
                }, {
                    type: 'object'; 
                    properties: {
                        ehllo: {
                            type: 'string';
                            enum: ['world2'];
                        }
                    };
                    additionalProperties: false;
                }]
            }
        };

        type Expected = {
            type: 'array';
            items: {
                type: 'object';
                additionalProperties: false;
                oneOf: [{ 
                    type: 'object';
                    properties: {
                        ehllo: {
                            type: 'string';
                            enum: ['world'];
                        };
                    };
                    additionalProperties: false;
                }, {
                    type: 'object'; 
                    properties: {
                        ehllo: {
                            type: 'string';
                            enum: ['world2'];
                        },
                        test: {
                            type: 'string'
                        }
                    };
                    additionalProperties: false;
                }]
            }
        }
        expectTypeOf({} as MergeDeepForToDefinitionStructureWithTupleMerge<ToTestA, ToTestB>).toMatchObjectType<Expected>();
        expectTypeOf({} as MergeDeepForToDefinitionStructureWithTupleMerge<ToTestB, ToTestA>).toMatchObjectType<Expected>();
    });
});
