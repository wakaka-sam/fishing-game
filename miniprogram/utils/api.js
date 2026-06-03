const API_BASE = 'https://fish.wakaka007.cn';
const REMOTE_ENABLED = true;

function request(path, data = {}, method = 'POST') {
  if (!REMOTE_ENABLED) return Promise.reject(new Error('remote api disabled'));
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + path,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      timeout: 10000,
      success(res) {
        const body = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(body.error || `HTTP ${res.statusCode}`));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || 'request failed'));
      },
    });
  });
}

module.exports = {
  API_BASE,
  REMOTE_ENABLED,
  login(username) {
    return request('/api/session/login', { username });
  },
  save(username, state) {
    return request('/api/save', { username, state });
  },
  redeem(username, code) {
    return request('/api/redeem/claim', { username, code });
  },
  leaderboard() {
    return request('/api/leaderboard', {}, 'GET');
  },
};
