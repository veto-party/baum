import { IPackageManager, IStep, IWorkspace } from "../..";

/**
 * Package Manager Step
 */
export class PKGMStep implements IStep {

    constructor(private command: string) { }

    async execute(workspace: IWorkspace, packageManager: IPackageManager): Promise<void> {
        await packageManager.executeScript(workspace.getDirectory(), this.command);
    }

    async clean(workspace: IWorkspace, packageManager: IPackageManager): Promise<void> {
        // NO-OP
    }
}