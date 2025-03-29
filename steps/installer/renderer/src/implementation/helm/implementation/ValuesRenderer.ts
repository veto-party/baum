import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import type { IWorkspace } from '@veto-party/baum__core';
import { set } from 'lodash-es';
import type { IValuesRenderer, IValuesRendererResult } from '../interface/IValuesRenderer.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

export class ValuesRenderer implements IValuesRenderer {
  render(workspace: IWorkspace | undefined, dataMap: Map<string, any>): IValuesRendererResult | Promise<IValuesRendererResult> {
    const yaml = () => {
      const obj: any = {};

      dataMap.entries().forEach(([key, value]) => {
        set(obj, key, value);
      });

      return obj;
    };

    return {
      write: async (root, resolver) => {
        const path = await resolver.getNameByWorkspace(workspace);
        const filepath = Path.join(...[root, 'helm', path, 'templates'].filter(<T>(value: T | undefined): value is T => Boolean(value)));

        await FileSystem.mkdir(filepath, { recursive: true });
        await FileSystem.writeFile(Path.join(filepath, 'configmap.yaml'), to_structured_data(yaml()).write());
      }
    };
  }
}
