
import { IPackageManager, IWorkspace } from '@veto-party/baum__core';
import { IFeature } from '@veto-party/baum__steps__installer__features';

export type InferStructure<T> = T extends IFeature<any, any, infer U> ? U : never;

export type ProjectMetadata = {
    workspace: IWorkspace;
    packageManger: IPackageManager;
    rootDirectory: string;  
}

export type RendererMetadata = {
    project: ProjectMetadata;
} & Record<string, any>;

export interface IRenderer<T extends IFeature<any, any, any>> {
    render(metadata: RendererMetadata, structure: InferStructure<T>[]): Promise<any>|any;
}