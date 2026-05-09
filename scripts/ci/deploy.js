// Entry point for the deploy workflow. Keeps orchestration thin: branch
// resolution + URL building come from ./paths, GitHub API calls from
// ./github, and gh-pages tree manipulation from ./git-pages.

const paths = require('./paths');
const github = require('./github');
const gitPages = require('./git-pages');

function buildPreviewCommentBody({ branch, url, shortSha, logUrl, branchUrl }) {
  return [
    '### Preview deployment',
    '',
    `Branch [\`${branch}\`](${branchUrl}) is deployed at:`,
    '',
    url,
    '',
    `Commit \`${shortSha}\` · [Workflow run](${logUrl}) · _Updated automatically on each push._`,
  ].join('\n');
}

async function main() {
  const env = process.env;
  const ref = env.GITHUB_REF || '';
  if (!ref.startsWith('refs/heads/')) {
    console.log(`Skipping non-branch ref: ${ref}`);
    return;
  }
  const branch = ref.slice('refs/heads/'.length);
  paths.assertSafeBranch(branch);

  const cfg = github.getEnvConfig(env);
  const [repoOwner, repoName] = cfg.repo.split('/');
  const sha = env.GITHUB_SHA;
  const shortSha = sha ? sha.slice(0, 7) : 'unknown';
  const runId = env.GITHUB_RUN_ID;
  const logUrl = `${cfg.serverUrl}/${cfg.repo}/actions/runs/${runId}`;
  const branchUrl = `${cfg.serverUrl}/${cfg.repo}/tree/${encodeURIComponent(branch).replace(/%2F/g, '/')}`;

  const url = paths.deployUrlFor({ branch, repoOwner, repoName });
  const environment = paths.environmentNameFor(branch);
  const isProduction = branch === 'main';

  console.log(`Deploying ${branch} (${shortSha}) -> ${url}`);

  const deployment = await github.createDeployment({
    ref: sha,
    environment,
    description: `Pages deploy for ${branch}`,
    production: isProduction,
    transient: !isProduction,
  }, env);

  await github.setDeploymentStatus(deployment.id, {
    state: 'in_progress',
    environmentUrl: url,
    logUrl,
    description: 'Publishing to gh-pages',
  }, env);

  try {
    gitPages.configureGitIdentity();
    const remoteUrl = gitPages.tokenizedRemoteUrl({
      token: cfg.token,
      repository: cfg.repo,
    });
    gitPages.checkoutGhPages('pages', remoteUrl);
    gitPages.syncBranchToTree({ workdir: 'pages', branch, sourceDir: 'source' });
    const pushed = await gitPages.commitAndPush({
      workdir: 'pages',
      message: `Deploy ${branch} @ ${shortSha}`,
    });
    console.log(pushed ? 'Pushed to gh-pages.' : 'No changes to deploy.');

    await github.setDeploymentStatus(deployment.id, {
      state: 'success',
      environmentUrl: url,
      logUrl,
      description: 'Deployed to GitHub Pages',
    }, env);

    if (!isProduction) {
      const prs = await github.findOpenPullRequestsForBranch(branch, env);
      const body = buildPreviewCommentBody({ branch, url, shortSha, logUrl, branchUrl });
      for (const pr of prs || []) {
        await github.upsertStickyComment(pr.number, body, env);
        console.log(`Updated sticky comment on PR #${pr.number}.`);
      }
      if (!prs || prs.length === 0) {
        console.log('No open PR found for this branch; skipping comment.');
      }
    }
  } catch (err) {
    await github.setDeploymentStatus(deployment.id, {
      state: 'failure',
      logUrl,
      description: 'Deploy failed; see workflow logs.',
    }, env).catch(() => {});
    throw err;
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main, buildPreviewCommentBody };
