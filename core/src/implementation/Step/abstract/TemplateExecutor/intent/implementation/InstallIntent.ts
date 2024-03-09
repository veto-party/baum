import FileSystem from 'fs';
import Path from 'path';
import zod from 'zod';
import { IStep, ParallelStep } from '../../../../../../index.js';
import { IInstallIntent } from '../../../../../../interface/PackageManager/executor/IPackageManagerExecutor.js';
import { CopyStep } from '../../../../CopyStep.js';
import { AIntent } from '../AIntent.js';

const installIntentValidation = zod.object({
  type: zod.string()
});

class InstallIntent extends AIntent<[string]> implements IInstallIntent {

  readonly name = 'install';

  constructor(
    private type?: string,
  ) {
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
    const npmRCCopy = new CopyStep(
      (_, __, rootDirectory) => (FileSystem.existsSync(Path.join(rootDirectory, '.npmrc')) ? [Path.join(rootDirectory, '.npmrc')] : []),
      (workspace, file) => Path.join(workspace.getDirectory(), Path.basename(file)),
      false
    );

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
