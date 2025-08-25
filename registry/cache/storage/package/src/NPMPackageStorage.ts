import { buffer } from 'node:stream/consumers';
import { CachedFN } from '@veto-party/baum__core';
import type { IStorage } from '@veto-party/baum__registry__cache__base';
import { isEqual } from 'lodash-es';
import semver from 'semver';
import { NPMPackageGetter } from './access/NPMPackageGetter.js';
import { NPMPackageWriter } from './access/NPMPackageWriter.js';

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

  @CachedFN(true)
  public async resolveBase() {
    const { items } = await this.runGetter(async (data) => data);
    return items;
  }

  async resolve(key: string): Promise<any | undefined> {
    const items = await this.resolveBase();

    if (!items) {
      return undefined;
    }

    return items[key];
  }

  private async runGetter(modifier: (data: any, key: string) => Promise<any>) {
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
        read.on('entry', async (header, stream, next) => {
          const modifierKey = header.name.startsWith('package/metadata/') && header.name.endsWith('.json') ? header.name.substring('package/metadata/'.length, header.name.length - '.json'.length) : undefined;

          if (modifierKey) {
            try {
              items[modifierKey] = JSON.parse((await buffer(stream)).toString());
            } catch {
              items[modifierKey] = undefined;
            }
          }

          if (modifierKey) {
            items[modifierKey] = await modifier(items[modifierKey], modifierKey);
          }

          next();
        });

        read.on('finish', () => resolve());
        start();
      });
    }

    return { items, latest };
  }

  private async getModifiedRecordAndVersion(): Promise<[elements: Record<string, any>, version: string | undefined]> {
    const { items, latest } = await this.runGetter(async (data, key) => {
      if (!(key in this.modifiers)) {
        return data;
      }

      for (const modifier of this.modifiers[key] ?? []) {
        if (typeof modifier === 'function') {
          data = await modifier(data);
          continue;
        }

        data = modifier;
      }

      return data;
    });

    const missingKeys = Object.keys(this.modifiers).filter((e) => !(e in items));

    for (const missingKey of missingKeys) {
      items[missingKey] = undefined;

      for (const modifier of this.modifiers[missingKey] ?? []) {
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

    const oldState = await this.resolveBase();

    if (isEqual(oldState, items)) {
      return;
    }

    let newLatest = resolvedVersion;

    if (newLatest) {
      newLatest = semver.inc(newLatest, 'patch') ?? undefined;
    }

    newLatest ??= '0.0.0';

    const writer = this.createPackageWriter();

    await writer.flushPackageWithMetadata(this.packageName, newLatest, Object.fromEntries(Object.entries(items).map(([key, value]) => [`package/metadata/${key}.json`, Buffer.from(JSON.stringify(value))])));
  }
}
