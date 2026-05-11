const fs = require('node:fs');
const path = require('node:path');
const { run, runStream, tryRun, sleep } = require('./exec');

function configureGitIdentity() {
  run('git', ['config', '--global', 'user.name', 'github-actions[bot]']);
  run('git', [
    'config', '--global', 'user.email',
    '41898282+github-actions[bot]@users.noreply.github.com',
  ]);
}

function tokenizedRemoteUrl({ token, repository, host = 'github.com' }) {
  return `https://x-access-token:${token}@${host}/${repository}.git`;
}

// Initializes `workdir` as an empty repo on `gh-pages`, then tries to fetch
// the existing branch. Returns true if the branch existed remotely.
function checkoutGhPages(workdir, remoteUrl) {
  fs.mkdirSync(workdir, { recursive: true });
  const opts = { cwd: workdir };
  run('git', ['init', '-q', '-b', 'gh-pages'], opts);
  run('git', ['remote', 'add', 'origin', remoteUrl], opts);
  const fetched = tryRun('git', ['fetch', '--depth=1', 'origin', 'gh-pages'], opts);
  if (fetched.ok) {
    run('git', ['reset', '--hard', 'origin/gh-pages'], opts);
    return true;
  }
  return false;
}

function syncMainToRoot({ workdir, mainSourceDir }) {
  for (const entry of fs.readdirSync(workdir)) {
    if (entry === 'branches' || entry === '.git') continue;
    fs.rmSync(path.join(workdir, entry), { recursive: true, force: true });
  }
  runStream('rsync', ['-a', '--exclude=.git', '--exclude=.github', `${mainSourceDir}/`, `${workdir}/`]);
  fs.writeFileSync(path.join(workdir, '.nojekyll'), '');
}

function syncBranchToSubfolder({ workdir, branch, sourceDir }) {
  const dest = path.join(workdir, 'branches', branch);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  runStream('rsync', ['-a', '--exclude=.git', '--exclude=.github', `${sourceDir}/`, `${dest}/`]);
}

function removeBranchFromTree({ workdir, branch }) {
  const deployPath = path.posix.join('branches', branch);
  const fullPath = path.join(workdir, deployPath);
  if (!fs.existsSync(fullPath)) return false;
  run('git', ['rm', '-rq', deployPath], { cwd: workdir });
  // Prune empty parent dirs up to (but not including) `branches`.
  let parent = path.posix.dirname(deployPath);
  while (parent !== 'branches' && parent !== '.') {
    const parentFull = path.join(workdir, parent);
    if (fs.existsSync(parentFull) && fs.readdirSync(parentFull).length === 0) {
      fs.rmdirSync(parentFull);
      parent = path.posix.dirname(parent);
    } else {
      break;
    }
  }
  return true;
}

async function commitAndPush({ workdir, message, retryDelaysMs = [0, 2000, 4000, 8000, 16000] }) {
  const opts = { cwd: workdir };
  run('git', ['add', '-A'], opts);
  const noChanges = tryRun('git', ['diff', '--cached', '--quiet'], opts);
  if (noChanges.ok) return false;
  run('git', ['commit', '-q', '-m', message], opts);
  let lastError;
  for (let i = 0; i < retryDelaysMs.length; i++) {
    if (retryDelaysMs[i] > 0) await sleep(retryDelaysMs[i]);
    const push = tryRun('git', ['push', 'origin', 'gh-pages'], opts);
    if (push.ok) return true;
    lastError = push.error;
    tryRun('git', ['fetch', 'origin', 'gh-pages'], opts);
    const rebase = tryRun('git', ['rebase', 'origin/gh-pages'], opts);
    if (!rebase.ok) tryRun('git', ['rebase', '--abort'], opts);
  }
  throw new Error(`Push to gh-pages failed after retries: ${lastError && lastError.message}`);
}

module.exports = {
  configureGitIdentity,
  tokenizedRemoteUrl,
  checkoutGhPages,
  syncMainToRoot,
  syncBranchToSubfolder,
  removeBranchFromTree,
  commitAndPush,
};
