import { IWorkspace } from "@veto-party/baum__core";
import { ConfigMapping } from "./IConfigMapRenderer.js";
import { SecretMapping } from "./ISecretRenderer.js";

export interface IServiceRenderer {
    render(workspace: IWorkspace, valuesMap: Map<string, ConfigMapping | SecretMapping>): void|Promise<void>;
}