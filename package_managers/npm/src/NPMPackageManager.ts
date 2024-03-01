import FileSystem from 'fs/promises';
import Path from 'path';
import { Stream } from "stream";
import { globby } from 'globby';
import { IPackageManager, IWorkspace } from '@veto-party/baum__core';
import { NPMWorkspace } from './NPMWorkspace.js';

export class NPMPackageManager implements IPackageManager {

    getCleanLockFile(): string | NodeJS.ArrayBufferView | Iterable<string | NodeJS.ArrayBufferView> | AsyncIterable<string | NodeJS.ArrayBufferView> | Stream {
        throw new Error("Method not implemented.");
    }

    getLockFileName(): string {
        // const file = await FileSystem.readFile(Path.join(rootDirectory, 'package-lock.json'));
        return "";
    }

    disableGlobalWorkspace() {
        throw new Error("Method not implemented.");
    }

    enableGlobalWorkspace() {
        throw new Error("Method not implemented.");
    }

    private async parseWorkspaces(workspacePaths: string[], cwd: string): Promise<IWorkspace[]> {
        const resolvedPaths = await Promise.all(workspacePaths.map((path) => globby(path, { cwd, absolute: true })));
        return await Promise.all(resolvedPaths.flat().map<Promise<IWorkspace>>(async (path) => {

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

    async disableWorkspaceConfig() {
        return () => { }
    }
}
