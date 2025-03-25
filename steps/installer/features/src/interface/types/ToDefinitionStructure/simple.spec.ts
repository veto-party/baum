import { describe, expectTypeOf, test } from 'vitest';
import type { ToDefinitionStructure } from '../ToDefinitionStructure.js';

describe('Type merge test', () => {
  test('Merge 2 complex objects', () => {
    type ToTest = {
      type: 'string';
    };
    type PathToTest = 'items.oneOf[1].properties.test';

    type Actual = ToDefinitionStructure<PathToTest, ToTest>;

    type Expected = {
      items: {
        oneOf: [
          void,
          {
            properties: {
              test: {
                type: 'string';
              };
            };
          }
        ];
      };
    };

    expectTypeOf({} as Actual).toMatchObjectType<Expected>();
  });
});
