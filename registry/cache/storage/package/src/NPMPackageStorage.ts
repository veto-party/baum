import type { IStorage } from "@veto-party/baum__registry__cache__base";
import { buffer } from 'node:stream/consumers';
import { NPMPackageGetter } from "./access/NPMPackageGetter.js";
import { NPMPackageWriter } from "./access/NPMPackageWriter.js";
import semver from "semver";

export class NPMPackageStorage implements IStorage {

    public constructor(
        private registry: string,
        private packageName: string,
        private token?: string
    ) {}

    private createPackageGetter() {
        return new NPMPackageGetter(this.registry, this.token);
    }

    private createPackageWriter() {
        return new NPMPackageWriter(this.registry, this.token);
    }

    private modifiers: Record<string, Parameters<IStorage['store']>[1][]> = {};
    
    async store(key: string, value: ((prev: any) => any | Promise<any>) | any) {
        this.modifiers[key] ??= [];
        this.modifiers[key].push(value);
    }

    private async getModifiedRecordAndVersion(): Promise<[elements: Record<string, any>, version: string|undefined]> {
        const getter = this.createPackageGetter();

        const items: Record<string, any> = {};

        const latest = await getter.getCurrentVersionFor(this.packageName);

        if (latest) {
            const result = await getter.fetchAndExtract(this.packageName, latest);
            if (!result) {
                throw new Error('Could not load package.');
            }
        
            const { read, start } = result;
        
            await new Promise<void>((resolve) => {

                for (const modifierKey in this.modifiers) {

                    read.on('entry', async (header, stream, next) => {
                        if (header.name === `package/metadata/${modifierKey}.json`) {
                            try {
                                items[modifierKey] = JSON.parse((await buffer(stream)).toString())
                            } catch {
                                items[modifierKey] = undefined;
                            }

                            for (const modifier of (this.modifiers[modifierKey] ?? [])) {
                                if (typeof modifier === 'function') {
                                     items[modifierKey] = await modifier(items[modifierKey]);
                                     continue;
                                }

                                items[modifierKey] = modifier;
                            }
                        }
        
                        next();
                    });
                }

                read.on('finish', () => resolve());
                start();
            });
        }


        const missingKeys = Object.keys(this.modifiers).filter((e) => !(e in items));

        for (const missingKey of missingKeys) {
            items[missingKey] = undefined;

            for (const modifier of (this.modifiers[missingKey] ?? [])) {
                if (typeof modifier === 'function') {
                    items[missingKey] = await modifier(items[missingKey]);
                    continue;
                }

                items[missingKey] = modifier;
            }
        }

        return [items, latest];
    }

    async flush(): Promise<any> {
        const [items, resolvedVersion] = await this.getModifiedRecordAndVersion();

        let newLatest = resolvedVersion;

        if (newLatest) {
            newLatest = semver.inc(newLatest, 'patch') ?? undefined;
        }

        newLatest ??= '0.0.0';

        const writer = this.createPackageWriter();

        await writer.flushPackageWithMetadata(
            this.packageName, 
            newLatest,
            Object.fromEntries(Object.entries(items).map(([key, value]) => [`package/metadata/${key}.json`, Buffer.from(JSON.stringify(value))]))
        );
    }
}