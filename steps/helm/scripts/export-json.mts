import FileSystem from 'node:fs/promises';
import { definitions } from '../src/types/definition.js';

(async () => {
  await FileSystem.writeFile('./out.json', JSON.stringify(definitions));
})();
