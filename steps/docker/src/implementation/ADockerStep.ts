import Crypto from 'node:crypto';
import Dockerode from 'dockerode';
import { type IStep, type IWorkspace, type IExecutablePackageManager, CachedFN } from '@veto-party/baum__core';

export abstract class ADockerStep implements IStep {
  public constructor(private callback: (given: Dockerode, workspace: IWorkspace, root: string) => Promise<any>) {
  }

  @CachedFN(false)
  public static getInstance() {
    return new Dockerode();
  }

  public static getContainerName(root: string, image: string): string {
    return [image, root]
        .map((k) => JSON.stringify(k))
        .reduce((prev, current) => prev.update(current), Crypto.createHash('sha256'))
        .digest()
        .toString('hex');
  }

  abstract clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void>;

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await this.callback(ADockerStep.getInstance(), workspace, rootDirectory);
  }
}
