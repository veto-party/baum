import { IPackageManager, IStep, IWorkspace } from "../../index.js";

/**
 * Package Manager Step
 */
export class PKGMStep implements IStep {

    constructor(private command: string, private required: boolean = false) { }

    async execute(workspace: IWorkspace, packageManager: IPackageManager): Promise<void> {

        if (!workspace.getScriptNames().includes(this.command)) {
            if (this.required) {
                throw new Error(`Script: "${this.command}" is required for all the packages.`);
            }

            return;
        }

        await packageManager.executeScript(workspace.getDirectory(), this.command);
    }

    async clean(workspace: IWorkspace, packageManager: IPackageManager): Promise<void> {
        // NO-OP
    }
}