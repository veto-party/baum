import { IPackageManager, IStep, IWorkspace } from "../../index.js";

export class PublishStep implements IStep {

    constructor(private registry?: string) { }

    async execute(workspace: IWorkspace, packageManager: IPackageManager): Promise<void> {
        await packageManager.publish(workspace.getDirectory(), this.registry);
    }

    async clean(workspace: IWorkspace, packageManager: IPackageManager): Promise<void> {
        // NO-OP
    }
}