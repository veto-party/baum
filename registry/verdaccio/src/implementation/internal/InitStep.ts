import Crypto from 'node:crypto';
import { CachedFN, GroupStep, type IExecutablePackageManager, type IWorkspace } from '@veto-party/baum__core';
import portFinder from 'portfinder';
import { PrepareStep } from './Docker/PrepareStep.js';
import { StartupStep } from './Docker/StartupStep.js';

export class InitStep extends GroupStep {
  constructor(
    private address: string,
    private port?: number
  ) {
    super([]);
  }

  public async getPort() {
    const url = new URL(this.address);

    this.port ??= await portFinder.getPortPromise({
      host: url.host
    });

    return this.port;
  }

  @CachedFN(true, [false, false] as any)
  public async ensureStartup(hash?: string, port?: number) {
    if (hash === undefined || port === undefined) {
      throw new Error('Could not create startup step');
    }
    return new StartupStep(hash, (await port).toString());
  }

  @CachedFN(true)
  public async init(root: string) {
    const port = await this.getPort();

    const hash = Crypto.createHash('sha256').update(root).update(port.toString()).digest('hex');

    this.addExecutionStep('prepare', new PrepareStep(hash, root, `${this.address}:${port.toString()}`));
    this.addExecutionStep('startup', await this.ensureStartup(hash, port));
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, root: string): Promise<void> {
    await this.init(root);
    await super.execute(workspace, packageManager, root);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await super.clean(workspace, packageManager, rootDirectory);
  }
}
