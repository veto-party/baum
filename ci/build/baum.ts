import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import type { IBaumManagerConfiguration } from 'baum';
import { __project_dir } from '../config.js';
import { buildSteps } from './steps.js';

export default async (baum: IBaumManagerConfiguration) => {
  const pm = new NPMPackageManager();

  baum.setPackageManager(pm);
  baum.setRootDirectory(__project_dir);

  buildSteps(baum);
};
