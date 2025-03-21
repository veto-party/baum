import { IWorkspace } from "@veto-party/baum__core";
import { ConfigMapping } from "./IConfigMapRenderer.js";
import { SecretMapping } from "./ISecretRenderer.js";
import { IWritable } from "./IWritable.js";

export interface IDeploymentRenderResult extends IWritable {

}

export interface IDeploymentRenderer {
    render(workspace: IWorkspace, map: Map<string | number, ConfigMapping | SecretMapping>, ports: Set<number>): IDeploymentRenderResult|Promise<IDeploymentRenderResult>;
}
