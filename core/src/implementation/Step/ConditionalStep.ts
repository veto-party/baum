import type { IStep } from '../../interface/IStep.js';
import type { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';
import type { IWorkspace } from '../../interface/PackageManager/IPackageManager.js';

export class ConditionalStep implements IStep {

  private executedWorkspaces: IWorkspace[] = [];

  constructor(
    private step: IStep,
    private condition: (workspace: IWorkspace, pm: IExecutablePackageManager, rootDirectory: string) => boolean | Promise<boolean>
  ) {}

  private checkExecutionDep(workspace: IWorkspace) {
    const deps = workspace.getDynamicDependents();
    return deps.some((lookup) => {
        return this.executedWorkspaces.some((executedWorkspace) => executedWorkspace.getName() === lookup.getName());
    });
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    if (this.checkExecutionDep(workspace) || await this.condition(workspace, packageManager, rootDirectory)) {
        this.executedWorkspaces.push(workspace);
      return this.step.execute(workspace, packageManager, rootDirectory);
    }
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    if (this.checkExecutionDep(workspace) || await this.condition(workspace, packageManager, rootDirectory)) {
      return this.step.clean(workspace, packageManager, rootDirectory);
    }
  }
}
