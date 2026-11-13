
// T3 rollback/race demo: two customers try to hold the same seat at the same moment.
// Usage: node scripts/t3-race-demo.mjs <seatId>
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const seatId = Number(process.argv[2]);
if (!seatId) {
  console.log('Usage: node scripts/t3-race-demo.mjs <seatId>');
  process.exit(1);
}

async function post(path, body, token) {
  const res = await fetch(baseUrl + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function newCustomer(name) {
  const email = `${name}${Date.now()}@reservia.test`;
  const password = 'Race@1234';
  await post('/auth/register', {
    name: name,
    email: email,
    password: password,
    phoneNumber: '01712345678',
  });
  const login = await post('/auth/login', { email, password });
  return { email, token: login.body.data.accessToken };
}

const first = await newCustomer('racer-one-');
const second = await newCustomer('racer-two-');

// both requests are sent at the same moment
const [a, b] = await Promise.all([
  post('/holds/create-hold', { seatId }, first.token),
  post('/holds/create-hold', { seatId }, second.token),
]);

console.log(`${first.email}: ${a.status} ${a.body.message}`);
console.log(`${second.email}: ${b.status} ${b.body.message}`);
console.log(
  'Check in pgAdmin: SELECT id, user_id, seat_id, status FROM seat_holds WHERE seat_id = ' +
    seatId +
    ';',
);