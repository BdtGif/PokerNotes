const paths = require('./paths');
const github = require('./github');
const gitPages = require('./git-pages');

async function main() {
  const env = process.env;
  const branch = env.DELETED_BRANCH;
  if (!branch) throw new Error('DELETED_BRANCH is required.');
  if (branch === 'main') {
    console.log('Refusing to clean up main.');
    return;
  }
  paths.assertSafeBranch(branch);

  const cfg = github.getEnvConfig(env);
  gitPages.configureGitIdentity();
  const remoteUrl = gitPages.tokenizedRemoteUrl({
    token: cfg.token,
    repository: cfg.repo,
  });
  const fetched = gitPages.checkoutGhPages('pages', remoteUrl);
  if (!fetched) {
    console.log('No gh-pages branch yet; nothing to clean.');
    return;
  }

  const removed = gitPages.removeBranchFromTree({ workdir: 'pages', branch });
  if (!removed) {
    console.log(`No deployment found for ${branch}; nothing to do.`);
    return;
  }
  await gitPages.commitAndPush({
    workdir: 'pages',
    message: `Cleanup deployment for deleted branch ${branch}`,
  });
  console.log(`Removed gh-pages folder for ${branch}.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
