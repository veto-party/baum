import type { IPackageManager, IStep, IWorkspace } from '../../index.js';
import type { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';
import type { IExecutionIntent, IExecutionIntentBuilder } from '../../interface/PackageManager/executor/IPackageManagerExecutor.js';

/**
 * Package Manager Step
 */
export class PKGMStep implements IStep {
  constructor(private intentCreator: (itent: IExecutionIntentBuilder, workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string) => IExecutionIntent[] | IExecutionIntent) {}

  private workspaceMapping: Map<IWorkspace, IStep> = new Map();

  static readonly DEFAULT_TYPES = {
    RunPGKMWhenKeyExists:
      (task: string, exitCodes?: number[]): ConstructorParameters<typeof PKGMStep>[0] =>
      (itent, workspace) =>
        // || [0] to replace empty array with [0]
        workspace.getScriptNames().includes(task) ? [itent.run().setRunStep(task).setSuccessCodes(exitCodes || [0])] : [],
    RunPublishIfRequired:
      (callback: (itent: ReturnType<IExecutionIntentBuilder['publish']>, workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string) => IExecutionIntent): ConstructorParameters<typeof PKGMStep>[0] =>
      (intent, workspace, pk, rootDir) =>
        workspace.isPublishable() ? callback(intent.publish(), workspace, pk, rootDir) : []
  };

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    if (!this.workspaceMapping.has(workspace)) {
      const intent = this.intentCreator(packageManager.getExecutor().startExecutionIntent(), workspace, packageManager, rootDirectory);
      this.workspaceMapping.set(workspace, packageManager.getExecutorParser().parseAbstractSyntax([intent].flat()));
    }

    return this.workspaceMapping.get(workspace)!.execute(workspace, packageManager, rootDirectory);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, root: string): Promise<void> {
    if (!this.workspaceMapping.has(workspace)) {
      return;
    }

    return this.workspaceMapping.get(workspace)!.clean(workspace, packageManager, root);
  }
}
