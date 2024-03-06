import type { IPackageManager } from '../PackageManager/IPackageManager.js';
import type { IStep } from '../IStep.js';
import { IPackageManagerExecutor } from '../PackageManager/executor/IPackageManagerExecutor.js';

export interface IBaumManagerConfiguration {
  setRootDirectory(root: string): IBaumManagerConfiguration;
  dontCopyLockFile(): IBaumManagerConfiguration;
  setPackageManager(packageManager: IPackageManagerExecutor): IBaumManagerConfiguration;
  addExecutionStep(name: string, step: IStep): IBaumManagerConfiguration;
  addExecutionStep(name: string, step: IStep, deps: string[]): IBaumManagerConfiguration;
}
