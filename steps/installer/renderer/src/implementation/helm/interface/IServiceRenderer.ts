import { IWorkspace } from "@veto-party/baum__core";
import { ConfigMapping } from "./IConfigMapRenderer.js";
import { SecretMapping } from "./ISecretRenderer.js";
import { IWritable } from "./IWritable.js";
import { ExposeStructure } from "./IExposeRenderer.js";

export interface IServiceRendererResult extends IWritable {
}

export interface IServiceRenderer {
    render(workspace: IWorkspace, portsMap: Map<string | number, ExposeStructure> | undefined): IServiceRendererResult|Promise<IServiceRendererResult>;
}