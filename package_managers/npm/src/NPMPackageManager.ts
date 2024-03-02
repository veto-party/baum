import FileSystem from 'fs/promises';
import OldFileSystem from 'fs';
import Path from 'path';
import { Stream } from "stream";
import { globby } from 'globby';
import { IPackageManager, IWorkspace } from '@veto-party/baum__core';
import { NPMWorkspace } from './NPMWorkspace.js';
import { spawn } from 'child_process';

export class NPMPackageManager implements IPackageManager {

    async getCleanLockFile(rootDirectory: string): Promise<Parameters<typeof FileSystem['writeFile']>[1]> {
        const file = await FileSystem.readFile(Path.join(rootDirectory, 'package-lock.json'));
        const content = file.toString();
        const parser = JSON.parse(content);

        delete parser['packages'][""]['workspaces'];
        Object.entries(parser['packages']).forEach(([k, v]: [string, any]) => {
            if (!k.startsWith("node_modules") || v['link']) {
                delete parser['packages'][k];
            }
        });

        return JSON.stringify(parser);
    }

    getLockFileName(): string {
        return "package-lock.json";
    }

    private async checkCopy(rootDirectory: string, reversed: boolean): Promise<void> {

        let paths = [Path.join(rootDirectory, 'package.json'), Path.join(rootDirectory, 'package.json-bak')] as const;

        if (reversed) {
            paths = paths.toReversed() as [string, string];
        }


        if (OldFileSystem.existsSync(paths[1])) {
            await FileSystem.rm(paths[1]);
        }


        await FileSystem.copyFile(...paths);
    }

    async disableGlobalWorkspace(rootDirectory: string) {
        await this.checkCopy(rootDirectory, false);
    }

    async enableGlobalWorkspace(rootDirectory: string) {
        await this.checkCopy(rootDirectory, true);

    }

    private async parseWorkspaces(workspacePaths: string[], cwd: string): Promise<IWorkspace[]> {
        const resolvedPaths = await Promise.all(workspacePaths.map((path) => globby(path, { cwd, absolute: true })));
        return await Promise.all(resolvedPaths.flat().filter((file) => file.endsWith('package.json')).map((file) => Path.dirname(file)).map<Promise<IWorkspace>>(async (path) => {

            const packageJsonFile = await FileSystem.readFile(Path.join(path, 'package.json'));
            const packageJson = JSON.parse(packageJsonFile.toString());

            return new NPMWorkspace(path, packageJson);
        }));
    }

    async readWorkspace(rootDirectory: string) {
        const file = await FileSystem.readFile(Path.join(rootDirectory, 'package.json'));
        const content = JSON.parse(file.toString());

        const workspaces = content.workspaces ?? [];

        if (Array.isArray(content.workspaces)) {
            return this.parseWorkspaces(workspaces, rootDirectory);
        } else {
            return this.parseWorkspaces(workspaces.packages, rootDirectory);
        }
    }

    private doSpawn(cwd: string, command: string) {
        const cp = spawn(command, { cwd });

        return new Promise<void>((resolve, reject) => {
            cp.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }

                reject(code);
            });
        });
    }


    async executeScript(cwd: string, task: string): Promise<void> {
        await this.doSpawn(cwd, `npm run ${task}`);
    }

    async publish(cwd: string, registry?: string | undefined): Promise<void> {
        if (registry) {
            await this.doSpawn(cwd, `npm publish --registry=${registry}`);
        }

        await this.doSpawn(cwd, 'npm publish');
    }
}
