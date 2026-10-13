/**
 * Simple token auth for admin API
 * Demo: admin / affw2026
 */
const DEMO_USER = process.env.ADMIN_USER || 'admin';
const DEMO_PASS = process.env.ADMIN_PASS || 'affw2026';
const tokens = new Set();

function createToken() {
  const token = 'affw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
  tokens.add(token);
  return token;
}

function issueToken(username, password) {
  if (username !== DEMO_USER || password !== DEMO_PASS) return null;
  return createToken();
}

function revokeToken(token) {
  tokens.delete(token);
}

module.exports = { issueToken, revokeToken, tokens, DEMO_USER };
