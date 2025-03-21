import { IWorkspace } from "@veto-party/baum__core";
import { IWritable } from "./IWritable.js";
import { ExposeFeature, IFeature } from "@veto-party/baum__steps__installer__features";

export interface IExposeRenderResult extends IWritable {
    getPorts(): Set<number>;
}

export type ExposeStructure = ExposeFeature extends IFeature<any, any, infer Structure> ? Structure extends Record<string, infer ValueStructure> ? ValueStructure : never : never;

export interface IExposeRenderer {
    render(workspace: IWorkspace, config: Map<string | number, ExposeStructure> | undefined): IExposeRenderResult;
}
