import { IWorkspace, IExecutablePackageManager, PKGMStep, GroupStep, RunOnce } from "@veto-party/baum__core";
import { ARegistryStep, GenericVersionManager, VersionManagerVersionOverride } from "@veto-party/baum__registry";
import { PrepareStep } from "./implementation/internal/Docker/PrepareStep.js";
import { StartupStep } from "./implementation/internal/Docker/StartupStep.js";
import Crypto from 'crypto';
import portFinder from 'portfinder';

@RunOnce()
class InitStep extends GroupStep {

    private port?: number;

    async getPort() {
        this.port ??= await portFinder.getPortPromise();
        return this.port;
    }

    async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, root: string): Promise<void> {

        const hash = Crypto.createHash("sha256").update(root).digest("hex");

        this.addExecutionStep("prepare", new PrepareStep(hash, root));
        this.addExecutionStep("startup", new StartupStep(hash, (await this.getPort()).toString(), root));
        super.execute(workspace, packageManager, root)
    }
}

export class VerdaccioRegistryStep extends ARegistryStep {

    private publishStep?: PKGMStep;
    private initStep = new InitStep([]);

    constructor(
        private pinVersion: string,
        private dockerAddress = 'http://localhost'
    ) {
        super((workspaces) => new VersionManagerVersionOverride(this.pinVersion, workspaces));
    }

    modifyJSON = (json: any) => {
        json.version = json.version ?? GenericVersionManager.MIN_VERSION;
        delete json.private
    };

    getPublishStep(): PKGMStep | undefined {
        return this.publishStep;
    }

    protected async startExecution(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<void> {
        await this.initStep.execute(workspace, pm, root);
        await super.startExecution(workspace, pm, root);
        const port = await this.initStep.getPort();

        this.publishStep = new PKGMStep((intent) => intent.publish().setRegistry(`${this.dockerAddress}:${port}`).setForcePublic(false).setAuthorization("not-empty"));
    }

    public async clean(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<void> {
        try {
            await this.initStep.clean(workspace, pm, root);
        }
    }
}