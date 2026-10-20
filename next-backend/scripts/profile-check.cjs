const assert = require('node:assert/strict');
const base = 'http://localhost:3000';
let passed = 0;
function check(label, condition) {
  assert.ok(condition, label);
  console.log('PASS', label);
  passed++;
}
async function request(path, cookie, body) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function main() {
  check('unauthenticated profile rejected', (await request('/api/user/000000000000000000000000')).status === 401);
  check('invalid token rejected', (await request('/api/user/000000000000000000000000', 'token=invalid')).status === 401);
  const sessions = [];
  for (const role of ['teacher', 'student']) for (let i = 1; i <= 3; i++) {
    const email = `${role}${i}@example.com`;
    const login = await request('/api/auth/login', null, { email, password: role === 'teacher' ? 'Teacher123!' : 'Student123!' });
    check(`${email} login`, login.status === 200 && !!login.cookie);
    const id = login.data.user.id;
    const profile = await request('/api/user/' + id, login.cookie);
    check(`${email} own profile`, profile.status === 200 && profile.data.user._id === id && profile.data.user.email === email);
    check(`${email} only public profile fields`, Object.keys(profile.data.user).sort().join(',') === '_id,email,role,username');
    check(`${email} malformed ID rejected`, (await request('/api/user/invalid-id', login.cookie)).status === 400);
    check(`${email} other ID rejected`, (await request('/api/user/000000000000000000000000', login.cookie)).status === 403);
    sessions.push({ id, cookie: login.cookie });
  }
  check('teacher cannot view another real account', (await request('/api/user/' + sessions[3].id, sessions[0].cookie)).status === 403);
  check('student cannot view another real account', (await request('/api/user/' + sessions[0].id, sessions[3].cookie)).status === 403);
  console.log(`RESULT: ${passed} checks passed; no database records modified`);
}
main().catch(error => { console.error('FAIL', error.message); process.exitCode = 1; });
