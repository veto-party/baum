import { IPackageManager } from "./IPackageManager";
import { IStep } from "./IStep";

export interface IBaumManagerConfiguration {
    setRootDirectory(root: string): IBaumManagerConfiguration;
    dontCopyLockFile(): IBaumManagerConfiguration;
    setPackageManager(packageManager: IPackageManager): IBaumManagerConfiguration;
    addExecutionStep(name: string, step: IStep): IBaumManagerConfiguration;
    addExecutionStep(name: string, step: IStep, deps: string[]): IBaumManagerConfiguration;
}
