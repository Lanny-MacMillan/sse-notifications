import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { verifyStreamTicket } from './streamTicket';

const SECRET = 'shared-secret';
const key = (secret: string) => new TextEncoder().encode(secret);

const sign = (
  opts: { sub?: string; aud?: string; exp?: string | number; secret?: string; alg?: string } = {},
) =>
  new SignJWT({})
    .setProtectedHeader({ alg: opts.alg ?? 'HS256' })
    .setSubject(opts.sub ?? 'auth0|me')
    .setAudience(opts.aud ?? 'sse-stream')
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '60s')
    .sign(key(opts.secret ?? SECRET));

test('returns the subject of a valid ticket', async () => {
  assert.equal(await verifyStreamTicket(await sign(), SECRET), 'auth0|me');
});

test('rejects a ticket signed with a different secret', async () => {
  await assert.rejects(verifyStreamTicket(await sign({ secret: 'other' }), SECRET));
});

test('rejects an expired ticket', async () => {
  const past = Math.floor(Date.now() / 1000) - 120;
  await assert.rejects(verifyStreamTicket(await sign({ exp: past }), SECRET));
});

test('rejects a ticket meant for a different audience', async () => {
  await assert.rejects(verifyStreamTicket(await sign({ aud: 'something-else' }), SECRET));
});

test('rejects a different signing algorithm', async () => {
  await assert.rejects(verifyStreamTicket(await sign({ alg: 'HS512' }), SECRET));
});

test('rejects an unsigned token (alg none)', async () => {
  const header = Buffer.from('{"alg":"none"}').toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ sub: 'auth0|victim', aud: 'sse-stream', exp: Math.floor(Date.now() / 1000) + 60 }),
  ).toString('base64url');
  await assert.rejects(verifyStreamTicket(`${header}.${body}.`, SECRET));
});

test('rejects garbage', async () => {
  await assert.rejects(verifyStreamTicket('not-a-jwt', SECRET));
});
