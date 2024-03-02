import { IPackageManager, IStep, IWorkspace } from "../../index.js";

/**
 * Package Manager Step
 */
export class PKGMStep implements IStep {

    constructor(private command: string) { }

    async execute(workspace: IWorkspace, packageManager: IPackageManager): Promise<void> {
        if (workspace.getDirectory().endsWith("config")) {
            return // TODO: REMOVE THIS
        }

        console.log(workspace.getDirectory());
        await packageManager.executeScript(workspace.getDirectory(), this.command);
    }

    async clean(workspace: IWorkspace, packageManager: IPackageManager): Promise<void> {
        // NO-OP
    }
}