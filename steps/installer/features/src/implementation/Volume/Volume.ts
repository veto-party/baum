import type { FromSchema } from 'json-schema-to-ts';
import { AFeature } from '../../abstract/AFeature.js';
import { definition } from './definition.js';

export class VolumeFeature extends AFeature<typeof definition, 'volumes', FromSchema<typeof definition>> {
  constructor() {
    super(definition, 'volumes');
  }
}
