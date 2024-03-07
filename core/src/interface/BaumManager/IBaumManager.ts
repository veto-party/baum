import { IStep } from '../IStep.js';
import type { IBaumManagerConfiguration } from './IBaumManagerConfiguration.js';

export interface IBaumManager extends IBaumManagerConfiguration {
  run(steps?: string[]): Promise<void>;
}
