import type { IStep } from '../IStep.js';
import type { IExecutablePackageManager } from '../PackageManager/IExecutablePackageManager.js';

export interface IBaumRegistrable {
  addExecutionStep(name: string, step: IStep): this;
}

export interface IBaumManagerConfiguration extends IBaumRegistrable {
  setRootDirectory(root: string): this;
  dontCopyLockFile(): this;
  setPackageManager(packageManager: IExecutablePackageManager): this;
}
