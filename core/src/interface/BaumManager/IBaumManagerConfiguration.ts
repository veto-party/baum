import type { IStep } from '../IStep.js';
import { IExecutablePackageManager } from '../PackageManager/IExecutablePackageManager.js';

export interface IBaumManagerConfiguration {
  setRootDirectory(root: string): IBaumManagerConfiguration;
  dontCopyLockFile(): IBaumManagerConfiguration;
  setPackageManager(packageManager: IExecutablePackageManager): IBaumManagerConfiguration;
  addExecutionStep(name: string, step: IStep): IBaumManagerConfiguration;
  addExecutionStep(name: string, step: IStep, deps: string[]): IBaumManagerConfiguration;
}
