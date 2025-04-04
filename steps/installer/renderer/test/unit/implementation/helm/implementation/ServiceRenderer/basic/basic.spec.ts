import { describe, expect, it } from 'vitest';

import { GenericWorkspace, type IWorkspace } from '@veto-party/baum__core';
import type { IWritable } from '../../../../../../../src/implementation/helm/interface/IWritable.js';

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ServiceRenderer } from '../../../../../../../src/implementation/helm/implementation/ServiceRenderer.js';
import type { IContainerName } from '../../../../../../../src/implementation/helm/interface/IContainerName.js';
import type { IDeploymentNameProvider } from '../../../../../../../src/implementation/helm/interface/IDeploymentNameProvider.js';
import type { IMatchLabel } from '../../../../../../../src/implementation/helm/interface/IMatchLabel.js';
import type { INameProvider } from '../../../../../../../src/interface/INameProvider.js';
import { compareDirectories } from '../../../../../../uility/compareDirectories.js';

const __dirname = resolve(dirname(fileURLToPath(import.meta.url)));
const actualDir = join(__dirname, 'actual');
const expectedDir = join(__dirname, 'expected');

const chartRenderer = new ServiceRenderer(
  new (class implements IContainerName {
    getForContainer(name: string): string {
      return `${name}-pod`;
    }

    getForJob(name: string, key: string): string {
      return `${name}-j-${key}-pod`;
    }
  })(),
  new (class implements IMatchLabel {
    getLabelForContainer(name: string): string {
      return `${name}-matcher`;
    }

    getLabelForJob(name: string, key: string): string {
      return `${name}-j-${key}-matcher`;
    }
  })(),
  new (class implements IDeploymentNameProvider {
    getName(name: string): string {
      return `${name}-depl`;
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

  it('Should produce a file (scoped/workspace)', async () => {
    const result = await chartRenderer.render(
      workspace,
      new Map([
        [8080, { type: 'load-balancer' }],
        [3000, { type: 'internal' }]
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
