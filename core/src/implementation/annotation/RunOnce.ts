import { IStep, IWorkspace } from '../../index.js';
import { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';

const never = Symbol('never');

class PromiseStorage<T extends (...args: any[]) => any> {
  private promiseResolvers: [(value: ReturnType<T>) => any, (error?: any) => any][] = [];

  private result: any = never;

  constructor(private callback: T) { }

  private doResolve<I extends 0 | 1>(index: I): (typeof this.promiseResolvers)[number][I] {
    return (param: any) => this.promiseResolvers.map((value) => value[index]).forEach((fnc) => fnc(param));
  }

  create(...args: Parameters<T>) {
    if (this.result !== never) {
      return this.result;
    }

    return new Promise<ReturnType<T> extends Promise<any> ? Awaited<ReturnType<T>> : Promise<ReturnType<T>>>(async (resolve, reject) => {
      if (this.promiseResolvers.length === 0) {
        this.callback(...args)
          .then((value: any) => {
            this.result = value;
          })
          .then(this.doResolve(0), this.doResolve(1))
          .finally(() => {
            this.promiseResolvers = [];
          });
      }

      this.promiseResolvers.push([resolve, reject]);

      while (this.result === never && this.promiseResolvers.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    });
  }
}

export const RunOnce = () => {
  return <T extends new (...args: any[]) => IStep>(ctr: T, _context?: ClassDecoratorContext<T>) => {
    return class extends ctr {
      #executeStorage = new PromiseStorage(super.execute.bind(this));

      #cleanStorage = new PromiseStorage(super.clean.bind(this));

      execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        return this.#executeStorage.create(workspace, packageManager, rootDirectory);
      }

      clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        return this.#cleanStorage.create(workspace, packageManager, rootDirectory);
      }
    };
  };
};
