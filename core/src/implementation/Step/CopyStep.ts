import { IPackageManager, IStep, IWorkspace } from "../../index.js";
import Path from 'path';
import FileSystem from 'fs/promises';
import { globby } from 'globby';

export class CopyStep implements IStep {

    constructor(
        private from: string,
        private to: string | ((workspace: IWorkspace, filename: string) => string)
    ) { }

    private async doOrderFiles(workspace: IWorkspace, files: string[]) {
        await Promise.all(files.map(async (source) => {
            await FileSystem.cp(source, typeof this.to === "function" ? this.to(workspace, source) : this.to);
        }));
    }

    async execute(workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string): Promise<void> {
        if (this.from.includes("*")) {
            const files = await globby(this.from, {
                absolute: true,
                cwd: workspace.getDirectory()
            });

            await this.doOrderFiles(workspace, files);
            return;
        }

        const source = Path.join(workspace.getDirectory(), this.from);

        if ((await FileSystem.lstat(source)).isDirectory()) {
            await this.doOrderFiles(workspace, await globby(Path.join(source, '**', '*')));

            return;
        }

        await this.doOrderFiles(workspace, [source]);
    }

    async clean(workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string): Promise<void> {
        // NO-OP
    }

} 