import type { IPackageManager, IWorkspace } from '@veto-party/baum__core';
import { ADockerStep } from './ADockerStep.js';

export class DockerStopStep extends ADockerStep {
  constructor(subCommand: string | ((workspace: IWorkspace, pm: IPackageManager, root: string) => string), cwd: string, processValidation: (code: number | null) => boolean = (code) => code === 0) {
    super(typeof subCommand === 'function' ? (workspace, pm, root) => `stop ${subCommand(workspace, pm, root)}` : `stop ${subCommand}`, cwd, processValidation);
  }
}
