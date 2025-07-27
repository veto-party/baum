import Path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import type { IBaumManagerConfiguration } from 'baum';
import { testSteps } from '../test/steps.js';
import { buildSteps } from './steps.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.join(Path.dirname(__filename), '..');

export default async (baum: IBaumManagerConfiguration) => {
  const pm = new NPMPackageManager();

  baum.setPackageManager(pm);
  baum.setRootDirectory(__dirname);

  testSteps(baum);
  buildSteps(baum);
};
