import type { IWorkspace } from '@veto-party/baum__core';
import type { IWritable } from '../IWritable.js';
import type { ExposeStructure } from './IExposeRenderer.js';

export interface IServiceRendererResult extends IWritable {}

export interface IServiceRenderer {
  render(workspace: IWorkspace, portsMap: Map<string | number, ExposeStructure> | undefined): IServiceRendererResult | Promise<IServiceRendererResult>;
}
