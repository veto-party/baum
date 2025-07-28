import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GenericWorkspace, type IWorkspace } from '@veto-party/baum__core';
import { describe, expect, it } from 'vitest';
import { TraefikExposeRenderer } from '../../../../../../../../src/implementation/helm/implementation/Expose/TraefikExposeRenderer.js';
import type { ExposeStructure } from '../../../../../../../../src/implementation/helm/interface/factory/IExposeRenderer.js';
import type { IWritable } from '../../../../../../../../src/implementation/helm/interface/IWritable.js';
import type { INameProvider } from '../../../../../../../../src/interface/INameProvider.js';
import { compareDirectories } from '../../../../../../../uility/compareDirectories.js';

const __dirname = resolve(dirname(fileURLToPath(import.meta.url)));
const actualDir = join(__dirname, 'actual');
const expectedDir = join(__dirname, 'expected');

const renderer = new TraefikExposeRenderer('pull-secret');

describe('A traefik expose renderer test', () => {
  const writers: IWritable[] = [];

  const createWorkspace = (name: string) =>
    new GenericWorkspace(
      __dirname,
      {
        name
      },
      () => false
    );

  const workspace = createWorkspace('some-package');
  const corsWorkspace = createWorkspace('some-package-with-cors');
  const workspace3 = createWorkspace('some-package-3');
  const workspace4 = createWorkspace('some-package-4');

  it('Should produce a file (scoped/workspace)', async () => {
    const result = await renderer.render(
      workspace,
      new Map([
        [8080, { type: 'load-balancer' }],
        [3000, { type: 'internal' }]
      ])
    );

    writers.push(result);
  });

  it('Should produce a file (scoped/workspace + cors)', async () => {
    const result = renderer.render(
      corsWorkspace,
      new Map([
        [8080, { type: 'load-balancer', matcher: { domain: 'some', domainIsAbsolute: false, path: undefined }, cors: { self: true, methods: ['GET', 'POST'], origins: [{ domain: 'baum' }] } } satisfies ExposeStructure],
        [3000, { type: 'internal' } satisfies ExposeStructure]
      ])
    );

    writers.push(result);
  });

  it('Should produce a file (scoped/workspace + cors)', async () => {
    const result = renderer.render(
      corsWorkspace,
      new Map([
        [8080, { type: 'load-balancer', matcher: { domain: 'some', domainIsAbsolute: false, path: undefined }, cors: { self: true, methods: ['GET', 'POST'], origins: [{ domain: 'baum' }] } } satisfies ExposeStructure],
        [3000, { type: 'internal' } satisfies ExposeStructure]
      ])
    );

    writers.push(result);
  });

  it('Should produce a file (scoped/workspace + appendPath)', async () => {
    const result = renderer.render(
      workspace3,
      new Map([
        [8080, { type: 'load-balancer', appendPath: '/test/' } satisfies ExposeStructure],
        [3000, { type: 'internal' } satisfies ExposeStructure]
      ])
    );

    writers.push(result);
  });

  it('Should produce a file (scoped/workspace + path matcher)', async () => {
    const result = renderer.render(
      workspace4,
      new Map([
        [8080, { type: 'load-balancer', matcher: { domain: 'some', domainIsAbsolute: false, path: '/' } } satisfies ExposeStructure],
        [3000, { type: 'internal' } satisfies ExposeStructure]
      ])
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
