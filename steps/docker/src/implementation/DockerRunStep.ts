import type { IExecutablePackageManager, IWorkspace } from '@veto-party/baum__core';
import { ADockerStep } from './ADockerStep.js';

export class DockerRunStep extends ADockerStep {
  constructor(image: string, cmd?: string[]) {
    super(async (docker, workspace, root) => {
      await docker.pull(image, {});
      const name = ADockerStep.getContainerName(root, image);
      const container = await docker.createContainer({
        Image: image,
        AttachStdin: false,
        AttachStderr: false,
        AttachStdout: false,
        Tty: true,
        StdinOnce: false,
        OpenStdin: false,
        name,
        Cmd: cmd
      });
      await container.start();
    });
  }

  async clean(_workspace: IWorkspace, _packageManager: IExecutablePackageManager, _rootDirectory: string): Promise<void> {
    // NO-OP
  }
}
