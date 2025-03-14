
import type { IExecutablePackageManager, IStep, IWorkspace } from "@veto-party/baum__core";
import { type IRenderer } from '@veto-party/baum__steps__installer__renderer';
import { BaseInstaller, type IFeature } from "@veto-party/baum__steps__installer__features";
import type { ISearchStrategy } from "./search/ISearchStrategy.js";
import { readFile } from 'node:fs/promises';
import { FromSchema } from "json-schema-to-ts";

type EmtpyBaseInstallerType = BaseInstaller extends IFeature<infer Type, undefined, any> ? Type : never;

export class InstallerRunner<T extends EmtpyBaseInstallerType = ReturnType<typeof BaseInstaller.makeInstance> extends infer FullInstaller ? FullInstaller extends IFeature<infer U, undefined, any> ? U extends EmtpyBaseInstallerType ? U : never : never : never> implements IStep{

    constructor(
        private installer: IFeature<T, undefined, FromSchema<T>> = BaseInstaller.makeInstance() as any,
        private renderer: IRenderer<T>
    ) {}

    private searchStrategy: ISearchStrategy|undefined;


    public setSearchStrategy(strategy: ISearchStrategy) {
        this.searchStrategy = strategy;
    }

    async execute(workspace: IWorkspace, _packageManager: IExecutablePackageManager, _rootDirectory: string): Promise<void> {

        if (!this.searchStrategy) {
            throw new Error('No search stragety defined.');
        }

        const files = await this.searchStrategy.search(workspace.getDirectory());
        const metadatas: [string, any][] = [];

        for (const file of files) {
            const fileContent = JSON.parse((await readFile(file)).toString());
            this.installer.verifyObject(fileContent);

            metadatas.push([file.substring(workspace.getDirectory().length), fileContent]);
        }

        metadatas.sort(([a], [b]) => a.localeCompare(b));

        const metadata = metadatas.unshift();


        const result = this.installer.ingestObject({
            root: {
                children: metadatas.map(([metadata]) => metadata),
                feature: metadata
            },
            ...Object.fromEntries(metadatas.map(([key, metadata]) => [key, {
                children: [],
                feature: metadata
            }] as const))
        });

    }

    async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    }

}