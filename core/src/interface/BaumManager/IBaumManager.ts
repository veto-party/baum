import { IStep } from '../IStep.js';
import type { IBaumManagerConfiguration } from './IBaumManagerConfiguration.js';

export interface IBaumManager extends IBaumManagerConfiguration {
  run(callback: (step: IStep) => any): Promise<void>;
  run(steps?: string[]): Promise<void>;
}
