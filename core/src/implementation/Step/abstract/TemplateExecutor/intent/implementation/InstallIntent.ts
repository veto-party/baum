import SyncFileSystem from 'fs';
import Path from 'path';
import FileSystem from 'fs/promises';
import zod from 'zod';
import { type IStep, ModifyNPMRC } from '../../../../../../index.js';
import type { IInstallIntent } from '../../../../../../interface/PackageManager/executor/IPackageManagerExecutor.js';
import { AIntent } from '../AIntent.js';

const installIntentValidation = zod.object({
  type: zod.string()
});

class InstallIntent extends AIntent<[string]> implements IInstallIntent {
  readonly name = 'install';

  constructor(private type?: string) {
    super();
  }

  /**
   * @inheritdoc
   */
  ci(): IInstallIntent {
    return new InstallIntent('ci');
  }

  /**
   * @inheritdoc
   */
  install(): IInstallIntent {
    return new InstallIntent('install');
  }

  /**
   * @inheritdoc
   */
  rebuild(): IInstallIntent {
    return new InstallIntent('rebuild');
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
    const npmRCCopy = new ModifyNPMRC(async (_, __, root) => {
      if (SyncFileSystem.existsSync(Path.join(root, '.npmrc'))) {
        return (await FileSystem.readFile(Path.join(root, '.npmrc'))).toString();
      }

      return '';
    });

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
