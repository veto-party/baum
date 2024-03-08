import { IWorkspace, IExecutablePackageManager, IStep, PKGMStep, GroupStep } from "@veto-party/baum__core";
import { ARegistryStep, GenericVersionManager, VersionManagerVersionOverride } from "@veto-party/baum__registry";
import { PrepareStep } from "./implementation/internal/Docker/PrepareStep.js";
import { StartupStep } from "./implementation/internal/Docker/StartupStep.js";
import Crypto from 'crypto';
import portFinder from 'portfinder';

export class VerdaccioRegistryStep extends ARegistryStep {

    private publishStep?: PKGMStep;

    constructor(
        private pinVersion: string,
        private dockerAddress = 'http://localhost'
    ) {
        super((workspaces) => new VersionManagerVersionOverride(this.pinVersion, workspaces));
    }

    modifyJSON = (json: any) => {
        json.version = json.version ?? GenericVersionManager.MIN_VERSION;
        delete json.private;
    };

    getPublishStep(): PKGMStep | undefined {
        return this.publishStep;
    }

    protected async startExecution(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<void> {
        await super.startExecution(workspace, pm, root);
        const [port] = await Promise.all([portFinder.getPortPromise()]);

        const hash = Crypto.createHash("sha256").update(root).digest("hex");

        this.addExecutionStep("prepare", new PrepareStep(hash, root));
        this.addExecutionStep("startup", new StartupStep(hash, port.toString(), root));
        this.publishStep = new PKGMStep((intent) => intent.publish().setRegistry(`${this.dockerAddress}:${port}`).setForcePublic(false).setAuthorization("not-empty"));
    }
}