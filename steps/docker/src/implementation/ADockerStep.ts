import { CommandStep, type IPackageManager, type IWorkspace } from '@veto-party/baum__core';

export class ADockerStep extends CommandStep {
  constructor(subCommand: string | ((workspace: IWorkspace, pm: IPackageManager, root: string) => string), cwd: string, processValidation: (code: number | null) => boolean = (code) => code === 0) {
    super(typeof subCommand === 'function' ? (workspace, pm, root) => `docker ${subCommand(workspace, pm, root)}` : `docker ${subCommand}`, cwd, processValidation);
  }
}
