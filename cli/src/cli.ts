
import { BaumManager } from "@veto-party/baum__core";
import Path from 'path';

const baum = new BaumManager();

(await import(Path.join(process.cwd(), 'baum.js')))(baum);

await baum.run();
