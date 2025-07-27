import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GenericWorkspace, type IWorkspace } from '@veto-party/baum__core';
import { describe, expect, it } from 'vitest';
import { ChartRenderer } from '../../../../../../../src/implementation/helm/implementation/ChartRenderer.js';
import type { IWritable } from '../../../../../../../src/implementation/helm/interface/IWritable.js';
import type { INameProvider } from '../../../../../../../src/interface/INameProvider.js';
import type { IHelmVersionInfoProvider } from '../../../../../../../src/interface/IVersionProvider.js';
import { compareDirectories } from '../../../../../../uility/compareDirectories.js';

const __dirname = resolve(dirname(fileURLToPath(import.meta.url)));
const actualDir = join(__dirname, 'actual');
const expectedDir = join(__dirname, 'expected');

const chartRenderer = new ChartRenderer(
  new (class implements IHelmVersionInfoProvider {
    getProjectVersion(): string | Promise<string> {
      return '0.0.0';
    }

    getVersionForWorkspace(_workspace: IWorkspace): string | Promise<string> {
      return '1.0.1';
    }
  })()
);

describe('A chart renderer test', () => {
  const writers: IWritable[] = [];

  const workspace = new GenericWorkspace(
    __dirname,
    {
      name: 'some-package'
    },
    () => false
  );

  it('Should produce a file (global)', async () => {
    writers.push(await chartRenderer.renderGlobal([workspace], new Map()));
  });

  it('Should produce a file (scoped/workspace)', async () => {
    writers.push(await chartRenderer.render(workspace, new Map()));
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
