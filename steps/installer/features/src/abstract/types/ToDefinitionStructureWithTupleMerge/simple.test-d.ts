import { FromSchema } from 'json-schema-to-ts';
import { expectType } from 'tsd';
import { ToDefinitionStructureWithTupleMerge } from '../ToDefinitionStructureWithTupleMerge.js';
import { ToDefinitionStructure } from '../../../interface/types/ToDefinitionStructure.js';

type ToTest = ToDefinitionStructure<'items.oneOf[1].properties.test', { type: 'string' }>;

type Merged = ToDefinitionStructureWithTupleMerge<'items.oneOf[1].properties.test', { type: 'string'; }, {
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
}>;

type Expected = ({
    hello?: 'world';
}|{
    ehllo?: 'world2';

})[];

type Actual = FromSchema<Merged>;
