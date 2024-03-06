import { IPackageManager, IStep, IWorkspace } from '../../index.js';
import { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';

export class GroupStep implements IStep {
  constructor(private steps: IStep[]) { }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    for (const step of this.steps) {
      await step.execute(workspace, packageManager, rootDirectory);
    }
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    for (const step of this.steps) {
      await step.clean(workspace, packageManager, rootDirectory);
    }
  }
}
