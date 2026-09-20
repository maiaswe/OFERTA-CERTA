import {spawn} from 'node:child_process';
import path from 'node:path';

// A separate loopback server for manual browser verification. Database fixtures
// live below work/ and DATABASE_MODE prevents use of the cloud connection.
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4318'],{
 cwd:process.cwd(),windowsHide:true,stdio:'inherit',
 env:{...process.env,DATABASE_MODE:'local',APP_ORIGIN:'http://127.0.0.1:4318',LOCAL_DATA_DIR:path.resolve('../../work/browser-test-manual')}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
