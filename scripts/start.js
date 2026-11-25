const { spawn } = require('node:child_process');
const path = require('node:path');

const root = process.cwd();
const children = [
  spawn(process.execPath, ['--watch', 'src/index.js'], {
    cwd: path.join(root, 'server'),
    stdio: 'inherit',
  }),
  spawn(process.execPath, [path.join(root, 'node_modules', 'expo', 'bin', 'cli'), 'start', ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit',
  }),
];

const exited = new Set();
let shuttingDown = false;
let exitCode = 0;

function finishIfDone() {
  if (exited.size === children.length) {
    process.exit(exitCode);
  }
}

function stopChildren(code, except) {
  if (!shuttingDown) {
    shuttingDown = true;
    exitCode = code;
  }

  for (const child of children) {
    if (child !== except && !exited.has(child)) {
      child.kill('SIGTERM');
    }
  }

  finishIfDone();
}

for (const child of children) {
  child.once('error', (error) => {
    console.error('Could not start a development service:', error.message);
    exited.add(child);
    stopChildren(1, child);
  });

  child.once('exit', (code, signal) => {
    exited.add(child);
    if (!shuttingDown) {
      stopChildren(code ?? (signal ? 1 : 0), child);
    }
    finishIfDone();
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => stopChildren(signal === 'SIGINT' ? 130 : 143));
}
