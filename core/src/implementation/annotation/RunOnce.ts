import { CachedFN, type IStep, type IWorkspace } from '../../index.js';
import type { IExecutablePackageManager } from '../../interface/PackageManager/IExecutablePackageManager.js';

class PromiseStorage<T extends (...args: any[]) => any> {
  private result: Promise<any> | undefined = undefined;

  constructor(private callback: T) {}

  @CachedFN(true)
  private async resolve() {
    return await this.result;
  }

  public async call(...args: Parameters<T>) {
    // Explicitly ignore parameters for callback.
    this.result ??= this.callback(...args);
    return this.resolve();
  }
}

export const RunOnce = () => {
  return <T extends new (...args: any[]) => IStep>(ctr: T, _context?: ClassDecoratorContext<T>) => {
    return class extends ctr {
      #executeStorage = new PromiseStorage(super.execute.bind(this));

      #cleanStorage = new PromiseStorage(super.clean.bind(this));

      execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        return this.#executeStorage.call(workspace, packageManager, rootDirectory);
      }

      clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        return this.#cleanStorage.call(workspace, packageManager, rootDirectory);
      }
    };
  };
};
