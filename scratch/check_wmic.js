import { execSync } from 'child_process';
try {
  const out = execSync('wmic process where "name=\'electron.exe\'" get processid,commandline /format:csv').toString();
  console.log(out);
} catch (e) {
  console.error(e.message);
}
