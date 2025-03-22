import { IWorkspace } from "@veto-party/baum__core";
import { IFeature, VariableFeature } from "@veto-party/baum__steps__installer__features";
import { IWritable } from "./IWritable.js";

export type IConfigMapStructure = typeof VariableFeature.makeInstance extends () => IFeature<any, any, infer Structure> ? Structure extends Record<infer Key, infer Value> ? Map<Key, Value> : never : never;

export type ConfigMappingWithStore = {
    store: string;
    key: string;
    global?: boolean;
    variable?: undefined;
} | {
    store?: undefined;
};

export type StaticConfigMapping = {
    variable: string|number|boolean|Record<any, any>|undefined;
    store?: undefined;
} | {
    variable?: undefined;
};

export type ConfigMapping = ({
    type: 'variable';
} & ConfigMappingWithStore) | ({
    type: 'variable';
} & StaticConfigMapping);

export interface IConfigMapRendererResult extends IWritable {
    getResolvedWorkspaceVars(): Map<string | number, ConfigMapping>;
}

export interface IConfigMapRenderer {
    render<Key>(workspace: Key|undefined, map: Map<Key|undefined, IConfigMapStructure>|Map<string|number, IConfigMapStructure>, binding: Map<string, string> | undefined): IConfigMapRendererResult|Promise<IConfigMapRendererResult>;

}
