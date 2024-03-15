import { GroupStep, type IExecutablePackageManager, type IStep, type IWorkspace, PKGMStep } from '@veto-party/baum__core';
import { ARegistryStep, GenericVersionManager, type IVersionManager, NPMRCForSpecifiedRegistryStep, VersionManagerVersionOverride } from '@veto-party/baum__registry';

export class PublicRegistryStep extends ARegistryStep {
  private initStep?: IStep;

  private hasInstallStep = false;

  constructor(
    private pinVersion: string,
    private registry: string,
    private token: string
  ) {
    super((workspaces, pm) => new VersionManagerVersionOverride(this.pinVersion, workspaces, pm));
  }

  async modifyJSON(json: any, versionManager: IVersionManager) {
    await super.modifyJSON(json, versionManager);
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

  protected async startExecution(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<boolean> {
    if (this.hasInstallStep) {
      this.initStep ??= new GroupStep([new NPMRCForSpecifiedRegistryStep(this.registry), new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPublishIfRequired((intent) => intent.setRegistry(this.registry).setAuthorization(this.token)))]);
    }

    return await super.startExecution(workspace, pm, root);
  }
}
