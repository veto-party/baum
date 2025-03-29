import type { IWorkspace } from '@veto-party/baum__core';
import type { ExposeStructure } from './IExposeRenderer.js';
import type { IWritable } from '../IWritable.js';

export interface IServiceRendererResult extends IWritable {}

export interface IServiceRenderer {
  render(workspace: IWorkspace, portsMap: Map<string | number, ExposeStructure> | undefined): IServiceRendererResult | Promise<IServiceRendererResult>;
}
