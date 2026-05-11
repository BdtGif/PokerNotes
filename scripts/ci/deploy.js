// Single entry point for the deploy workflow:
// 1. Build the gh-pages tree (main at root + pushed branch under
//    branches/<name>/) and push it.
// 2. For non-main pushes, create a GitHub Deployment for the
//    preview/<branch> environment with the URL, and upsert a sticky
//    comment on every open PR for the branch.
// All errors mark the deployment failure (if one was created) before
// rethrowing.

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
  const sha = env.GITHUB_SHA || '';
  const shortSha = sha.slice(0, 7);
  const runId = env.GITHUB_RUN_ID;
  const logUrl = `${cfg.serverUrl}/${cfg.repo}/actions/runs/${runId}`;
  const branchUrl = `${cfg.serverUrl}/${cfg.repo}/tree/${encodeURIComponent(branch).replace(/%2F/g, '/')}`;
  const isProduction = branch === 'main';
  const previewUrl = paths.deployUrlFor({ branch, repoOwner, repoName });
  const environmentName = paths.environmentNameFor(branch);

  console.log(`Deploying ${branch} (${shortSha}) -> ${previewUrl}`);

  let deploymentId = null;
  if (!isProduction) {
    const deployment = await github.createDeployment({
      ref: sha,
      environment: environmentName,
      description: `Preview deploy for ${branch}`,
      production: false,
      transient: true,
    }, env);
    deploymentId = deployment.id;
    await github.setDeploymentStatus(deploymentId, {
      state: 'in_progress',
      environmentUrl: previewUrl,
      logUrl,
      description: 'Publishing to gh-pages',
    }, env);
    console.log(`Created preview deployment ${deploymentId} for ${environmentName}`);
  }

  try {
    gitPages.configureGitIdentity();
    const remoteUrl = gitPages.tokenizedRemoteUrl({
      token: cfg.token,
      repository: cfg.repo,
    });
    gitPages.checkoutGhPages('pages', remoteUrl);
    // Re-sync main into the gh-pages root on every push so the
    // production URL keeps working between main updates.
    gitPages.syncMainToRoot({ workdir: 'pages', mainSourceDir: 'source-main' });
    if (!isProduction) {
      gitPages.syncBranchToSubfolder({ workdir: 'pages', branch, sourceDir: 'source' });
    }
    const pushed = await gitPages.commitAndPush({
      workdir: 'pages',
      message: `Deploy ${branch} @ ${shortSha}`,
    });
    console.log(pushed ? 'Pushed to gh-pages.' : 'No changes to gh-pages.');

    if (deploymentId) {
      await github.setDeploymentStatus(deploymentId, {
        state: 'success',
        environmentUrl: previewUrl,
        logUrl,
        description: 'Deployed to GitHub Pages',
      }, env);

      const prs = await github.findOpenPullRequestsForBranch(branch, env);
      const body = buildPreviewCommentBody({ branch, url: previewUrl, shortSha, logUrl, branchUrl });
      for (const pr of prs || []) {
        await github.upsertStickyComment(pr.number, body, env);
        console.log(`Updated sticky comment on PR #${pr.number}.`);
      }
      if (!prs || prs.length === 0) {
        console.log('No open PR found for this branch; skipping comment.');
      }
    }
  } catch (err) {
    if (deploymentId) {
      await github.setDeploymentStatus(deploymentId, {
        state: 'failure',
        logUrl,
        description: 'Deploy failed; see workflow logs.',
      }, env).catch(() => {});
    }
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
