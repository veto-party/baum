import type { IPackageManager, IWorkspace } from '@veto-party/baum__core';
import { VersionManagerVersionOverride } from '../src/index.js';
import DependentMock from './mock/DependentMock.js';
import WorkspaceMock from './mock/WorkspaceMock.js';

describe('VersionManager tests', () => {
  it('Should resolve the correct version ignoring the prefix according to the callback in the package manager', () => {
    const baseVersions = [new WorkspaceMock('@example/ignore', '*', [])];

    const dependingVerions = [
      new WorkspaceMock(
        '@example/complex',
        'workspace:*',
        baseVersions.map((_version) => new DependentMock(baseVersions[0].getName(), 'workspace:*'))
      )
    ];

    const versionManager = new VersionManagerVersionOverride(
      '1.0.0',
      [...dependingVerions, ...baseVersions],
      new (class implements IPackageManager {
        getCleanLockFile(_rootDirectory: string, _workspace: IWorkspace): Promise<any> {
          throw new Error('Method not implemented.');
        }
        getLockFileName(): string {
          throw new Error('Method not implemented.');
        }
        readWorkspace(_rootDirectory: string): Promise<IWorkspace[]> {
          throw new Error('Method not implemented.');
        }
        disableGlobalWorkspace(_rootDirectory: string) {
          throw new Error('Method not implemented.');
        }
        enableGlobalWorkspace(_rootDirectory: string) {
          throw new Error('Method not implemented.');
        }
        modifyToRealVersionValue(version: string): string | false | undefined {
          return version.startsWith('workspace:') ? version : undefined;
        }
      })()
    );

    expect(versionManager.getLatestVersionFor(baseVersions[0].getName(), '*')).toEqual('1.0.0');
  });
});
