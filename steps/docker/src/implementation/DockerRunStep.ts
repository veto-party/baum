import type { IPackageManager, IWorkspace } from '@veto-party/baum__core';
import { ADockerStep } from './ADockerStep.js';

export class DockerRunStep extends ADockerStep {
  constructor(subCommand: string | ((workspace: IWorkspace, pm: IPackageManager, root: string) => string), cwd: string, processValidation: (code: number | null) => boolean = (code) => code === 0) {
    super(typeof subCommand === 'function' ? (workspace, pm, root) => `run ${subCommand(workspace, pm, root)}` : `run ${subCommand}`, cwd, processValidation);
  }
}
