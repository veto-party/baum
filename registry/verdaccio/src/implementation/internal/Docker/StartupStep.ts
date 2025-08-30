import { type IExecutablePackageManager, type IWorkspace, RunOnce } from '@veto-party/baum__core';
import { ADockerStep } from '@veto-party/baum__steps__docker/src/implementation/ADockerStep.js';
import type { Container } from 'dockerode';

@RunOnce()
export class StartupStep extends ADockerStep {
  private resolvedContainers: Container[] = [];

  public get containers(): Readonly<typeof this.resolvedContainers> {
    return this.resolvedContainers;
  }

  constructor(image: string, port: string) {
    super(async (docker, _, root) => {
      const name = ADockerStep.getContainerName(root, `internal/${image}`);
      let container = docker.getContainer(name);
      const givenImage = docker.getImage(ADockerStep.getContainerName(root, image));
      if ((await container.inspect().catch(() => undefined))?.Image !== givenImage.id) {
        try {
          await container.stop();
          await container.remove();
        } catch {}

        container = await docker.createContainer({
          Image: givenImage.id,
          Cmd: ['verdaccio', '--config /config.yaml --listen 0.0.0.0:4873'],
          AttachStdin: false,
          AttachStderr: false,
          AttachStdout: false,
          Tty: true,
          StdinOnce: false,
          OpenStdin: false,
          ExposedPorts: {
            '4873': port
          },
          name
        });
      }

      await container.start();
      await container.wait();
    });
  }

  async clean(_workspace: IWorkspace, _packageManager: IExecutablePackageManager, _rootDirectory: string) {
    throw new Error('Method not implemented.');
  }
}
