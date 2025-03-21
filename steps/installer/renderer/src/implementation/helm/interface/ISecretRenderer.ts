import { IWorkspace } from "@veto-party/baum__core";
import { ConfigMappingWithStore, IConfigMapStructure } from "./IConfigMapRenderer.js";
import { IWritable } from "./IWritable.js";

export type SecretMapping = {
    type: 'secret';
} & ConfigMappingWithStore;

export interface ISecretRendererResult extends IWritable {
    getResolvedWorkspaceSecrets(): Map<string, SecretMapping>;
}

export interface ISecretRenderer {
    render(workspace: IWorkspace|undefined, map: Map<IWorkspace|undefined, IConfigMapStructure>, binding: Map<string, string>|undefined): ISecretRendererResult|Promise<ISecretRendererResult>;
}
