import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import type { IWorkspace } from '@veto-party/baum__core';
import { extractVariables } from '../../utility/extractVariables.js';
import { toHelmPathWithPossibleIndex } from '../../utility/toHelmPathWithPossibleIndex.js';
import type { ConfigMapping, IConfigMapNameProvider, IConfigMapRenderer, IConfigMapRendererResult, IConfigMapStructure } from '../interface/factory/IConfigMapRenderer.js';
import { RawToken } from '../yaml/implementation/RawToken.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

export class ConfigMapRenderer implements IConfigMapRenderer {
  public constructor(private nameProvider: IConfigMapNameProvider) {}

  async render(workspace: IWorkspace | undefined, map: Map<IWorkspace | undefined, IConfigMapStructure>, binding: Map<string, string> | undefined, name?: string): Promise<IConfigMapRendererResult> {
    const allItems = new Map(Array.from(extractVariables(workspace, map, binding).entries()).filter(([, value]) => !value.secret));

    const structName = await this.nameProvider.getNameFor(workspace, name);
    const globalStructName = await this.nameProvider.getNameFor(undefined, name);

    const yaml = () => ({
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: structName
      },
      data: Object.fromEntries(
        Array.from(allItems.entries())
          .filter(([, value]) => !value.static)
          .map(([key, value]) => [key, new RawToken(`{{ .${toHelmPathWithPossibleIndex(['Values', value.type === 'global' ? 'global' : undefined, value.source].filter(Boolean).join('.'))} | quote }}`)])
      )
    });

    return {
      getResolvedWorkspaceVars: () => {
        return new Map(
          Array.from(allItems.entries()).map(([key, value]) => {
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
                    store: value.type === 'global' ? globalStructName : structName,
                    recreate: value.maintainValueBetweenVersions ?? false
                  }) satisfies ConfigMapping
            ] as const;
          })
        );
      },
      getValues: () => {
        return new Map(
          Array.from(allItems.entries())
            .filter(([, value]) => !value.static)
            .map(([, value]) => [value.source, value.default] as const)
        );
      },
      write: async (root, resolver) => {
        const path = await resolver.getNameByWorkspace(workspace);
        const filepath = Path.join(...[root, 'helm', path, 'templates'].filter(<T>(value: T | undefined): value is T => Boolean(value)));

        const resultingYAML = yaml();

        if (Object.keys(resultingYAML.data).length === 0) {
          return;
        }

        await FileSystem.mkdir(filepath, { recursive: true });
        await FileSystem.writeFile(Path.join(filepath, 'configmap.yaml'), to_structured_data(resultingYAML).write());
      }
    };
  }
}
