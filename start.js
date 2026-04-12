const { spawn } = require('child_process');
const path = require('path');

const ROOT = __dirname;

function start(name, args, env = {}) {
  const proc = spawn(args[0], args.slice(1), {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });

  proc.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });

  return proc;
}

const apiServer = start('API Server', [
  'node', '--enable-source-maps',
  path.join(ROOT, 'artifacts/api-server/dist/index.mjs'),
], { PORT: '8080', NODE_ENV: 'production' });

const bot = start('Discord Bot', [
  'node',
  path.join(ROOT, 'bot/index.js'),
]);

function shutdown() {
  apiServer.kill('SIGTERM');
  bot.kill('SIGTERM');
  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
