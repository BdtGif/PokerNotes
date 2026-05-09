// Thin GitHub REST client used by the deploy/cleanup scripts. Keeps every
// network call funnelled through `ghFetch` so tests can stub it later.

const STICKY_COMMENT_TAG = '<!-- pokernotes-pages-deploy -->';

function getEnvConfig(env = process.env) {
  const token = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPOSITORY;
  if (!token) throw new Error('GITHUB_TOKEN is required.');
  if (!repo) throw new Error('GITHUB_REPOSITORY is required.');
  return {
    token,
    repo,
    apiUrl: env.GITHUB_API_URL || 'https://api.github.com',
    serverUrl: env.GITHUB_SERVER_URL || 'https://github.com',
  };
}

async function ghFetch(path, init = {}, env = process.env) {
  const { token, apiUrl } = getEnvConfig(env);
  const url = path.startsWith('http') ? path : `${apiUrl}${path}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...(init.headers || {}),
  };
  let body = init.body;
  if (body && typeof body !== 'string') {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...init, body, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${init.method || 'GET'} ${path} -> ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function createDeployment({ ref, environment, description, production, transient }, env = process.env) {
  const { repo } = getEnvConfig(env);
  return ghFetch(`/repos/${repo}/deployments`, {
    method: 'POST',
    body: {
      ref,
      environment,
      description,
      auto_merge: false,
      required_contexts: [],
      transient_environment: Boolean(transient),
      production_environment: Boolean(production),
    },
  }, env);
}

async function setDeploymentStatus(deploymentId, { state, environmentUrl, logUrl, description }, env = process.env) {
  const { repo } = getEnvConfig(env);
  return ghFetch(`/repos/${repo}/deployments/${deploymentId}/statuses`, {
    method: 'POST',
    body: {
      state,
      environment_url: environmentUrl,
      log_url: logUrl,
      description,
      auto_inactive: true,
    },
  }, env);
}

async function findOpenPullRequestsForBranch(branch, env = process.env) {
  const { repo } = getEnvConfig(env);
  const [owner] = repo.split('/');
  return ghFetch(
    `/repos/${repo}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=100`,
    {},
    env,
  );
}

async function listIssueComments(issueNumber, env = process.env) {
  const { repo } = getEnvConfig(env);
  return ghFetch(`/repos/${repo}/issues/${issueNumber}/comments?per_page=100`, {}, env);
}

async function upsertStickyComment(issueNumber, body, env = process.env) {
  const { repo } = getEnvConfig(env);
  const stamped = `${STICKY_COMMENT_TAG}\n${body}`;
  const comments = await listIssueComments(issueNumber, env);
  const existing = (comments || []).find((c) => c.body && c.body.includes(STICKY_COMMENT_TAG));
  if (existing) {
    return ghFetch(`/repos/${repo}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      body: { body: stamped },
    }, env);
  }
  return ghFetch(`/repos/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: { body: stamped },
  }, env);
}

module.exports = {
  STICKY_COMMENT_TAG,
  getEnvConfig,
  ghFetch,
  createDeployment,
  setDeploymentStatus,
  findOpenPullRequestsForBranch,
  listIssueComments,
  upsertStickyComment,
};
