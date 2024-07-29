import Path from 'node:path';
import { ConditionalStep, type IStep } from '@veto-party/baum__core';
import { simpleGit } from 'simple-git';

export class ConditionalGitDiffStep extends ConditionalStep {
  private diffMap = new Map<string, string[]>();

  private async ensureGitDiff(root: string): Promise<string[]> {
    root = Path.resolve(root);
    if (!this.diffMap.has(root)) {
      this.diffMap.set(root, await this.getGitDiff(root));
    }

    return this.diffMap.get(root)!;
  }

  private async getGitDiff(root: string): Promise<string[]> {
    const git = simpleGit({
      baseDir: root
    });

    const raw_changes = await new Promise<string>((resolve, reject) => {
      git.raw(['diff', `HEAD..${this.targetBranchGetter(root)}`, '--name-only'], (err, data) => (err ? reject(err) : resolve(data!)));
    });

    const line_changes = raw_changes.split('\n').map((str) => str.trim());

    line_changes.pop();

    return line_changes
      .map((line) => {
        try {
          return Path.resolve(Path.join(root, line));
        } catch (error) {
          return '';
        }
      })
      .filter(Boolean);
  }

  constructor(
    step: IStep,
    private targetBranchGetter: (root: string) => string | Promise<string>,
    private enabled: boolean = true
  ) {
    super(step, async (workspace, _pm, rootDirectory) => {

      if (!this.enabled) {
        return true;
      }

      const path = Path.resolve(workspace.getDirectory());
      const diff = await this.ensureGitDiff(rootDirectory);

      console.log(diff, path);
      return diff.some((file) => file.startsWith(path));
    });
  }
}
