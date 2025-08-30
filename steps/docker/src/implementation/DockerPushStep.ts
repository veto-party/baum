import type { IExecutablePackageManager, IWorkspace } from '@veto-party/baum__core';
import { ADockerStep } from './ADockerStep.js';

export class DockerPushStep extends ADockerStep {
  constructor(private name: (string | Promise<string>) | ((workspace: IWorkspace, root: string) => string | Promise<string>)) {
    super(async (docker, workspace, root) => {
      await docker.getImage(await (typeof this.name === 'function' ? this.name(workspace, root) : this.name)).push();
    });
  }

  async clean(_workspace: IWorkspace, _packageManager: IExecutablePackageManager, _rootDirectory: string): Promise<void> {
    /** NO-OP */
  }
}
