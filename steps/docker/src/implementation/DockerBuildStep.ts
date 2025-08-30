import type { IExecutablePackageManager, IWorkspace } from '@veto-party/baum__core';
import { ADockerStep } from './ADockerStep.js';

export class DockerBuildStep extends ADockerStep {
  constructor(
    private file: (string|Promise<string>)|((workspace: IWorkspace, root: string) => string|Promise<string>),
    private name: (string|Promise<string>)|((workspace: IWorkspace, root: string) => string|Promise<string>),
    private buildArgs?: (Record<string, string>|Promise<Record<string, string>|undefined>)|((workspace: IWorkspace, root: string) => Record<string, string>|undefined|Promise<Record<string, string>|undefined>)
  ) {
    super(async (docker, workspace, root) => {
      await docker.buildImage(await (typeof this.file === 'function' ? this.file(workspace, root) : this.file),{
        target: await (typeof this.name === 'function' ? this.name(workspace, root) : this.name), 
        buildargs: await (typeof this.buildArgs === 'function' ? this.buildArgs(workspace, root) : this.buildArgs)
      } );
    })
  }

  async clean(_workspace: IWorkspace, _packageManager: IExecutablePackageManager, _rootDirectory: string): Promise<void> {
    /** NO-OP */
  }
}
