import { IWorkspace, IExecutablePackageManager, IStep, CommandStep, RunOnce, PKGMStep } from "@veto-party/baum__core";
import { ARegistryStep, VersionManagerVersionOverride } from "@veto-party/baum__registry";
import { PrepareStep } from "./implementation/internal/Docker/PrepareStep.js";
import { StartupStep } from "./implementation/internal/Docker/StartupStep.js";
import portFinder from 'portfinder';

export class VerdaccioRegistryStep extends ARegistryStep {

    private publishStep?: PKGMStep;

    constructor(
        private pinVersion: string,
        private startupStep: IStep,
        private dockerAddress = 'http://localhost'
    ) {
        super((workspaces) => new VersionManagerVersionOverride(this.pinVersion, workspaces));
    }

    getPublishStep(): PKGMStep | undefined {
        return this.publishStep;
    }

    protected async startExecution(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<void> {
        await super.startExecution(workspace, pm, root);
        const [port] = await Promise.all([portFinder.getPortPromise(), this.startupStep.execute(workspace, pm, root)]);

        this.addExecutionStep("prepare", new PrepareStep("verdaccio_build", __dirname));
        this.addExecutionStep("startup", new StartupStep(port.toString(), root));
        this.publishStep = new PKGMStep((intent) => intent.publish().setRegistry(`${this.dockerAddress}:${port}`).setForcePublic(false).setAuthorization("not-empty"));
    }

    async clean(workspace: IWorkspace, pm: IExecutablePackageManager, root: string) {
        try {
            await this.startupStep.clean(workspace, pm, root);
        } finally {
            await super.clean(workspace, pm, root);
        }
    }
}