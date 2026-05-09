// Phase 1 of the deploy workflow: assemble the gh-pages tree (main at the
// root + the pushed branch under branches/<branch>/) and create a
// preview deployment in the in_progress state. The Pages artifact is
// published in YAML afterwards via actions/deploy-pages.

const fs = require('node:fs');
const paths = require('./paths');
const github = require('./github');
const gitPages = require('./git-pages');

function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  fs.appendFileSync(file, `${name}=${value}\n`);
}

async function main() {
  const env = process.env;
  const ref = env.GITHUB_REF || '';
  if (!ref.startsWith('refs/heads/')) {
    console.log(`Skipping non-branch ref: ${ref}`);
    setOutput('skipped', 'true');
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
  const isProduction = branch === 'main';
  const previewUrl = paths.deployUrlFor({ branch, repoOwner, repoName });
  const environmentName = paths.environmentNameFor(branch);

  console.log(`Preparing deploy: branch=${branch} sha=${shortSha} url=${previewUrl}`);

  let deploymentId = '';
  if (!isProduction) {
    const deployment = await github.createDeployment({
      ref: sha,
      environment: environmentName,
      description: `Preview deploy for ${branch}`,
      production: false,
      transient: true,
    }, env);
    deploymentId = String(deployment.id);
    await github.setDeploymentStatus(deploymentId, {
      state: 'in_progress',
      environmentUrl: previewUrl,
      logUrl,
      description: 'Publishing to GitHub Pages',
    }, env);
    console.log(`Created preview deployment ${deploymentId} for ${environmentName}`);
  }

  gitPages.configureGitIdentity();
  const remoteUrl = gitPages.tokenizedRemoteUrl({ token: cfg.token, repository: cfg.repo });
  gitPages.checkoutGhPages('pages', remoteUrl);
  // Production root always reflects current main, so the root URL keeps
  // working even when only feature branches push between main updates.
  gitPages.syncMainToRoot({ workdir: 'pages', mainSourceDir: 'source-main' });
  if (!isProduction) {
    gitPages.syncBranchToSubfolder({ workdir: 'pages', branch, sourceDir: 'source' });
  }
  const pushed = await gitPages.commitAndPush({
    workdir: 'pages',
    message: `Deploy ${branch} @ ${shortSha}`,
  });
  console.log(pushed ? 'Pushed to gh-pages.' : 'No changes to gh-pages.');

  setOutput('skipped', 'false');
  setOutput('deployment_id', deploymentId);
  setOutput('branch', branch);
  setOutput('preview_url', previewUrl);
  setOutput('is_production', String(isProduction));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
