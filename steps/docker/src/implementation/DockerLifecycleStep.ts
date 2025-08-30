import type { IExecutablePackageManager, IStep, IWorkspace } from '@veto-party/baum__core';
import { DockerRunStep } from './DockerRunStep.js';
import { DockerStopStep } from './DockerStopStep.js';

export class DockerLifecycleStep implements IStep {
  private startStep: IStep;

  private stopStep: IStep | undefined;

  constructor(image: string, cmd?: string[], doStop = true) {
    this.startStep = new DockerRunStep(image, cmd);
    this.stopStep = doStop ? new DockerStopStep(image) : undefined;
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    try {
      await this.startStep.execute(workspace, packageManager, rootDirectory);
    } catch (_error) {
      // If running from last time, make sure to try to stop old version.
      await this.stopStep?.execute?.(workspace, packageManager, rootDirectory);
      await this.startStep.execute(workspace, packageManager, rootDirectory);
    }
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await this.stopStep?.execute?.(workspace, packageManager, rootDirectory);
  }
}
