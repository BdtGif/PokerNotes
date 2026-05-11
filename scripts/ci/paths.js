// Pure helpers: branch -> deploy path / URL / environment name.
// No I/O so they can be exercised from unit tests directly.

function assertSafeBranch(branch) {
  if (typeof branch !== 'string' || branch.length === 0) {
    throw new Error('Branch name must be a non-empty string.');
  }
  if (branch.startsWith('/') || branch.endsWith('/')) {
    throw new Error(`Refusing branch with leading/trailing slash: ${branch}`);
  }
  if (branch.split('/').some((seg) => seg === '' || seg === '.' || seg === '..')) {
    throw new Error(`Refusing branch with empty/relative segment: ${branch}`);
  }
}

function deployPathFor(branch) {
  assertSafeBranch(branch);
  if (branch === 'main') return null;
  return `branches/${branch}`;
}

function encodeBranchUrlPath(branch) {
  return branch.split('/').map(encodeURIComponent).join('/');
}

function deployUrlFor({ branch, repoOwner, repoName }) {
  if (!repoOwner || !repoName) throw new Error('repoOwner and repoName are required.');
  const base = `https://${repoOwner.toLowerCase()}.github.io/${repoName}/`;
  if (branch === 'main') return base;
  assertSafeBranch(branch);
  return `${base}branches/${encodeBranchUrlPath(branch)}/`;
}

function environmentNameFor(branch) {
  if (branch === 'main') return 'production';
  assertSafeBranch(branch);
  return `preview/${branch}`;
}

module.exports = {
  assertSafeBranch,
  deployPathFor,
  encodeBranchUrlPath,
  deployUrlFor,
  environmentNameFor,
};
