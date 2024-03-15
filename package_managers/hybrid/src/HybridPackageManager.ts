import {
  GroupStep,
  type ICommandIntent,
  type IExecutablePackageManager,
  type IExecutablePackageManagerParser,
  type IExecutionIntent,
  type IExecutionIntentBuilder,
  type IInstallIntent,
  type IPackageManagerExecutor,
  type IPublishIntent,
  type IRunIntent,
  type IStep,
  type IWorkspace,
  type callbackArgs
} from '@veto-party/baum__core';
import type FileSystem from 'fs/promises';

type PartialExecutorMap = { [K in keyof callbackArgs]?: IExecutablePackageManager };

export class HybridPackageManager implements IExecutablePackageManager {
  constructor(
    private primaryPM: IExecutablePackageManager,
    private executors: PartialExecutorMap
  ) {}

  clearWorkspaceCache(): void {
    this.primaryPM.clearWorkspaceCache();
  }

  disableGlobalWorkspace(rootDirectory: string) {
    return this.primaryPM.disableGlobalWorkspace(rootDirectory);
  }

  enableGlobalWorkspace(rootDirectory: string) {
    return this.primaryPM.enableGlobalWorkspace(rootDirectory);
  }

  getCleanLockFile(rootDirectory: string, workspace: IWorkspace): Promise<Parameters<(typeof FileSystem)['writeFile']>[1] | undefined> {
    return this.primaryPM.getCleanLockFile(rootDirectory, workspace);
  }

  getExecutor(): IPackageManagerExecutor {
    const self = this;

    return new (class implements IPackageManagerExecutor {
      startExecutionIntent(): IExecutionIntentBuilder {
        return new (class implements IExecutionIntentBuilder {
          publish(): IPublishIntent {
            return (self.executors.publish?.getExecutor() ?? self.primaryPM.getExecutor()).startExecutionIntent().publish();
          }
          run(): IRunIntent {
            return (self.executors.run?.getExecutor() ?? self.primaryPM.getExecutor()).startExecutionIntent().run();
          }
          command(): ICommandIntent {
            return (self.executors.command?.getExecutor() ?? self.primaryPM.getExecutor()).startExecutionIntent().command();
          }
          install(): IInstallIntent {
            return (self.executors.install?.getExecutor() ?? self.primaryPM.getExecutor()).startExecutionIntent().install();
          }
        })();
      }
    })();
  }

  getExecutorParser(): IExecutablePackageManagerParser {
    const self = this;

    return new (class implements IExecutablePackageManagerParser {
      parseAbstractSyntax(syntax: IExecutionIntent[]): IStep {
        return new GroupStep(
          syntax.map((syntax) => {
            return (self.executors[syntax.name as keyof typeof self.executors] ?? self.primaryPM).getExecutorParser().parseAbstractSyntax([syntax]);
          })
        );
      }
    })();
  }

  getLockFileName(): string {
    return this.primaryPM.getLockFileName();
  }

  modifyToRealVersionValue(version: string): string | false | undefined {
    return this.primaryPM.modifyToRealVersionValue(version);
  }

  readWorkspace(rootDirectory: string): Promise<IWorkspace[]> {
    return this.primaryPM.readWorkspace(rootDirectory);
  }
}
