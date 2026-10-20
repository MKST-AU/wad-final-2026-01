const assert = require('node:assert/strict');
const { MongoClient, ObjectId } = require('mongodb');
const dns = require('node:dns');
const base = 'http://localhost:3000';
const prefix = `AI_CHECK_${Date.now()}`;
const created = [];
let checks = 0;
async function request(path, cookie, method = 'GET', body) {
  const r = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000),
  });
  return { status: r.status, data: await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] };
}
function check(label, condition) { assert.ok(condition, label); checks++; console.log('PASS', label); }
async function main() {
  const sessions = {};
  for (const role of ['teacher', 'student']) for (let i = 1; i <= 3; i++) {
    const key = role + i;
    const r = await request('/api/auth/login', null, 'POST', { email: `${key}@example.com`, password: role === 'teacher' ? 'Teacher123!' : 'Student123!' });
    check(`${key} login`, r.status === 200 && !!r.cookie);
    sessions[key] = r.cookie;
  }
  const t = sessions.teacher1, t2 = sessions.teacher2, s = sessions.student1, s2 = sessions.student2;
  check('incorrect password rejected', (await request('/api/auth/login', null, 'POST', { email: 'teacher1@example.com', password: 'incorrect' })).status === 401);
  for (const [path, method] of [['/api/auth/me','GET'],['/api/course','GET'],['/api/course','POST'],['/api/course/000000000000000000000000','PUT'],['/api/course/000000000000000000000000','DELETE'],['/api/course/000000000000000000000000/enroll','POST']]) {
    check(`unauthenticated ${method} ${path}`, (await request(path, null, method, method === 'POST' || method === 'PUT' ? {} : undefined)).status === 401);
  }
  check('session reuse', (await request('/api/auth/me', t)).data.user?.email === 'teacher1@example.com');
  const payload = { name: prefix, duration: 3, topics: ['One', 'Two'], price: 10, maxStudent: 1, status: 'Open' };
  check('student cannot create', (await request('/api/course', s, 'POST', payload)).status === 403);
  let r = await request('/api/course', t, 'POST', payload);
  check('teacher creates course', r.status === 201 && !!r.data.courseId);
  const id = r.data.courseId; created.push(id);
  const path = '/api/course/' + id;
  check('teacher sees own course', (await request('/api/course', t)).data.courses.some(c => c._id === id));
  check('other teacher list excludes course', !(await request('/api/course', t2)).data.courses.some(c => c._id === id));
  check('other teacher cannot view', (await request(path, t2)).status === 403);
  for (const [cookie, role] of [[s,'student'],[t2,'other teacher']]) for (const method of ['PUT','DELETE']) {
    r = await request(path, cookie, method, method === 'PUT' ? { price: 99 } : undefined);
    check(`${role} cannot ${method}`, r.status >= 400 && r.status < 500);
  }
  check('teacher updates course', (await request(path, t, 'PUT', { price: 25 })).status === 200);
  check('update persisted', (await request(path, t)).data.course.price === 25);
  for (const search of [prefix.slice(3), 'teacher1']) check(`search ${search}`, (await request('/api/course?search=' + encodeURIComponent(search), s)).data.courses.some(c => c._id === id));
  check('student details', (await request(path, s)).status === 200);
  check('teacher cannot enroll', (await request(path + '/enroll', t, 'POST')).status === 403);
  check('student enrolls', (await request(path + '/enroll', s, 'POST')).status === 200);
  check('duplicate rejected', (await request(path + '/enroll', s, 'POST')).status === 400);
  check('full course rejected', (await request(path + '/enroll', s2, 'POST')).status === 400);
  check('enrolled list contains course', (await request('/api/course?enrolled=true', s)).data.courses.some(c => c._id === id));
  check('teacher sees student identity', (await request(path, t)).data.enrolledStudents.some(u => u.email === 'student1@example.com'));
  check('cannot delete enrolled course', (await request(path, t, 'DELETE')).status === 400);
  // Free seats distinguish status checks from capacity rejection.
  check('close course', (await request(path, t, 'PUT', { status: 'Close', maxStudent: 3 })).status === 200);
  check('closed course visible', (await request('/api/course', s2)).data.courses.some(c => c._id === id));
  check('closed enrollment rejected', (await request(path + '/enroll', s2, 'POST')).status === 400);
  check('cancel course', (await request(path, t, 'PUT', { status: 'Cancel' })).status === 200);
  check('cancel hidden from browse', !(await request('/api/course', s)).data.courses.some(c => c._id === id));
  check('cancel hidden from enrolled', !(await request('/api/course?enrolled=true', s)).data.courses.some(c => c._id === id));
  check('cancel details unavailable', (await request(path, s)).status === 404);
  check('cancel enrollment rejected', (await request(path + '/enroll', s2, 'POST')).status === 400);
  r = await request('/api/course', t, 'POST', { ...payload, name: prefix + '_empty' });
  check('create empty course', r.status === 201); created.push(r.data.courseId);
  check('delete empty course', (await request('/api/course/' + r.data.courseId, t, 'DELETE')).status === 200);
  r = await request('/api/auth/logout', t, 'POST');
  check('logout clears session', r.status === 200 && r.cookie === 'token=');
  console.log(`RESULT: ${checks} checks passed`);
}
async function cleanup() {
  if (!created.length) return;
  dns.setServers(['8.8.8.8']);
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const result = await client.db('wad_final_2026').collection('courses').deleteMany({
      _id: { $in: created.map(id => new ObjectId(id)) }, name: { $regex: '^' + prefix },
    });
    console.log('Temporary courses cleaned up:', result.deletedCount);
  } finally { await client.close(); }
}
main().catch(e => { console.error('FAIL', e.message); process.exitCode = 1; }).finally(async () => {
  try { await cleanup(); } catch (e) { console.error('CLEANUP FAILED:', e.message, 'Course IDs:', created.join(',')); process.exitCode = 1; }
});
