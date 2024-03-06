import { IStep, IWorkspace } from "../../index.js";
import { IExecutablePackageManager } from "../../interface/PackageManager/IExecutablePackageManager.js";
import shelljs from 'shelljs';
import Path from 'path';
import { boolean } from "zod";

const { exec } = shelljs;


class CommandStep implements IStep {

    constructor(
        private command: string,
        private cwdAddition: string | undefined,
        private processCodeValidation: (code: number | null) => boolean = (code) => code === 0
    ) { }

    execute(workspace: IWorkspace, __packageManager: IExecutablePackageManager, __rootDirectory: string): Promise<void> {

        return new Promise<void>((resolve, reject) => {
            const newProcess = exec(this.command, {
                async: true,
                cwd: this.cwdAddition ? Path.join(workspace.getDirectory(), this.cwdAddition) : workspace.getDirectory()
            });

            newProcess.addListener('close', (code) => {
                if (this.processCodeValidation(code)) {
                    resolve();
                    return;
                }

                console.error("process exited with code: ", code);
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