
export interface IContainerName {
    getForJob(name: string, key: string): string;
    getForContainer(name: string): string;
}
