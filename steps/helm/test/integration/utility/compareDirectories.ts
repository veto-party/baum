import FileSystemSync from 'node:fs';
import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import 'colors';
import * as Diff from 'diff';
import uniq from 'lodash.uniq';

export async function compareDirectories(pathA: string, pathB: string) {
  const filesA = FileSystemSync.readdirSync(pathA);
  const filesB = FileSystemSync.readdirSync(pathB);

  let result = true;

  const files = uniq([filesA, filesB].flat());

  for (const file of files) {
    if (file.endsWith('.tgz') || file === 'charts' || file === 'Chart.lock') {
      console.log('Ingoring ', file, ' while comparing.');
      continue;
    }

    if (!filesB.includes(file) || !filesA.includes(file)) {
      console.error(`File is invalid: ${Path.join(pathB, file)}`.red);
      result = false;
      continue;
    }

    if ((await FileSystem.stat(Path.join(pathA, file))).isDirectory()) {
      if (!(await compareDirectories(Path.join(pathA, file), Path.join(pathB, file)))) {
        result = false;
      }
    } else {
      const fileA = FileSystemSync.readFileSync(Path.join(pathA, file), 'utf-8');
      const fileB = FileSystemSync.readFileSync(Path.join(pathB, file), 'utf-8');

      const diff = Diff.diffLines(fileB, fileA);

      if (diff.some((value) => value.added || value.removed)) {
        console.error(`File [${Path.join(pathA, file)}] is different to [${Path.join(pathB, file)}]`.yellow);
        diff.forEach((change, lineNo) => {
          if (change.added) {
            console.log(`(+) (${file}:${lineNo}): ${change.value}`.bgGreen.white);
          } else if (change.removed) {
            console.log(`(-) (${file}:${lineNo}): ${change.value}`.bgRed.white);
          }
        });
        result = false;
      }
    }
  }

  return result;
}
