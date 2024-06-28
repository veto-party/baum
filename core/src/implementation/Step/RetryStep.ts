import type { IPackageManager, IStep, IWorkspace } from '../../index.js';
import type { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';

export class RetryStep implements IStep {
  constructor(protected step: IStep, private retryCount: number = 3) {}

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    return this.step.clean(workspace, packageManager, rootDirectory);
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    for (let i = 0; i <= this.retryCount; i++) {
      try {
        return await this.step.execute(workspace, packageManager, rootDirectory);
      } catch (error) {
        console.warn("Job failed for :", workspace.getName());
      }
    }
  }
}
