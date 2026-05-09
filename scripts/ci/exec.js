const { execFileSync } = require('node:child_process');

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
    ...opts,
  }).trim();
}

function runStream(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

function tryRun(cmd, args, opts = {}) {
  try {
    return { ok: true, stdout: run(cmd, args, opts) };
  } catch (error) {
    return { ok: false, error };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { run, runStream, tryRun, sleep };
