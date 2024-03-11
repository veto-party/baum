import { GroupStep, IBaumManager, IStep } from '../../index.js';
import { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';
import { IWorkspace } from '../../interface/PackageManager/IPackageManager.js';
import { CopyAndCleanLockFileStep } from '../Step/internal/CopyAndCleanLockFile.js';
import { allSettledButFailure, allSettledButNoFailures } from './utility/allSettledButNoFailure.js';
import { shakeWorkspacesIntoExecutionGroups } from './utility/shakeWorkspacesIntoExecutionGroups.js';
import { structure } from './validation.js';

export class BaumManager implements IBaumManager {
  private rootDirectory?: string;

  private packageManager?: IExecutablePackageManager;

  private steps: { name: string; step: IStep }[] = [];

  private doCopyLockFileStep: CopyAndCleanLockFileStep | undefined = new CopyAndCleanLockFileStep();

  setRootDirectory(root: string): this {
    this.rootDirectory = root;
    return this;
  }

  setPackageManager(packageManager: IExecutablePackageManager): this {
    this.packageManager = packageManager;
    return this;
  }

  dontCopyLockFile(): this {
    this.doCopyLockFileStep = undefined;
    return this;
  }

  addExecutionStep(name: string, step: IStep): this {
    this.steps.push({ name, step });
    return this;
  }

  private async validate() {
    await structure.parseAsync(this);
  }

  private async doClean(workspaces: IWorkspace[], steps?: string[]) {
    const current_steps = [...this.steps];
    while (current_steps.length > 0) {
      const step = current_steps.pop()!;

      if (steps !== undefined && !steps.includes(step.name)) {
        return;
      }

      // TODO: Log errors.
      console.log(`Cleaning step: ${JSON.stringify(step.name)}`);
      await allSettledButNoFailures(workspaces.map((workspace) => step.step.clean(workspace, this.packageManager!, this.rootDirectory!)));
    }
  }

  private async executeGroup(workspaces: IWorkspace[], steps?: string[]) {
    const stepsForReversal: IStep[] = [];
    const current_steps = [...this.steps];

    try {
      while (current_steps.length > 0) {
        const step = current_steps.shift()!;
        stepsForReversal.push(step.step);

        if (steps !== undefined && !steps.includes(step.name)) {
          return;
        }

        console.log('executing step', step.name);
        await allSettledButFailure(workspaces.map((workspace) => step.step.execute(workspace, this.packageManager!, this.rootDirectory!)));
      }
    } catch (error) {
      console.warn('Failed, reverting state.');

      while (stepsForReversal.length > 0) {
        const step = stepsForReversal.shift()!;
        await allSettledButNoFailures(workspaces.map((workspace) => step.clean(workspace, this.packageManager!, this.rootDirectory!)));
      }
      throw error;
    }
  }

  async run(steps?: string[]): Promise<void> {
    await this.validate();

    const internalSteps: IStep[] = [];

    if (this.doCopyLockFileStep) {
      internalSteps.push(this.doCopyLockFileStep);
    }

    if (internalSteps.length > 0) {
      this.steps.unshift({ name: 'Internal -- Preparation', step: new GroupStep(internalSteps) });
    }

    const executedGroups: IWorkspace[][] = [];
    const groups = shakeWorkspacesIntoExecutionGroups(await this.packageManager!.readWorkspace(this.rootDirectory!), this.packageManager!);

    try {
      await this.packageManager?.disableGlobalWorkspace(this.rootDirectory!);
      while (groups.length > 0) {
        const currentGroup = groups.shift()!;
        await this.executeGroup(currentGroup, steps);
        executedGroups.push(currentGroup);
      }
    } finally {
      while (executedGroups.length > 0) {
        const currentGroup = executedGroups.shift()!;
        try {
          await this.doClean(currentGroup, steps);
        } catch (error) {
          console.warn('Failed to clean up group.', error);
        }
      }

      await this.packageManager?.enableGlobalWorkspace(this.rootDirectory!);
    }
  }
}
