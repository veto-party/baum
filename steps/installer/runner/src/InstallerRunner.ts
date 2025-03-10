
import type { IExecutablePackageManager, IStep, IWorkspace } from "@veto-party/baum__core";
import { BaseInstaller } from "@veto-party/baum__steps__installer__features__afeature";
import { ISearchStrategy } from "./search/ISearchStrategy.js";
import { readFile } from 'fs/promises';

export class InstallerRunner implements IStep {

    constructor(
        private installer: ReturnType<typeof BaseInstaller.makeInstance> = BaseInstaller.makeInstance()
    ) {

    }

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


        this.installer.ingestObject({
            root: {
                children: metadatas.map(([metadata]) => metadata),
                fe3ature: metadata
            },
            ...Object.fromEntries(metadatas.map(([key, metadata]) => [key, {
                children: [],
                feature: metadata
            }] as const))
        });


        this.installer.

    }

    async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    }

}