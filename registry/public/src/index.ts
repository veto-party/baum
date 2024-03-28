import { CachedFN, GroupStep, type IExecutablePackageManager, type IPackageManager, type IStep, type IWorkspace, PKGMStep } from '@veto-party/baum__core';
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

  async modifyJSON(json: any, versionManager: IVersionManager, workspace: IWorkspace, pm: IPackageManager, root: string) {
    await super.modifyJSON(json, versionManager, workspace, pm, root);
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

  @CachedFN(true)
  async getInstallStep(): Promise<IStep | undefined> {
    return new GroupStep([
      new NPMRCForSpecifiedRegistryStep(this.registry),
      new PKGMStep((intent) => intent.install().install()),
    ]);
  }

  protected async startExecution(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<boolean> {
    if (this.hasInstallStep) {
      this.initStep ??= new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPublishIfRequired((intent) => intent.setRegistry(this.registry).setAuthorization(this.token)));
    }

    return await super.startExecution(workspace, pm, root);
  }
}
