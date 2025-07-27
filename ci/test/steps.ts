import { type IBaumManagerConfiguration, PKGMStep } from 'baum';
import { ConditionalGitDiffStep } from '../../steps/git_diff/src/index.js';

export const testSteps = (baum: IBaumManagerConfiguration) => {
  baum.addExecutionStep('test', new ConditionalGitDiffStep(new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists('test')), process.env.GITHUB_BASE_REF ?? 'main', process.env.GITHUB_BASE_REF !== undefined));
};
