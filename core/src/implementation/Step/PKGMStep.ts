import type { IPackageManager, IStep, IWorkspace } from '../../index.js';
import { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';
import type { IExecutionIntent, IExecutionIntentBuilder } from '../../interface/PackageManager/executor/IPackageManagerExecutor.js';

/**
 * Package Manager Step
 */
export class PKGMStep implements IStep {
  constructor(private intentCreator: (itent: IExecutionIntentBuilder, workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string) => IExecutionIntent[] | IExecutionIntent) {}

  static DEFAULT_TYPES = {
    RunPGKMWhenKeyExists:
      (task: string): ConstructorParameters<typeof PKGMStep>[0] =>
      (itent, workspace) =>
        workspace.getScriptNames().includes(task) ? [itent.run().setRunStep(task)] : [],
    RunPublishIfRequired:
      (callback: (itent: ReturnType<IExecutionIntentBuilder['publish']>, workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string) => IExecutionIntent): ConstructorParameters<typeof PKGMStep>[0] =>
      (intent, workspace, pk, rootDir) =>
        workspace.isPublishable() ? callback(intent.publish(), workspace, pk, rootDir) : []
  };

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const intent = this.intentCreator(packageManager.getExecutor().startExecutionIntent(), workspace, packageManager, rootDirectory);
    await packageManager.getExecutorParser().parseAbstractSyntax([intent].flat()).execute(workspace, packageManager, rootDirectory);
  }

  async clean(workspace: IWorkspace, packageManager: IPackageManager): Promise<void> {
    // NO-OP
  }
}
