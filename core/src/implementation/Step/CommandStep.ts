import Path from 'path';
import shelljs from 'shelljs';
import { IStep, IWorkspace } from '../../index.js';
import { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';

const { exec } = shelljs;

class CommandStep implements IStep {
  constructor(
    private command: string,
    private cwdAddition: string | undefined,
    private processCodeValidation: (code: number | null) => boolean = (code) => code === 0
  ) {}

  protected getCleanEnv() {
    const current = {
      ...process.env
    };

    delete current.PWD;
    delete current.NODE_ENV;
    delete current.NODE_OPTIONS;
    delete current.PNPM_SCRIPT_SRC_DIR;
    delete current.INIT_CWD;
    delete current.TS_NODE_PROJECT;
    delete current.npm_config_user_agent;

    return current;
  }

  execute(workspace: IWorkspace, __packageManager: IExecutablePackageManager, __rootDirectory: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      console.log(`Running command: ${JSON.stringify(this.command)} now!`);
      const newProcess = exec(this.command, {
        async: true,
        cwd: this.cwdAddition ? (Path.isAbsolute(this.cwdAddition) ? this.cwdAddition : Path.join(workspace.getDirectory(), this.cwdAddition)) : workspace.getDirectory(),
        env: this.getCleanEnv()
      });

      newProcess.addListener('close', (code) => {
        if (this.processCodeValidation(code)) {
          resolve();
          return;
        }

        console.error('process exited with code: ', code);
        reject(code);
      });
    });
  }

  clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    // NO-OP
    return Promise.resolve();
  }
}

export { CommandStep };
