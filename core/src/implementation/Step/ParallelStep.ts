import type { IBaumRegistrable, IStep, IWorkspace } from '../../index.js';
import type { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';
import { allSettledButFailure } from '../BaumManager/utility/allSettledButNoFailure.js';

export class ParallelStep implements IStep, IBaumRegistrable {
  private cleanup: [() => any, number][] = [];

  constructor(protected steps: IStep[]) {}

  addCleanup(cb: () => any, priority = 0): this {
    this.cleanup.push([cb, priority]);
    return this;
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await allSettledButFailure(this.steps.map(async (step) => await step.clean(workspace, packageManager, rootDirectory)));
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    try {
      await allSettledButFailure(this.steps.map((step) => step.execute(workspace, packageManager, rootDirectory)));
    } finally {
      for (const [cleanup] of this.cleanup.toSorted(([, a], [, b]) => a - b)) {
        await cleanup?.();
      }
    }
  }

  addExecutionStep(_name: string, step: IStep): this {
    this.steps.push(step);
    return this;
  }
}
