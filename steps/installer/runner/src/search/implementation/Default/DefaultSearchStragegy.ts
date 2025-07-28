import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import { globby } from 'globby';
import type { ISearchStrategy, ISearchStrategyResult } from '../../ISearchStrategy.js';

export class DefaultSearchStrategy implements ISearchStrategy {
  async search(base_dir: string): Promise<ISearchStrategyResult[]> {
    const possibleFiles = await globby('**/baum.veto.json', {
      cwd: base_dir,
      followSymbolicLinks: true,
      gitignore: false,
      onlyFiles: true
    });

    const fileResults = await Promise.all(possibleFiles.map(async (file) => [file, Path.join(Path.dirname(file), 'package.json'), await (await FileSystem.stat(Path.join(Path.dirname(file), 'package.json'))).isFile()] as const));

    return fileResults
      .filter(([_helmPath, _packageJsonPath, hasPackageJSON]) => hasPackageJSON)
      .map(([helmPath, packageJsonPath]) => ({
        packagePath: packageJsonPath,
        resultPath: helmPath
      }));
  }
}
