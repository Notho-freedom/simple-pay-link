import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
let shuttingDown = false;

function spawnNpm(args) {
  if (isWindows) {
    return spawn('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], {
      stdio: 'inherit',
      env: { ...process.env },
    });
  }

  return spawn('npm', args, {
    stdio: 'inherit',
    env: { ...process.env },
  });
}

const api = spawnNpm(['run', 'dev:explorer:api']);
const web = spawnNpm(['run', 'dev:explorer']);

function terminate(child) {
  if (!child || child.killed) return;
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGTERM');
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  terminate(api);
  terminate(web);
  setTimeout(() => process.exit(code), 150);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
api.on('exit', (code) => shutdown(code ?? 0));
web.on('exit', (code) => shutdown(code ?? 0));
