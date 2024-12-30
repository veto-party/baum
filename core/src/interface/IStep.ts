import type { IExecutablePackageManager } from './PackageManager/IExecutablePackageManager.js';
import type { IWorkspace } from './PackageManager/IPackageManager.js';

export interface IStep {
  execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void>;

  clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void>;
}

export interface ISettableStep extends IStep {
  setStep(stepWrapper: IStep): this;
}
