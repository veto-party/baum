export interface IMatchLabel {
  getLabelForJob(name: string, key: string): string;
  getLabelForContainer(name: string): string;
}
