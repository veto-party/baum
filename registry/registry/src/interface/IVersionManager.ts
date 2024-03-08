export interface IVersionManager {
  getLatestVersionFor(name: string, versionRange: string): string | undefined;
}
