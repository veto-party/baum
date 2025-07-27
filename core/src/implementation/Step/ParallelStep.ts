import type { IBaumRegistrable, IStep, IWorkspace } from '../../index.js';
import type { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';
import { allSettledButFailure, allSettledButNoFailures } from '../BaumManager/utility/allSettledButNoFailure.js';

export class ParallelStep implements IStep, IBaumRegistrable {
  
  private cleanup: (() => any)[] = [];

  constructor(protected steps: IStep[]) {}

  addCleanup(cb: () => any): this {
    this.cleanup.push(cb);
    return this;
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await allSettledButNoFailures(this.steps.map(async (step) => await step.clean(workspace, packageManager, rootDirectory)));
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    try {
      await allSettledButFailure(this.steps.map((step) => step.execute(workspace, packageManager, rootDirectory)));
    } finally {
      for (const cleanup of this.cleanup) {
        await cleanup?.();
      }
    }
  }

  addExecutionStep(_name: string, step: IStep): this {
    this.steps.push(step);
    return this;
  }
}
