import type { FromSchema } from 'json-schema-to-ts';
import type { FeatureContainer } from './IFeatureContainer.js';
import type { ToDefinitionStructure } from './types/ToDefinitionStructure.js';

export type IngestResult<T> = {
  item: T;
  key?: string;
  sourcePath?: string;
};

export interface IFeature<T extends Record<string, any> | {}, Path, From = T extends {} ? any[] | any : FromSchema<T>> {
  /**
   * Verifies an object.
   * Might throw an error on invalid, or return false.
   *
   * @param element
   */
  verifyObject(element: any): element is ToDefinitionStructure<Path, From>;

  getSchema(): T;

  getPath(): Path extends string ? Path : undefined;

  /**
   * This method is to be overridden, if a feature needs to merge data.
   * This method gets the data in tree form where
   *
   * @param objects
   * @returns
   */
  ingestObject(objects: Record<string, FeatureContainer>): Promise<IngestResult<From>[]> | IngestResult<From>[];
}
