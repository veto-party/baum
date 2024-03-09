import Crypto from 'crypto';
import { CachedFN, GroupStep, type IExecutablePackageManager, type IWorkspace, PKGMStep } from '@veto-party/baum__core';
import { ARegistryStep, GenericVersionManager, NPMRCForSpecifiedRegistryStep, VersionManagerVersionOverride, IVersionManager } from '@veto-party/baum__registry';
import portFinder from 'portfinder';
import { PrepareStep } from './implementation/internal/Docker/PrepareStep.js';
import { StartupStep } from './implementation/internal/Docker/StartupStep.js';

class InitStep extends GroupStep {
  private port?: number;

  constructor() {
    super([]);
  }

  async getPort() {
    this.port ??= await portFinder.getPortPromise();
    return this.port;
  }

  @CachedFN(true)
  private async init(root: string) {
    const hash = Crypto.createHash('sha256').update(root).digest('hex');

    console.log('should only run once.');

    this.addExecutionStep('prepare', new PrepareStep(hash, root));
    this.addExecutionStep('startup', new StartupStep(hash, (await this.getPort()).toString(), root));
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, root: string): Promise<void> {
    await this.init(root);
    await super.execute(workspace, packageManager, root);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await super.clean(workspace, packageManager, rootDirectory);
  }
}

export class VerdaccioRegistryStep extends ARegistryStep {
  private publishStep?: PKGMStep;
  private initStep: InitStep;

  private doInstall = false;

  constructor(
    private pinVersion: string,
    private dockerAddress = 'http://localhost'
  ) {
    super((workspaces, pm) => new VersionManagerVersionOverride(this.pinVersion, workspaces, pm));
    this.initStep = new InitStep();
  }

  addInstallStep(): this {
    this.doInstall = true;
    return this;
  }

  modifyJSON(json: any, versionManager: IVersionManager) {
    super.modifyJSON(json, versionManager);
    json.version = json.version ?? this.pinVersion ?? GenericVersionManager.MIN_VERSION;
    delete json.private;
  }

  getPublishStep(): PKGMStep | undefined {
    return this.publishStep;
  }

  @CachedFN(true)
  private async prepareExecution(): Promise<void> {
    const port = await this.initStep.getPort();

    if (this.doInstall) {
      this.initStep.addExecutionStep('modify_npmrc', new NPMRCForSpecifiedRegistryStep(`${this.dockerAddress}:${port}/`));
      this.initStep.addExecutionStep('install', new PKGMStep((intent) => intent.install().ci()));
    }

    this.publishStep = new PKGMStep((intent) => intent.publish().setRegistry(`${this.dockerAddress}:${port}`).setForcePublic(false).setAuthorization('not-empty'));
  }

  protected async startExecution(workspace: IWorkspace, pm: IExecutablePackageManager, root: string): Promise<void> {
    await this.prepareExecution();
    await this.initStep.execute(workspace, pm, root)
    await super.startExecution(workspace, pm, root);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await super.clean(workspace, packageManager, rootDirectory);
    await this.initStep.clean(workspace, packageManager, rootDirectory);
  }
}
