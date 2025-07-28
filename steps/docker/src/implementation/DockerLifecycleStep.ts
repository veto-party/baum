import Crypto from 'node:crypto';
import type { IExecutablePackageManager, IStep, IWorkspace } from '@veto-party/baum__core';
import { DockerRunStep } from './DockerRunStep.js';
import { DockerStopStep } from './DockerStopStep.js';

type DockerRunProperties = {
  tag?: string;
  image: string;
  paramsForDocker?: string;
  paramsForContainer?: string;
};

export class DockerLifecycleStep implements IStep {
  private tag: string;

  private startStep: IStep;

  private stopStep: IStep;

  constructor(properties: DockerRunProperties, cwd: string, processValidation: (code: number | null) => boolean = (code) => code === 0) {
    this.tag =
      properties.tag ??
      Object.entries(properties)
        .map(([k, v]) => `${JSON.stringify(k)}-${JSON.stringify(v)}`)
        .reduce((prev, current) => prev.update(current), Crypto.createHash('sha256').update(cwd))
        .digest()
        .toString('hex');
    this.startStep = new DockerRunStep(`--name=${this.tag} ${properties.paramsForDocker ?? ''} ${properties.image} ${properties.paramsForContainer ?? ''}`, cwd, processValidation);
    this.stopStep = new DockerStopStep(`${this.tag}`, cwd, processValidation);
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    try {
      await this.startStep.execute(workspace, packageManager, rootDirectory);
    } catch (_error) {
      // If running from last time, make sure to try to stop old version.
      await this.stopStep.execute(workspace, packageManager, rootDirectory);
      await this.startStep.execute(workspace, packageManager, rootDirectory);
    }
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await this.stopStep.execute(workspace, packageManager, rootDirectory);
  }
}
