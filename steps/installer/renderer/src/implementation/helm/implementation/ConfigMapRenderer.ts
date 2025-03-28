import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import type { IWorkspace } from '@veto-party/baum__core';
import { extractVariables } from '../../utility/extractVariables.js';
import { toHelmPathWithPossibleIndex } from '../../utility/toHelmPathWithPossibleIndex.js';
import type { ConfigMapping, IConfigMapRenderer, IConfigMapRendererResult, IConfigMapStructure } from '../interface/IConfigMapRenderer.js';
import { RawToken } from '../yaml/implementation/RawToken.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

export class ConfigMapRenderer implements IConfigMapRenderer {
  render(workspace: IWorkspace | undefined, map: Map<IWorkspace | undefined, IConfigMapStructure>, binding: Map<string, string> | undefined, name: string): IConfigMapRendererResult | Promise<IConfigMapRendererResult> {
    const allItems = new Map(
      extractVariables(workspace, map, binding)
        .entries()
        .filter(([, value]) => value.secret === false)
    );

    const yaml = (name: string) => ({
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: `${name}-vars`
      },
      data: Object.fromEntries(
        allItems
          .entries()
          .filter(([, value]) => !value.static)
          .map(([key, value]) => [key, new RawToken(`{{ .${toHelmPathWithPossibleIndex(['Values', value.type === 'global' ? 'global' : undefined, value.source].filter(Boolean).join('.'))} | quote }}`)])
      )
    });

    return {
      getResolvedWorkspaceVars: () => {
        return new Map(
          allItems.entries().map(([key, value]) => {
            return [
              key,
              (value.static === true
                ? {
                    type: 'variable',
                    store: undefined,
                    variable: value.default
                  }
                : {
                    type: 'variable',
                    key: value.source,
                    global: value.type === 'global',
                    store: value.type === 'global' ? 'global' : undefined,
                    recreate: value.maintainValueBetweenVersions ?? false
                  }) satisfies ConfigMapping
            ] as const;
          })
        );
      },
      getValues: () => {
        return new Map(
          allItems
            .entries()
            .filter(([, value]) => !value.static)
            .map(([, value]) => [value.source, value.default] as const)
        );
      },
      write: async (root, resolver) => {
        const path = await resolver.getNameByWorkspace(workspace);
        const filepath = Path.join(...[root, 'helm', path, 'templates'].filter(<T>(value: T | undefined): value is T => Boolean(value)));

        await FileSystem.writeFile(Path.join(filepath, 'configmap.yaml'), to_structured_data(yaml(path)).write());
      }
    };
  }
}
