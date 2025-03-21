import { IWorkspace } from "@veto-party/baum__core";
import { ConfigMapping } from "../interface/IConfigMapRenderer.js";
import { IDeploymentRenderer } from "../interface/IDeploymentRenderer.js";
import { SecretMapping } from "../interface/ISecretRenderer.js";

export class DeploymentRenderer implements IDeploymentRenderer {
    render(workspace: IWorkspace, map: Map<string | number, ConfigMapping | SecretMapping>): void | Promise<void> {
        
    }
}