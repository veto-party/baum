import { IPackageManager, IStep, IWorkspace } from "../..";

export class ParallelStep implements IStep {

    constructor(
        private steps: IStep[]
    ) { }

    async clean(workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string): Promise<void> {
        await Promise.all(this.steps.map((step) => step.clean(workspace, packageManager, rootDirectory)));
    }

    async execute(workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string): Promise<void> {
        await Promise.all(this.steps.map((step) => step.execute(workspace, packageManager, rootDirectory)));
    }
}