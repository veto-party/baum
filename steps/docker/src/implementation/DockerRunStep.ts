import Crypto from 'crypto';
import { IExecutablePackageManager, IStep, IWorkspace } from '@veto-party/baum__core';
import { ADockerStep } from './ADockerStep.js';

type DockerRunProperties = {
  tag?: string;
  image: string;
  paramsForDocker?: string;
  paramsForContainer?: string;
};

export class DockerRunStep implements IStep {
  private tag: string;

  private startStep: IStep;

  private stopSTep: IStep;

  constructor(properties: DockerRunProperties, cwd: string, processValidation: (code: number | null) => boolean = (code) => code === 0) {
    this.tag =
      properties.tag ??
      Object.entries(properties)
        .map(([k, v]) => `${JSON.stringify(k)}-${JSON.stringify(v)}`)
        .reduce((prev, current) => prev.update(current), Crypto.createHash('sha256').update(cwd))
        .digest()
        .toString('hex');
    this.startStep = new ADockerStep(`run --name=${this.tag} ${properties.paramsForDocker ?? ''} ${properties.image} ${properties.paramsForContainer ?? ''}`, cwd, processValidation);
    this.stopSTep = new ADockerStep(`stop ${this.tag}`, cwd, processValidation);
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await this.startStep.execute(workspace, packageManager, rootDirectory);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await this.stopSTep.execute(workspace, packageManager, rootDirectory);
  }
}
