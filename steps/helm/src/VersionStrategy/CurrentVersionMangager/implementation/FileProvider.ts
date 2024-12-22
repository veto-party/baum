import { ICurrentVersionManager } from "../ICurrentVersionManager.js";
import FileSystem from 'node:fs/promises';
import { join } from 'node:path';

export class CurrentVersionFileProvider implements ICurrentVersionManager {

  constructor(
    private root: string
  ) {
    
  }

  public async getCurrentVersionFor(name: string): Promise<string|undefined> {
    const filePath = join(this.root, 'versions', `${name}.json`);
    try {
    const content = await FileSystem.readFile(filePath);
    return JSON.parse(content.toString())?.version;
    } catch (error) {
        return undefined;
    }
  }

  private newVersions: Record<string, string> = {};

  public async updateCurrentVersionFor(name: string, version: string): Promise<void> {
    this.newVersions[name] = version;
  }

  private async flushVersion(name: string, version: string) {
    const filePath = join(this.root, 'versions', `${name}.json`);

    try {
      await FileSystem.writeFile(filePath, JSON.stringify({
        version
      }));
    } catch (error) {
      throw new Error(`Error updating version file for ${name}:`, {
        cause: error
      });
    }
  }
  
  public async flush() {
    await Promise.all(Object.entries(this.newVersions).map(async ([name, version]) => {
      await this.flushVersion(name, version);
    }));

    this.newVersions = {};
  }
}