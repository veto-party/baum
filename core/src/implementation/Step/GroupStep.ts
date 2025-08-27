import type { IBaumRegistrable, IStep, IWorkspace } from '../../index.js';
import type { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';

export class GroupStep implements IStep, IBaumRegistrable {
  private cleanup: [() => any, number][] = [];

  constructor(protected steps: IStep[]) {}

  addCleanup(cb: () => any, priority = 0): this {
    this.cleanup.push([cb, priority]);
    return this;
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    try {
      for (const step of this.steps) {
        await step.execute(workspace, packageManager, rootDirectory);
      }
    } finally {
      for (const [cleanup] of this.cleanup.toSorted(([, a], [, b]) => a - b)) {
        await cleanup?.();
      }
    }
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    for (const step of [...this.steps].reverse()) {
      try {
        await step.clean(workspace, packageManager, rootDirectory);
      } catch (error) {
        console.warn(`Failed to clean ${step.constructor.name}:`, error);
      }
    }
  }

  addExecutionStep(_name: string, step: IStep): this {
    this.steps.push(step);
    return this;
  }
}
