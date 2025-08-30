import type { IExecutablePackageManager, IWorkspace } from '@veto-party/baum__core';
import { ADockerStep } from './ADockerStep.js';

export class DockerStopStep extends ADockerStep {
  constructor(image: string) {
    super(async (docker, _, root) => {
      await docker.getContainer(ADockerStep.getContainerName(root, image)).stop();
    });
  }

  async clean(_workspace: IWorkspace, _packageManager: IExecutablePackageManager, _rootDirectory: string): Promise<void> {
    // NO-OP
  }
}
