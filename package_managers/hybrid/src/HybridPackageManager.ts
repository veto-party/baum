import { GroupStep, ICommandIntent, IExecutablePackageManager, IExecutablePackageManagerParser, IExecutionIntent, IExecutionIntentBuilder, IInstallIntent, IPackageManagerExecutor, IPublishIntent, IRunIntent, IStep, IWorkspace, callbackArgs } from '@veto-party/baum__core';
import FileSystem from 'fs/promises';

type PartialExecutorMap = { [K in keyof callbackArgs]?: IExecutablePackageManager }

export class HybridPackageManager implements IExecutablePackageManager {
    constructor(
        private primaryPM: IExecutablePackageManager,
        private executors: PartialExecutorMap
    ) { }

    disableGlobalWorkspace(rootDirectory: string) {
        return this.primaryPM.disableGlobalWorkspace(rootDirectory);
    }

    enableGlobalWorkspace(rootDirectory: string) {
        return this.primaryPM.enableGlobalWorkspace(rootDirectory);
    }

    getCleanLockFile(rootDirectory: string): Promise<Parameters<(typeof FileSystem)['writeFile']>[1]> {
        return this.primaryPM.getCleanLockFile(rootDirectory);
    }

    getExecutor(): IPackageManagerExecutor {

        const self = this;

        return new class implements IPackageManagerExecutor {
            startExecutionIntent(): IExecutionIntentBuilder {
                return new class implements IExecutionIntentBuilder {
                    publish(): IPublishIntent {
                        return (self.executors.publish?.getExecutor() ?? self.getExecutor()).startExecutionIntent().publish();
                    }
                    run(): IRunIntent {
                        return (self.executors.run?.getExecutor() ?? self.getExecutor()).startExecutionIntent().run();
                    }
                    command(): ICommandIntent {
                        return (self.executors.command?.getExecutor() ?? self.getExecutor()).startExecutionIntent().command();
                    }
                    install(): IInstallIntent {
                        return (self.executors.install?.getExecutor() ?? self.getExecutor()).startExecutionIntent().install();
                    }
                }
            }

        }
    }

    getExecutorParser(): IExecutablePackageManagerParser {
        const self = this;

        return new class implements IExecutablePackageManagerParser {
            parseAbstractSyntax(syntax: IExecutionIntent[]): IStep {
                return new GroupStep(syntax.map((syntax) => {
                    return (self.executors[syntax.name as keyof typeof self.executors] ?? self.primaryPM).getExecutorParser().parseAbstractSyntax([syntax]);
                }));
            }

        }
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
