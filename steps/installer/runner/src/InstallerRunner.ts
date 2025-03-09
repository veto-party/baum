
import type { IExecutablePackageManager, IStep, IWorkspace } from "@veto-party/baum__core";
import type { IFeature } from "@veto-party/baum__steps__installer__features__afeature";
import { ISearchStrategy } from "./search/ISearchStrategy.js";
import { readFile } from 'fs/promises';

export class InstallerRunner implements IStep {

    private features: IFeature[] = [];

    private searchStrategy: ISearchStrategy|undefined;

    public register(feature: IFeature) {
        this.features.push(feature);
    }

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
            for (const feature of this.features) {
                feature.verifyObject(fileContent);
            }

            metadatas.push([file.substring(workspace.getDirectory().length), fileContent]);
        }

        metadatas.sort(([a], [b]) => a.localeCompare(b));

        const metadata = metadatas.unshift();

        for (const feature of this.features) {
            feature.ingestObject({ 
                root: {
                    children: metadatas.map(([metadata]) => metadata),
                    feature: metadata
                },
                ...Object.fromEntries(metadatas.map(([key, metadata]) => [key, {
                    children: [],
                    feature: metadata
                }] as const))
            })
        }
    }

    async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

}