import { IBaumRegistrable, IExecutablePackageManager, IPackageManager, IStep, IWorkspace, PKGMStep } from "@veto-party/baum__core";
import { ICollection } from "../index.js";
import Path from 'path';
import FileSystem from 'fs/promises';
import semver from 'semver';
import { GroupCollection } from "./GroupCollection.js";
import { IVersionManager } from "../interface/IVersionManager.js";

export abstract class ARegistryStep implements IStep, IBaumRegistrable {

    private collection: ICollection = new GroupCollection([]);

    private oldFiles: Record<string, string> = {};

    constructor(
        protected VersionManagerClass: (workspaces: IWorkspace[]) => IVersionManager
    ) { }

    addExecutionStep(name: string, step: IStep): this {
        this.collection.addExecutionStep(name, step);
        return this;
    }

    abstract getPublishStep(): PKGMStep | undefined;

    modifyJSON?: (file: any) => any = undefined;

    protected async startExecution(workspace: IWorkspace, pm: IPackageManager, root: string) {
        const givenPath = Path.join(workspace.getDirectory(), 'package.json');
        const file = (await FileSystem.readFile(givenPath)).toString();

        this.oldFiles[`${workspace.getName()}-${workspace.getVersion()}`] = file;

        const jsonFile = JSON.parse(file);

        const manager = this.VersionManagerClass(await pm.readWorkspace(root));

        Object.entries((jsonFile.dependencies ?? {}) as Record<string, string>).forEach(([k, v]) => {
            jsonFile.dependencies[k] = manager.getLatestVersionFor(k, v) ?? jsonFile.dependencies[k];
        });

        Object.entries((jsonFile.devDependencies ?? {}) as Record<string, string>).forEach(([k, v]) => {
            jsonFile.devDependencies[k] = manager.getLatestVersionFor(k, v) ?? jsonFile.devDependencies[k];
        });

        Object.entries((jsonFile.peerDependencies ?? {}) as Record<string, string>).forEach(([k, v]) => {
            jsonFile.peerDependencies[k] = manager.getLatestVersionFor(k, v) ?? jsonFile.peerDependencies[k];
        });

        Object.entries((jsonFile.optionalDependencies ?? {}) as Record<string, string>).forEach(([k, v]) => {
            jsonFile.optionalDependencies[k] = manager.getLatestVersionFor(k, v) ?? jsonFile.optionalDependencies[k];
        });

        await this.modifyJSON?.(jsonFile);

        await FileSystem.writeFile(givenPath, JSON.stringify(jsonFile));
    }

    async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        await this.startExecution(workspace, packageManager, rootDirectory);
        await this.collection.execute(workspace, packageManager, rootDirectory);
        await this.getPublishStep()?.execute(workspace, packageManager, rootDirectory);
        await this.doClean(workspace);
    }

    protected async doClean(workspace: IWorkspace) {
        const givenPath = Path.join(workspace.getDirectory(), 'package.json');
        const oldFile = this.oldFiles[`${workspace.getName()}-${workspace.getVersion()}`];

        if (oldFile) {
            await FileSystem.writeFile(givenPath, oldFile);
        }

        delete this.oldFiles[`${workspace.getName()}-${workspace.getVersion()}`];
    }

    async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        try {
            await this.doClean(workspace);
        } finally {
            await this.collection.clean(workspace, packageManager, rootDirectory);
        }
    }
}