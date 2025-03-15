
import { IPackageManager, IWorkspace } from '@veto-party/baum__core';
import { IFeature } from '@veto-party/baum__steps__installer__features';

export type InferStructure<T> = T extends IFeature<any, any, infer U> ? U : never;

export type RendererMetadata = {
    workspace: IWorkspace;
    packageManger: IPackageManager;
    rootDirectory: string;   
} & Record<string, any>;

export interface IRenderer<T extends IFeature<any, any, any>> {
    render<U extends InferStructure<T>>(metadata: RendererMetadata, structure: U[]): Promise<any>|any;
}