import { test, describe, expectTypeOf } from 'vitest';
import { ToDefinitionStructure } from '../ToDefinitionStructure.js';

describe('Type merge test', () => {
    test('Merge 2 complex objects', () => {

        type ToTest = {
            type: 'string'
        };
        type PathToTest = 'items["^[a-zA-Z0-9]+$"]';
                    
        type Actual = ToDefinitionStructure<PathToTest, ToTest>;

        type Expected = {
            items: {
               ['^[a-zA-Z0-9]+$']: {
                type: 'string'
               }
            }
        };

        expectTypeOf({} as Actual).toMatchObjectType<Expected>();
    });
});
