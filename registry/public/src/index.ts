import { GroupStep, IExecutablePackageManager, IStep, IWorkspace, PKGMStep } from '@veto-party/baum__core';
import { ARegistryStep, GenericVersionManager, NPMRCForSpecifiedRegistryStep, VersionManagerVersionOverride } from '@veto-party/baum__registry';

export class PublicRegistryStep extends ARegistryStep {
  private initStep?: IStep;

  private publishStep?: PKGMStep;

  private hasInstallStep = false;

  constructor(
    private pinVersion: string,
    private registry: string,
    private token: string
  ) {
    super((workspaces) => new VersionManagerVersionOverride(this.pinVersion, workspaces));
  }

  modifyJSON(json: any) {
    json.version = json.version ?? this.pinVersion ?? GenericVersionManager.MIN_VERSION;
    delete json.private;
  }

  addInstallStep(): this {
    this.hasInstallStep = true;
    return this;
  }

  getPublishStep(): PKGMStep | undefined {
    return this.publishStep;
  }

  protected async startExecution(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<void> {
    if (this.hasInstallStep) {
      this.initStep ??= new GroupStep([new NPMRCForSpecifiedRegistryStep(`${this.registry}`), new PKGMStep((intent) => intent.install().ci())]);
    }

    await super.startExecution(workspace, pm, root);

    this.publishStep = new PKGMStep((intent) => intent.publish().setRegistry(this.registry).setForcePublic(false).setAuthorization(this.token));
  }
}
