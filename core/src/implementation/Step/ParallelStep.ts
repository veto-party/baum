import { IPackageManager, IStep, IWorkspace } from '../../index.js';
import { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';

export class ParallelStep implements IStep {
  constructor(private steps: IStep[]) { }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await Promise.all(this.steps.map((step) => step.clean(workspace, packageManager, rootDirectory)));
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await Promise.all(this.steps.map((step) => step.execute(workspace, packageManager, rootDirectory)));
  }
}
