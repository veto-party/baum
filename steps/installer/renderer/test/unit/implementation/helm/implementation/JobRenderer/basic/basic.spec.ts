import { describe, expect, it } from 'vitest';

import { GenericWorkspace, type IPackageManager, type IWorkspace } from '@veto-party/baum__core';
import type { IWritable } from '../../../../../../../src/implementation/helm/interface/IWritable.js';

import type { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JobRenderer } from '../../../../../../../src/implementation/helm/implementation/JobRenderer.js';
import type { IContainerName } from '../../../../../../../src/implementation/helm/interface/IContainerName.js';
import type { IImageGenerator } from '../../../../../../../src/implementation/helm/interface/IImageGenerator.js';
import type { IMatchLabel } from '../../../../../../../src/implementation/helm/interface/IMatchLabel.js';
import type { INameProvider } from '../../../../../../../src/interface/INameProvider.js';
import { compareDirectories } from '../../../../../../uility/compareDirectories.js';

const __dirname = resolve(dirname(fileURLToPath(import.meta.url)));
const actualDir = join(__dirname, 'actual');
const expectedDir = join(__dirname, 'expected');

const chartRenderer = new JobRenderer(
  new (class implements IPackageManager {
    async getCleanLockFile(rootDirectory: string, workspace: IWorkspace): Promise<Parameters<typeof writeFile>[1] | undefined> {
      throw new Error('Method not implemented.');
    }
    getLockFileName(): string {
      throw new Error('Method not implemented.');
    }
    async readWorkspace(rootDirectory: string): Promise<IWorkspace[]> {
      return [
        new GenericWorkspace(
          rootDirectory,
          {
            name: '@mockworkspace'
          },
          () => undefined
        )
      ];
    }
    disableGlobalWorkspace(rootDirectory: string): any {
      throw new Error('Method not implemented.');
    }
    enableGlobalWorkspace(rootDirectory: string): any {
      throw new Error('Method not implemented.');
    }
    modifyToRealVersionValue(version: string): string | false | undefined {
      throw new Error('Method not implemented.');
    }
  })(),
  './actual',
  'pull-secret',
  new (class implements IContainerName {
    getForContainer(name: string): string {
      return `container-${name}`;
    }

    getForJob(name: string, key: string): string {
      return `job-${name}-${key}`;
    }
  })(),
  new (class implements IMatchLabel {
    getForContainer(name: string): string {
      return `pod-${name}`;
    }

    getForJob(name: string): string {
      return `somejob-${name}`;
    }
  })()
);

describe('A job renderer test', () => {
  const writers: IWritable[] = [];

  const workspace = new GenericWorkspace(
    __dirname,
    {
      name: 'some-package'
    },
    () => false
  );

  it('Should produce a file (global)', async () => {
    const result = await chartRenderer.render(
      undefined,
      'key',
      {
        type: 'scoped',
        definition: {
          on: 'hello, workd',
          project: '@mockworkspace'
        }
      },
      new Map(),
      undefined,
      new (class implements IImageGenerator {
        generateImage(workspace: IWorkspace): { image: string } {
          return {
            image: `${workspace.getName()}-image`
          };
        }
      })()
    );

    writers.push(result);
  });

  it('Should produce a file (scoped/workspace)', async () => {
    const result = await chartRenderer.render(
      workspace,
      'key',
      {
        type: 'scoped',
        definition: {
          on: 'hello, workd',
          project: '@mockworkspace'
        }
      },
      new Map(),
      undefined,
      new (class implements IImageGenerator {
        generateImage(workspace: IWorkspace): { image: string } {
          return {
            image: `${workspace.getName()}-image`
          };
        }
      })()
    );

    writers.push(result);
  });

  it('Should write them to the file system and they should match the contents.', async () => {
    await Promise.all(
      writers.map((writer) =>
        writer.write(
          actualDir,
          new (class implements INameProvider {
            getNameByWorkspace(workspace: IWorkspace | undefined): string | Promise<string> {
              if (!workspace) {
                return 'main';
              }

              return workspace.getName();
            }
          })()
        )
      )
    );

    expect(await compareDirectories(actualDir, expectedDir)).toBeTruthy();
  });
});
