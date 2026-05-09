// Phase 2 of the deploy workflow: read the deploy outcome from
// actions/deploy-pages, mark our preview deployment as success/failure,
// and (on success) upsert a sticky comment on every open PR for the
// branch with the preview URL.

const github = require('./github');

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
  const deploymentId = env.DEPLOYMENT_ID;
  const branch = env.BRANCH || '';
  const previewUrl = env.PREVIEW_URL || '';
  const isProduction = env.IS_PRODUCTION === 'true';
  const outcome = env.DEPLOY_OUTCOME || 'unknown';
  const cfg = github.getEnvConfig(env);
  const sha = env.GITHUB_SHA || '';
  const shortSha = sha.slice(0, 7);
  const runId = env.GITHUB_RUN_ID;
  const logUrl = `${cfg.serverUrl}/${cfg.repo}/actions/runs/${runId}`;
  const branchUrl = `${cfg.serverUrl}/${cfg.repo}/tree/${encodeURIComponent(branch).replace(/%2F/g, '/')}`;

  if (deploymentId) {
    const succeeded = outcome === 'success';
    await github.setDeploymentStatus(deploymentId, {
      state: succeeded ? 'success' : 'failure',
      environmentUrl: succeeded ? previewUrl : undefined,
      logUrl,
      description: succeeded ? 'Deployed to GitHub Pages' : 'Pages deploy failed',
    }, env);
    console.log(`Set deployment ${deploymentId} -> ${succeeded ? 'success' : 'failure'}`);
  }

  if (!isProduction && outcome === 'success' && previewUrl && branch) {
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
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main, buildPreviewCommentBody };
