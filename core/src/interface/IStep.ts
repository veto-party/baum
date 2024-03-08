import { IExecutablePackageManager } from './PackageManager/IExecutablePackageManager.js';
import { IWorkspace } from './PackageManager/IPackageManager.js';

export interface IStep {
  execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void>;

  clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void>;
}
