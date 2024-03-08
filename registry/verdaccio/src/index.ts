import { IWorkspace, IExecutablePackageManager, IStep, PKGMStep } from "@veto-party/baum__core";
import { ARegistryStep, VersionManagerVersionOverride } from "@veto-party/baum__registry";
import { PrepareStep } from "./implementation/internal/Docker/PrepareStep.js";
import { StartupStep } from "./implementation/internal/Docker/StartupStep.js";
import Crypto from 'crypto';
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

        const hash = Crypto.createHash("sha256").update(root).digest("base64");

        this.addExecutionStep("prepare", new PrepareStep(hash, root));
        this.addExecutionStep("startup", new StartupStep(hash, port.toString(), root));
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