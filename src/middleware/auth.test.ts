import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { SignJWT } from 'jose';
import { createAuthenticateUser, rateLimitSSE } from './auth';

const SECRET = 'shared-secret';
const dbUser = {
  id: 'db-id',
  auth0Sub: 'auth0|me',
  email: 'me@x.com',
  name: 'Me',
  picture: null,
  subscriptionPlan: 'free',
};

const ticketFor = (sub: string, secret = SECRET) =>
  new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setAudience('sse-stream')
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(new TextEncoder().encode(secret));

function run(query: Record<string, unknown>, loadUser = async () => dbUser as never) {
  const result: { status?: number; body?: unknown; nextCalled: boolean; req: Partial<Request> } = {
    nextCalled: false,
    req: { query } as Partial<Request>,
  };
  const res = {
    status(code: number) {
      result.status = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
  } as unknown as Response;
  return createAuthenticateUser(loadUser)(result.req as Request, res, () => {
    result.nextCalled = true;
  }).then(() => result);
}

beforeEach(() => {
  process.env.API_SECRET = SECRET;
});

test('authenticates a valid ticket and loads the user it names', async () => {
  const calls: string[] = [];
  const r = await run({ ticket: await ticketFor('auth0|me') }, async sub => {
    calls.push(sub);
    return dbUser as never;
  });
  assert.equal(r.nextCalled, true);
  assert.deepEqual(calls, ['auth0|me']);
  assert.equal(r.req.user?.id, 'db-id');
});

test('rejects a request with only an auth0Sub (the old credential)', async () => {
  const r = await run({ auth0Sub: 'auth0|victim' });
  assert.equal(r.status, 401);
  assert.equal(r.nextCalled, false);
});

test('ignores an auth0Sub that disagrees with the ticket', async () => {
  const calls: string[] = [];
  const r = await run({ ticket: await ticketFor('auth0|me'), auth0Sub: 'auth0|victim' }, async sub => {
    calls.push(sub);
    return dbUser as never;
  });
  assert.equal(r.nextCalled, true);
  assert.deepEqual(calls, ['auth0|me']);
});

test('rejects a ticket signed with the wrong secret', async () => {
  const r = await run({ ticket: await ticketFor('auth0|victim', 'attacker-secret') });
  assert.equal(r.status, 401);
  assert.equal(r.nextCalled, false);
});

test('rejects a malformed ticket', async () => {
  const r = await run({ ticket: 'garbage' });
  assert.equal(r.status, 401);
});

test('rejects a repeated ticket parameter', async () => {
  const r = await run({ ticket: [await ticketFor('auth0|me'), 'x'] });
  assert.equal(r.status, 401);
});

test('401 when the ticket is valid but no such user exists', async () => {
  const r = await run({ ticket: await ticketFor('auth0|ghost') }, async () => null);
  assert.equal(r.status, 401);
  assert.equal(r.nextCalled, false);
});

test('500 when the shared secret is not configured', async () => {
  delete process.env.API_SECRET;
  const r = await run({ ticket: await ticketFor('auth0|me') });
  assert.equal(r.status, 500);
  assert.equal(r.nextCalled, false);
});

test('rate limit is keyed by the verified user, not a client-chosen value', () => {
  const hit = (sub: string) => {
    let status: number | undefined;
    let nextCalled = false;
    const req = { ip: '203.0.113.9', user: { auth0Sub: sub }, query: { auth0Sub: 'varies' } } as unknown as Request;
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json() {
        return this;
      },
    } as unknown as Response;
    rateLimitSSE(req, res, () => {
      nextCalled = true;
    });
    return { status, nextCalled };
  };

  for (let i = 0; i < 10; i++) assert.equal(hit('auth0|limited').nextCalled, true);
  assert.equal(hit('auth0|limited').status, 429);
  assert.equal(hit('auth0|someone-else').nextCalled, true);
});
