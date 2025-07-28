import type { FromSchema } from 'json-schema-to-ts';
import { AFeature } from '../../abstract/AFeature.js';
import { definition } from './definition.js';

export class UpdateStrategy extends AFeature<typeof definition, 'update_strategy', FromSchema<typeof definition>> {
  public constructor() {
    super(definition, 'update_strategy');
  }
}
