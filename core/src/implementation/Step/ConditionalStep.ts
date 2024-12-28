import { ICloneable } from '../../interface/ICloneable.js';
import type { ISettableStep, IStep } from '../../interface/IStep.js';
import type { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';
import type { IWorkspace } from '../../interface/PackageManager/IPackageManager.js';

export class ConditionalStep<T extends ConditionalStep<any>|undefined = undefined> implements IStep, ICloneable<T extends undefined ? ConditionalStep : T>, ISettableStep {
  private executedWorkspaces: IWorkspace[] = [];

  constructor(
    protected step: IStep|undefined,
    protected condition: (workspace: IWorkspace, pm: IExecutablePackageManager, rootDirectory: string) => boolean | Promise<boolean>
  ) {}

  setStep(stepWrapper: IStep): this {
    this.step = stepWrapper;
    return this;
  }

  /**
   * @abstract
   */
  clone(): T extends undefined ? ConditionalStep : T {
    return new ConditionalStep(this.step, this.condition) as any;
  }

  private checkExecutionDep(workspace: IWorkspace) {
    const deps = workspace.getDynamicDependents();
    return deps.some((lookup) => {
      return this.executedWorkspaces.some((executedWorkspace) => executedWorkspace.getName() === lookup.getName());
    });
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {

    if (!this.step) {
      throw new Error('No step defined.');
    }

    if (this.checkExecutionDep(workspace) || (await this.condition(workspace, packageManager, rootDirectory))) {
      this.executedWorkspaces.push(workspace);
      return this.step.execute(workspace, packageManager, rootDirectory);
    }
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {

    if (!this.step) {
      throw new Error('No step defined.');
    }

    if (this.checkExecutionDep(workspace) || (await this.condition(workspace, packageManager, rootDirectory))) {
      return this.step.clean(workspace, packageManager, rootDirectory);
    }
  }
}
