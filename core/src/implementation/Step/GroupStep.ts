import { IBaumRegistrable, IStep, IWorkspace } from '../../index.js';
import { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';

export class GroupStep implements IStep, IBaumRegistrable {
  constructor(protected steps: IStep[]) {}

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

  addExecutionStep(name: string, step: IStep): this {
    this.steps.push(step);
    return this;
  }
}
