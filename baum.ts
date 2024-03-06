import Path from 'path';
import { fileURLToPath } from 'url';
import { NPMPackageManager } from '@veto-party/baum__package_manager__npm';
import { GroupStep, IBaumManagerConfiguration, IWorkspace, PKGMStep, ParallelStep } from 'baum';
import FileSystem from 'fs/promises';
import { CopyStep } from './core/src/implementation/Step/CopyStep.js';
import semver from 'semver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

export default async (baum: IBaumManagerConfiguration) => {

  const pm = new NPMPackageManager();

  baum.setPackageManager(pm);
  baum.setRootDirectory(__dirname);

  const oldFiles: Record<string, any> = {};

  baum.addExecutionStep('package_modification', {
    clean: async (workspace) => {
      const givenPath = Path.join(workspace.getDirectory(), 'package.json');

      const oldFile = oldFiles[`${workspace.getName()}-${workspace.getVersion()}`];

      if (oldFile) {
        await FileSystem.writeFile(givenPath, oldFiles[`${workspace.getName()}-${workspace.getVersion()}`]);
      }
    },
    execute: async (workspace, pm, root) => {
      const givenPath = Path.join(workspace.getDirectory(), 'package.json');
      const file = (await FileSystem.readFile(givenPath)).toString();

      oldFiles[`${workspace.getName()}-${workspace.getVersion()}`] = file;

      const jsonFile = JSON.parse(file);

      if (jsonFile?.scripts?.build?.trim?.()?.startsWith?.('tsc')) {
        if (jsonFile.main !== undefined && jsonFile.main === "./src/index.ts") {
          jsonFile.main = './dist/index.js';
          jsonFile.types = './dist/index.d.ts';
        }
      }

      const workspaces = await pm.readWorkspace(root);

      const namesToWorkspaces: Record<string, Record<string, IWorkspace>> = {};
      const namesTVersions = workspaces.reduce<Record<string, string[]>>((prev, current) => {
        prev[current.getName()] ??= [];
        namesToWorkspaces[current.getName()][current.getVersion()] = current;
        prev[current.getName()].push(current.getVersion());
        return prev;
      }, {});


      Object.values(namesToWorkspaces).forEach(
        (workspaceMapping) => Object.values(workspaceMapping).sort(
          (workspaceA, workspaceB) => semver.compare(workspaceA.getVersion(), workspaceB.getVersion()) || semver.compareBuild(workspaceA.getVersion(), workspaceB.getVersion())
        )
      );

      const tempVersion = 'v0.0.0-temp';

      const starToVersion = (version: string) => version === "*" ? (process.env.PUBLISH_VERSION ?? tempVersion) : version;

      const toMappedVersion = (name: string, version: string): string => {
        if (namesToWorkspaces[name][version].isPublishable()) {
          return process.env.PUBLISH_VERSION ?? 'v0.0.0-temp';
        }

        if (version.includes('*')) {
          const versions = Object.values(namesToWorkspaces[name]);
          const foundVersion = versions.findLast((lookupVersion) => semver.satisfies(starToVersion(lookupVersion.getVersion()), starToVersion(version)) || !lookupVersion.getVersion().includes("*") || (lookupVersion.isPublishable() && lookupVersion.getVersion().includes("*")));

          if (foundVersion) {
            return toMappedVersion(name, foundVersion?.getVersion());
          }

          throw new Error("Invalid dependency.");
        }

        return version;
      };

      Object.entries(jsonFile.dependencies ?? {}).forEach(([k, v]) => {
        if (namesTVersions[k]?.includes(v as any)) {
          jsonFile.dependencies[k] = toMappedVersion(k, v as string);
        }
      });

      Object.entries(jsonFile.devDependencies ?? {}).forEach(([k, v]) => {
        if (namesTVersions[k]?.includes(v as any)) {
          jsonFile.devDependencies[k] = toMappedVersion(k, v as string);
        }
      });

      jsonFile.version = process.env.PUBLISH_VERSION;
      jsonFile.license = 'MIT';

      await FileSystem.writeFile(givenPath, JSON.stringify(jsonFile));
    }
  });

  baum.addExecutionStep('install', new PKGMStep((intent) => intent.install().ci()));
  baum.addExecutionStep('prepare', new ParallelStep([
    new GroupStep([new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists("test")), new CopyStep('**/*.report.xml', (_, file) => Path.join(__dirname, 'out', new Date().toISOString(), Path.basename(file)))]),
    new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPGKMWhenKeyExists("build")),
  ]));

  baum.addExecutionStep('publish', new PKGMStep(PKGMStep.DEFAULT_TYPES.RunPublishIfRequired((publsh) => publsh.setRegistry('https://registry.npmjs.org/').setForcePublic(true))));
};
