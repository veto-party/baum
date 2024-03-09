import { GroupStep, IExecutablePackageManager, IStep, IWorkspace, PKGMStep } from '@veto-party/baum__core';
import { ARegistryStep, GenericVersionManager, NPMRCForSpecifiedRegistryStep, VersionManagerVersionOverride } from '@veto-party/baum__registry';

export class PublicRegistryStep extends ARegistryStep {
  private initStep?: IStep;

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

  getPublishStep(): IStep | undefined {
    return this.initStep;
  }

  protected async startExecution(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<void> {
    if (this.hasInstallStep) {
      this.initStep ??= new GroupStep([
        new NPMRCForSpecifiedRegistryStep(this.registry),
        new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPublishIfRequired(
          (intent) => intent.setRegistry(this.registry).setAuthorization(this.token)))
      ]);
    }

    await super.startExecution(workspace, pm, root);
  }
}
