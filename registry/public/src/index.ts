import { CachedFN, GroupStep, type IExecutablePackageManager, type IPackageManager, type IStep, type IWorkspace, PKGMStep } from '@veto-party/baum__core';
import { ARegistryStep, GenericVersionManager, type IVersionManager, NPMRCForSpecifiedRegistryStep, VersionManagerVersionOverride } from '@veto-party/baum__registry';

export class PublicRegistryStep extends ARegistryStep {
  private initStep: GroupStep;

  constructor(
    private pinVersion: string,
    private registry: string,
    private token: string
  ) {
    super((workspaces, pm) => new VersionManagerVersionOverride(this.pinVersion, workspaces, pm));
    this.initStep = new GroupStep([
      new NPMRCForSpecifiedRegistryStep(registry),
    ]);
  }

  async modifyJSON(json: any, versionManager: IVersionManager, workspace: IWorkspace, pm: IPackageManager, root: string) {
    await super.modifyJSON(json, versionManager, workspace, pm, root);
    json.version = json.version ?? this.pinVersion ?? GenericVersionManager.MIN_VERSION;
    delete json.private;
  }

  @CachedFN(false as any)
  addInstallStep(): this {
    this.initStep.addExecutionStep('install', new PKGMStep((e) => e.install().install()));
    return this;
  }

  @CachedFN(false)
  getPublishStep(): IStep | undefined {
    return new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPublishIfRequired((intent) => intent.setRegistry(this.registry).setAuthorization(this.token)));
  }

  async getInstallStep(): Promise<IStep | undefined> {
    return this.initStep;
  }

  protected async startExecution(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<boolean> {
    return await super.startExecution(workspace, pm, root);
  }
}
