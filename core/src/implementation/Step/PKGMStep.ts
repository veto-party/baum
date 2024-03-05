import type { IPackageManager, IStep, IWorkspace } from '../../index.js';
import { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';
import type { IExecutionIntent, IExecutionIntentBuilder } from '../../interface/PackageManager/executor/IPackageManagerExecutor.js';

/**
 * Package Manager Step
 */
export class PKGMStep implements IStep {
  constructor(
    private intentCreator: (itent: IExecutionIntentBuilder, workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string) => (IExecutionIntent[]) | IExecutionIntent
  ) { }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const intent = this.intentCreator(packageManager.getExecutor().startExecutionIntent(), workspace, packageManager, rootDirectory);
    await packageManager.getExecutorParser().parseAbstractSyntax([intent].flat()).execute(workspace, packageManager, rootDirectory);
  }

  async clean(workspace: IWorkspace, packageManager: IPackageManager): Promise<void> {
    // NO-OP
  }
}
