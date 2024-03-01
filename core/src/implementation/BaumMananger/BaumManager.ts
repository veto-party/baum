import { IBaumManager, IPackageManager, IStep } from "../..";
import { IWorkspace } from "../../interface/IPackageManager";
import { CopyAndCleanLockFileStep } from "../Step/internal/CopyAndCleanLockFile";
import { shakeWorkspacesIntoExecutionGroups } from "./utility/shakeWorkspacesIntoExecutionGroups";
import { structure } from "./validation";

export class BaumManager implements IBaumManager {

    private rootDirectory?: string;

    private packageManager?: IPackageManager;

    private steps: { name: string, step: IStep }[] = [];

    private doCopyLockFileStep: CopyAndCleanLockFileStep | undefined = new CopyAndCleanLockFileStep();

    setRootDirectory(root: string): IBaumManager {
        this.rootDirectory = root;
        return this;
    }

    setPackageManager(packageManager: IPackageManager): IBaumManager {
        this.packageManager = packageManager;
        return this;
    }

    dontCopyLockFile(): IBaumManager {
        this.doCopyLockFileStep = undefined;
        return this;
    }

    addExecutionStep(name: string, step: IStep): IBaumManager {
        this.steps.push({ name, step });
        return this;
    }

    private async validate() {
        await structure.parseAsync(this);
    }

    private async executeGroup(workspaces: IWorkspace[]) {

        if (this.doCopyLockFileStep) {
            await Promise.all(workspaces.map((workspace) => this.doCopyLockFileStep?.execute(workspace, this.packageManager!)));
        }

        let currentStep = -1;
        await Promise.all(this.steps.map(async (step, index) => {
            currentStep = index;
            await Promise.all(workspaces.map((workspace) => step.step.execute(workspace, this.packageManager!)));
        })).catch(async (error) => {

            // TODO: Change to allSettled and log errors.
            await Promise.all(this.steps.splice(0, currentStep).flatMap((step) => {
                return workspaces.map((workspace) => step.step.clean(workspace, this.packageManager!));
            }));

            if (this.doCopyLockFileStep) {
                // TODO: Change to allSettled and log errors.
                await Promise.all(workspaces.map((workspace) => this.doCopyLockFileStep?.clean(workspace, this.packageManager!)));
            }

            throw error;
        });
    }

    async run(): Promise<void> {
        await this.validate();

        const groups = shakeWorkspacesIntoExecutionGroups(await this.packageManager!.readWorkspace(this.rootDirectory!));

        while (groups.length > 0) {
            await this.executeGroup(groups.shift()!);
        }
    }
}
