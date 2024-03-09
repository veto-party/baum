import { IPackageManager, IWorkspace } from "@veto-party/baum__core";
import { VersionManagerVersionOverride } from "../src/index.js";
import IWorkspaceMock from "./mock/IWorkspaceMock.js";
import IDependentMock from "./mock/IDependentMock.js";

describe('VersionManager tests', () => {
    it('Should resolve the correct version ignoring the prefix according to the callback in the package manager', () => {

        const baseVersions = [new IWorkspaceMock("@example/ignore", "*", [])];

        const dependingVerions = [new IWorkspaceMock("@example/complex", "workspace:*", baseVersions.map((version) => new IDependentMock(baseVersions[0].getName(), "workspace:*")))];

        const versionManager = new VersionManagerVersionOverride('1.0.0', [
            ...dependingVerions,
            ...baseVersions
        ], new class implements IPackageManager {
            getCleanLockFile(rootDirectory: string, workspace: IWorkspace): Promise<any> {
                throw new Error("Method not implemented.");
            }
            getLockFileName(): string {
                throw new Error("Method not implemented.");
            }
            readWorkspace(rootDirectory: string): Promise<IWorkspace[]> {
                throw new Error("Method not implemented.");
            }
            disableGlobalWorkspace(rootDirectory: string) {
                throw new Error("Method not implemented.");
            }
            enableGlobalWorkspace(rootDirectory: string) {
                throw new Error("Method not implemented.");
            }
            modifyToRealVersionValue(version: string): string | false | undefined {
                return version.startsWith("workspace:") ? version : undefined;
            }
        });

        expect(versionManager.getLatestVersionFor(baseVersions[0].getName(), "*")).toEqual("1.0.0");
    });
});