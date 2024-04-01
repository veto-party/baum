import OS from 'node:os';
import Path from 'node:path';
import colors from 'colors';
import shelljs from 'shelljs';
import type { IPackageManager, IStep, IWorkspace } from '../../index.js';
import type { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';

const { exec } = shelljs;

class CommandStep implements IStep {
  constructor(
    private command: string | ((workspace: IWorkspace, pm: IPackageManager, root: string) => string),
    private cwdAddition: string | undefined,
    private processCodeValidation: (code: number | null) => boolean = (code) => code === 0
  ) {}

  private static colors = [colors.green, colors.yellow, colors.blue, colors.magenta, colors.cyan];

  private static colorIndex = 0;

  private static getColor() {
    if (CommandStep.colorIndex >= CommandStep.colors.length) {
      CommandStep.colorIndex = 0;
    }

    return CommandStep.colors[CommandStep.colorIndex++].bind(colors);
  }

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
    delete current.npm_command;
    delete current.npm_package_name;
    delete current.npm_package_json;

    const pathKeys = Object.keys(current).filter((key) => key.toLowerCase() === 'path');
    // TODO: Improve this (for solaris)? (if required)
    if (pathKeys.length > 0) {
      const environmentVarSeparator = OS.platform() === 'win32' ? ';' : ':';
      const basicPathSuffix = Path.join('node_modules', '.bin');
      const pathSuffixes = [basicPathSuffix.endsWith(Path.sep) ? basicPathSuffix.substring(0, basicPathSuffix.length - 1) : `${basicPathSuffix}${Path.sep}`, basicPathSuffix];
      pathKeys.forEach((key) => {
        current[key] = current[key]!.split(environmentVarSeparator)
          .filter((path) => !pathSuffixes.some((pathSuffix) => path.endsWith(pathSuffix)))
          .join(environmentVarSeparator);
      });
    }

    return current;
  }

  execute(workspace: IWorkspace, __packageManager: IExecutablePackageManager, __rootDirectory: string): Promise<void> {
    const color = CommandStep.getColor();

    return new Promise<void>((resolve, reject) => {
      const command = typeof this.command === 'function' ? this.command(workspace, __packageManager, __rootDirectory) : this.command;
      console.log(`Running command: ${JSON.stringify(command)}(${JSON.stringify(workspace.getName())}) now!`);
      const newProcess = exec(command, {
        async: true,
        cwd: this.cwdAddition ? (Path.isAbsolute(this.cwdAddition) ? this.cwdAddition : Path.join(workspace.getDirectory(), this.cwdAddition)) : workspace.getDirectory(),
        env: this.getCleanEnv(),
        silent: true
      });

      newProcess.stdout?.addListener('data', (datas: string) => {
        datas.split('\n').forEach((data) => {
          console.log(color(`(${JSON.stringify(workspace.getName())}): `), data);
        });
      });

      newProcess.stderr?.addListener('data', (datas: string) => {
        datas.split('\n').forEach((data) => {
          console.log(color(`(${JSON.stringify(workspace.getName())}): `), colors.red(data));
        });
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
