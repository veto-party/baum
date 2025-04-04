import { describe, expect, it } from 'vitest';

import { GenericWorkspace, type IWorkspace } from '@veto-party/baum__core';
import type { IWritable } from '../../../../../../../src/implementation/helm/interface/IWritable.js';

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ThirdPartyRenderer } from '../../../../../../../src/implementation/helm/implementation/ThirdPartyRenderer.js';
import type { ThirdPartyRendererStorage } from '../../../../../../../src/implementation/helm/interface/factory/I3rdPartyRenderer.js';
import type { INameProvider } from '../../../../../../../src/interface/INameProvider.js';

const __dirname = resolve(dirname(fileURLToPath(import.meta.url)));
const actualDir = join(__dirname, 'actual');
const expectedDir = join(__dirname, 'expected');

const renderer = new ThirdPartyRenderer();

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
    const result = await renderer.render(
      undefined,
      new Map([
        ['global', { type: 'global', properties: { test: 'foo', example: 1234, debug: true, object: { test: true } }, definition: { origin: { name: 'some-global-service', repository: 'https://global.veto.dev', version: '1.0.1' } }, origin_name_var: 'some.name_var_2' } satisfies ThirdPartyRendererStorage],
        ['scoped', { type: 'scoped', definition: { origin: { name: 'some-service', repository: 'https://veto.dev', version: '0.0.0' } }, origin_name_var: 'origin.name_var' } satisfies ThirdPartyRendererStorage]
      ])
    );

    const configMap = await result.getConfigMap(
      new (class implements INameProvider {
        getNameByWorkspace(workspace: IWorkspace | undefined): string | Promise<string> {
          if (!workspace) {
            return 'main';
          }

          return workspace.getName();
        }
      })()
    );

    expect(configMap.get('global.some.name_var_2')).toEqual('global');
    expect(configMap.get('scoped.origin.name_var')).toEqual('scoped');
    expect(configMap.get('global.test')).toEqual('foo');
    expect(configMap.get('global.example')).toEqual(1234);
    expect(configMap.get('global.debug')).toEqual(true);
    expect(configMap.get('global.object')).toEqual({ test: true });

    writers.push(result);
  });

  it('Should produce a file (scoped/workspace)', async () => {
    const result = await renderer.render(
      workspace,
      new Map([
        ['global', { type: 'global', properties: { test: 'foo', example: 1234, debug: true, object: { test: true } }, definition: { origin: { name: 'some-global-service', repository: 'https://global.veto.dev', version: '1.0.1' } }, origin_name_var: 'some.name_var_2' } satisfies ThirdPartyRendererStorage],
        ['scoped', { type: 'scoped', definition: { origin: { name: 'some-service', repository: 'https://veto.dev', version: '0.0.0' } }, origin_name_var: 'origin.name_var' } satisfies ThirdPartyRendererStorage]
      ])
    );

    const configMap = await result.getConfigMap(
      new (class implements INameProvider {
        getNameByWorkspace(workspace: IWorkspace | undefined): string | Promise<string> {
          if (!workspace) {
            return 'main';
          }

          return workspace.getName();
        }
      })()
    );

    expect(configMap.get('some-package.global.some.name_var_2')).toEqual('global');
    expect(configMap.get('some-package.scoped.origin.name_var')).toEqual('scoped');
    expect(configMap.get('some-package.global.test')).toEqual('foo');
    expect(configMap.get('some-package.global.example')).toEqual(1234);
    expect(configMap.get('some-package.global.debug')).toEqual(true);
    expect(configMap.get('some-package.global.object')).toEqual({ test: true });

    writers.push(result);
  });
});
