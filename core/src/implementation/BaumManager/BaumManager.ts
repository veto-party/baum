import { IBaumManager, IPackageManager, IStep } from '../../index.js';
import { IWorkspace } from '../../interface/IPackageManager.js';
import { CopyAndCleanLockFileStep } from '../Step/internal/CopyAndCleanLockFile.js';
import { shakeWorkspacesIntoExecutionGroups } from './utility/shakeWorkspacesIntoExecutionGroups.js';
import { structure } from './validation.js';

export class BaumManager implements IBaumManager {
  private rootDirectory?: string;

  private packageManager?: IPackageManager;

  private steps: { name: string; step: IStep }[] = [];

  private doCopyLockFileStep: CopyAndCleanLockFileStep | undefined = new CopyAndCleanLockFileStep();

  setRootDirectory(root: string): IBaumManager {
    this.rootDirectory = root;
    return this;
  }

  setPackageManager(packageManager: IPackageManager): IBaumManager {
    this.packageManager = packageManager;
    return this;
  }

  dontCopyLockFile(): IBaumManager {
    this.doCopyLockFileStep = undefined;
    return this;
  }

  addExecutionStep(name: string, step: IStep): IBaumManager {
    this.steps.push({ name, step });
    return this;
  }

  private async validate() {
    await structure.parseAsync(this);
  }

  private async executeGroup(workspaces: IWorkspace[], steps?: string[]) {
    if (this.doCopyLockFileStep) {
      await Promise.all(workspaces.map((workspace) => this.doCopyLockFileStep?.execute(workspace, this.packageManager!, this.rootDirectory!)));
    }

    const stepsForReversal: IStep[] = [];
    const current_steps = [...this.steps];

    try {
      while (current_steps.length > 0) {
        const step = current_steps.shift()!;
        stepsForReversal.push(step.step);

        if (steps !== undefined && !steps.includes(step.name)) {
          return;
        }


        await Promise.all(workspaces.map((workspace) => step.step.execute(workspace, this.packageManager!, this.rootDirectory!)));
      }
    } catch (error) {

      while (stepsForReversal.length > 0) {
        // TODO: Log errors.
        const step = stepsForReversal.shift()!;
        await Promise.allSettled(workspaces.map((workspace) => step.clean(workspace, this.packageManager!, this.rootDirectory!)));
      }

      if (this.doCopyLockFileStep) {
        // TODO: log errors.
        await Promise.allSettled(workspaces.map((workspace) => this.doCopyLockFileStep?.clean(workspace, this.packageManager!, this.rootDirectory!)));
      }

      throw error;
    }
  }

  async run(steps?: string[]): Promise<void> {
    await this.validate();

    const groups = shakeWorkspacesIntoExecutionGroups(await this.packageManager!.readWorkspace(this.rootDirectory!));

    try {
      await this.packageManager?.disableGlobalWorkspace(this.rootDirectory!);
      while (groups.length > 0) {
        await this.executeGroup(groups.shift()!, steps);
      }
    } finally {
      await this.packageManager?.enableGlobalWorkspace(this.rootDirectory!);
    }
  }
}
