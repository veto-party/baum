
export interface IMatchLabel {
    getForJob(name:string, key:string): string;
    getForContainer(name:string): string;
}
