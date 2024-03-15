import { RunOnce } from '@veto-party/baum__core';
import { DockerLifecycleStep } from '@veto-party/baum__steps__docker';

@RunOnce()
export class StartupStep extends DockerLifecycleStep {
  constructor(name: string, port: string, cwd: string) {
    super(
      {
        image: `internal/${name}`,
        paramsForDocker: `--rm -d -p ${port}:4873`,
        paramsForContainer: 'verdaccio --config /config.yaml --listen http://0.0.0.0:4873'
      },
      cwd
    );
  }
}
