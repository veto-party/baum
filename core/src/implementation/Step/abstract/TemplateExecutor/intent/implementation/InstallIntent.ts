import FileSystem from 'fs';
import Path from 'path';
import zod from 'zod';
import { IStep, ParallelStep } from '../../../../../../index.js';
import { IInstallIntent } from '../../../../../../interface/PackageManager/executor/IPackageManagerExecutor.js';
import { CopyStep } from '../../../../CopyStep.js';
import { AIntent } from '../AIntent.js';

const installIntentValidation = zod.object({
  type: zod.string(),
  keepLockFileFlag: zod.boolean()
});

class InstallIntent extends AIntent<[string]> implements IInstallIntent {

  readonly name = 'install';

  constructor(
    private type?: string,
    private keepLockFileFlag = true
  ) {
    super();
  }

  keepLockFile(keep: boolean): IInstallIntent {
    return new InstallIntent(this.type, keep);
  }

  /**
   * @inheritdoc
   */
  ci(): IInstallIntent {
    return new InstallIntent('ci', this.keepLockFileFlag);
  }

  /**
   * @inheritdoc
   */
  install(): IInstallIntent {
    return new InstallIntent('install', this.keepLockFileFlag);
  }

  /**
   * @inheritdoc
   */
  rebuild(): IInstallIntent {
    return new InstallIntent('rebuild', this.keepLockFileFlag);
  }

  /**
   * @inheritdoc
   */
  validate(): void {
    const result = installIntentValidation.safeParse(this);

    if (!result.success) {
      throw result.error;
    }
  }

  getPrepareStep = (): IStep => {
    const npmRCCopy = new CopyStep(
      (_, __, rootDirectory) => (FileSystem.existsSync(Path.join(rootDirectory, '.npmrc')) ? [Path.join(rootDirectory, '.npmrc')] : []),
      (workspace, file) => Path.join(workspace.getDirectory(), Path.basename(file)),
      false
    );

    if (this.keepLockFileFlag) {
      return new ParallelStep([
        npmRCCopy,
        new CopyStep(
          (_, pm, root) => [Path.join(root, pm.getLockFileName())],
          (workspace, filename) => Path.join(Path.resolve(workspace.getDirectory()), Path.basename(filename)),
          false
        )
      ]);
    }

    return npmRCCopy;
  };

  /**
   * @inheritdoc
   */
  toGroup(): [string] {
    this.validate();
    return [this.type!];
  }
}

export { InstallIntent };
