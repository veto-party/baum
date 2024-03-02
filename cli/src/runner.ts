import Path from 'path';
import { BaumManager } from '@veto-party/baum__core';

const baum = new BaumManager();

(await import(Path.join(process.cwd(), 'baum.js'))).default(baum);

console.log('Running baum now!');
await baum.run().catch(console.error);

export default {};
