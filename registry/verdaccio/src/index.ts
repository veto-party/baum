import { CachedFN, GroupStep, type IBaumRegistrable, type IExecutablePackageManager, type IPackageManager, type IStep, type IWorkspace, ModifyNPMRC, PKGMStep } from '@veto-party/baum__core';
import { ARegistryStep, GenericVersionManager, type IVersionManager, NPMRCForSpecifiedRegistryStep, VersionManagerVersionOverride } from '@veto-party/baum__registry';
import { InitStep } from './implementation/internal/InitStep.js';

export class VerdaccioRegistryStep extends ARegistryStep {
  private publishStep?: IStep;
  private initStep: InitStep;

  private installStep = new GroupStep([]);

  constructor(
    private pinVersion: string,
    manager: IBaumRegistrable,
    private dockerAddress = 'http://localhost',
    port?: number,
    doStop: boolean = false
  ) {
    super((workspaces, pm) => new VersionManagerVersionOverride(this.pinVersion, workspaces, pm));
    this.initStep = new InitStep(this.dockerAddress, port);

    doStop &&
      manager.addCleanup(async () => {
        for (const test of (await this.initStep.ensureStartup().catch(() => ({ containers: [] }))).containers) {
          await test.stop();
          await test.remove();
        }
      });
  }

  @CachedFN(true)
  async addInstallStep(): Promise<this> {
    const port = await this.initStep.getPort();
    const url = new URL(`${this.dockerAddress}:${port}`);

    this.installStep.addExecutionStep('npmrc', new NPMRCForSpecifiedRegistryStep(`${this.dockerAddress}:${port}/`));
    this.installStep.addExecutionStep('modify-npmrc', new ModifyNPMRC(`\n${[`${url.toString().substring(url.protocol.length)}:_authToken="npm-empty"`, `${url.toString().substring(url.protocol.length)}:always-auth=true`].join('\n')}`));
    this.installStep.addExecutionStep('install', new PKGMStep((intent) => intent.install().install()));

    return this;
  }

  async getInstallStep(): Promise<IStep | undefined> {
    return this.installStep;
  }

  checkForPublish(_workspace: IWorkspace) {
    return true;
  }

  async modifyJSON(json: any, versionManager: IVersionManager, workspace: IWorkspace, pm: IPackageManager, root: string) {
    await super.modifyJSON(json, versionManager, workspace, pm, root);
    json.version = json.version ?? this.pinVersion ?? GenericVersionManager.MIN_VERSION;
    delete json.private;
  }

  getPublishStep(): IStep | undefined {
    return this.publishStep;
  }

  @CachedFN(true)
  private async prepareExecution(): Promise<void> {
    const port = await this.initStep.getPort();
    this.publishStep ??= new PKGMStep((intent, workspace) => (!this.checkForPublish(workspace) ? [] : intent.publish().setRegistry(`${this.dockerAddress}:${port}`).setForcePublic(false).setAuthorization('not-empty')));
  }

  protected async startExecution(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<boolean> {
    await this.initStep.init(root);
    await this.prepareExecution();
    await this.initStep.execute(workspace, pm, root);
    return await super.startExecution(workspace, pm, root);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await super.clean(workspace, packageManager, rootDirectory);
    await this.initStep.clean(workspace, packageManager, rootDirectory);
  }
}
