import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GenericWorkspace, type IWorkspace } from '@veto-party/baum__core';
import { describe, expect, it } from 'vitest';
import { ConfigMapRenderer } from '../../../../../../../src/implementation/helm/implementation/ConfigMapRenderer.js';
import type { IConfigMapNameProvider } from '../../../../../../../src/implementation/helm/interface/factory/IConfigMapRenderer.js';
import type { IWritable } from '../../../../../../../src/implementation/helm/interface/IWritable.js';
import type { INameProvider } from '../../../../../../../src/interface/INameProvider.js';
import { compareDirectories } from '../../../../../../uility/compareDirectories.js';

const __dirname = resolve(dirname(fileURLToPath(import.meta.url)));
const actualDir = join(__dirname, 'actual');
const expectedDir = join(__dirname, 'expected');

const chartRenderer = new ConfigMapRenderer(
  new (class implements IConfigMapNameProvider {
    getNameFor(workspace: IWorkspace | undefined, name?: string): string | Promise<string> {
      return [workspace?.getName() ?? 'global', name].filter(Boolean).join('-');
    }
  })()
);

describe('A configmap renderer test', () => {
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
      new Map([
        [
          undefined,
          new Map([
            ['hello', { type: 'global', default: 'ehllo' }],
            ['unused', { type: 'global', default: 'should not be present!' }]
          ])
        ]
      ]),
      new Map([['world', 'hello']])
    );

    writers.push(result);
  });

  it('Should produce a file (scoped/workspace)', async () => {
    const result = await chartRenderer.render(
      workspace,
      new Map([
        [
          workspace,
          new Map([
            ['hello2', { type: 'scoped', default: 'ehllo' }],
            ['unused2', { type: 'scoped', default: 'should not be present!' }]
          ])
        ]
      ]),
      new Map([['world2', 'hello2']])
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
