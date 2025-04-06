import type { IPackageManager, IWorkspace } from '@veto-party/baum__core';
import type { IFeature } from '@veto-party/baum__steps__installer__features';

export type InferStructure<T> = T extends IFeature<any, any, infer U> ? U : never;

export type ProjectMetadata = {
  workspace: IWorkspace;
  packageManger: IPackageManager;
  rootDirectory: string;
};

export type RendererMetadata = {
  project: ProjectMetadata;
} & Record<string, any>;

export interface IFeatureRenderer<T extends IFeature<any, any, any>> {
  renderFeature(metadata: RendererMetadata, structure: InferStructure<T>[], ctx: any): Promise<any> | any;
}

export interface IRenderer<T extends IFeature<any, any, any>> {
  render(metadata: Omit<ProjectMetadata, 'workspace'>, structure: Map<IWorkspace, InferStructure<T>[]>): Promise<any> | any;
}
