import { IPackageManager, IStep, IWorkspace } from "../../index.js"

class PromiseStorage<T extends (...args: any[]) => any> {

    private promiseResolvers: [(value: ReturnType<T>) => any, (error?: any) => any][] = [];

    constructor(
        private callback: T
    ) { }

    private doResolve<I extends 0 | 1>(index: I): typeof this.promiseResolvers[number][I] {
        return (param: any) => this.promiseResolvers.map((value) => value[index]).forEach((fnc) => fnc(param));
    }

    create(...args: Parameters<T>) {
        return new Promise<ReturnType<T> extends Promise<any> ? Awaited<ReturnType<T>> : Promise<ReturnType<T>>>((resolve, reject) => {
            if (this.promiseResolvers.length === 0) {
                this.callback(...args).then(this.doResolve(0), this.doResolve(1));
            }

            this.promiseResolvers.push([resolve, reject]);
        });
    }
}

export const RunOnce = () => {
    return <T extends new (...args: any[]) => IStep>(constructor: T) => {
        return class extends constructor {

            #executeStorage = new PromiseStorage(super.execute.bind(this));

            #cleanStorage = new PromiseStorage(super.clean.bind(this));

            execute(workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string): Promise<void> {
                return this.#executeStorage.create(workspace, packageManager, rootDirectory);
            }

            clean(workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string): Promise<void> {
                return this.#cleanStorage.create(workspace, packageManager, rootDirectory);
            }
        }
    }
}