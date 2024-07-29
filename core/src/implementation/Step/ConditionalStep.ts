import { IStep } from "../../interface/IStep.js";
import { IExecutablePackageManager } from "../../interface/PackageManager/IExecutablePackageManager.js";
import { IWorkspace } from "../../interface/PackageManager/IPackageManager.js";

export class ConditionalStep implements IStep {

    constructor(
        private step: IStep,
        private condition: (workspace: IWorkspace, pm: IExecutablePackageManager, rootDirectory: string) => boolean|Promise<boolean> 
    ) {}

    async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        if (await this.condition(workspace, packageManager, rootDirectory)) {
            return this.step.execute(workspace, packageManager, rootDirectory);
        }
    }

    async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        if (await this.condition(workspace, packageManager, rootDirectory)) {
            return this.step.clean(workspace, packageManager, rootDirectory);
        }
    }
}
