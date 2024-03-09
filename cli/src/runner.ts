import Path from 'path';
import { BaumManager } from '@veto-party/baum__core';

const baum = new BaumManager();

await (await import(Path.join(process.cwd(), 'baum.js'))).default(baum);

console.log('Running baum now!');
const success = await baum.run().then(() => true, (error) => {
  console.error(error);
  return false;
});


if (!success) {
  process.exit(1);
}


export default {};
