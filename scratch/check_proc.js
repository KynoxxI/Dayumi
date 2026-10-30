import { execSync } from 'child_process';
try {
  const out = execSync('tasklist /FI "IMAGENAME eq electron.exe" /V /FO CSV').toString();
  console.log(out);
} catch (e) {
  console.error(e);
}
