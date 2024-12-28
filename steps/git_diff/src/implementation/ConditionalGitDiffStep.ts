import Path from 'node:path';
import { ConditionalStep, type IStep } from '@veto-party/baum__core';
import { type SimpleGit, simpleGit } from 'simple-git';

const skipped = Symbol('skipped');

export class ConditionalGitDiffStep extends ConditionalStep<ConditionalGitDiffStep> {
  private diffMap = new Map<string, string[] | typeof skipped>();

  private async ensureGitDiff(root: string): Promise<string[] | typeof skipped> {
    root = Path.resolve(root);
    if (!this.diffMap.has(root)) {
      this.diffMap.set(root, await this.getGitDiff(root));
    }

    return this.diffMap.get(root)!;
  }

  private async getGitDiff(root: string): Promise<string[] | typeof skipped> {
    if (typeof this.dontSkipChangeChecks === 'boolean' && !this.dontSkipChangeChecks) {
      return skipped;
    }

    const git = simpleGit({
      baseDir: root
    });

    if (typeof this.dontSkipChangeChecks === 'function' && !(await this.dontSkipChangeChecks(root, git))) {
      return skipped;
    }

    const defaultBranch = await this.targetBranchGetter(root, git);

    await git.fetch('origin', `${defaultBranch}:${defaultBranch}`, []).catch(console.warn);

    const raw_changes = await new Promise<string>(async (resolve, reject) => {
      git.raw(['diff', `${defaultBranch}`, '--name-only'], (err, data) => (err ? reject(err) : resolve(data!)));
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
    step: IStep|undefined,
    private targetBranchGetter: (root: string, git: SimpleGit) => string | Promise<string>,
    private dontSkipChangeChecks: boolean | ((root: string, git: SimpleGit) => boolean | Promise<boolean>) = true
  ) {
    super(step, async (workspace, _pm, rootDirectory) => {
      const path = Path.resolve(workspace.getDirectory());
      const diff = await this.ensureGitDiff(rootDirectory);

      if (diff === skipped) {
        return true;
      }

      return diff.some((file) => file.startsWith(path));
    });
  }

  clone(): ConditionalGitDiffStep {
    return new ConditionalGitDiffStep(this.step, this.targetBranchGetter, this.dontSkipChangeChecks);
  }
}
