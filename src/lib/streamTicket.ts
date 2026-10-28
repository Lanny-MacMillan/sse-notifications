import { jwtVerify } from 'jose';

export const STREAM_TICKET_AUDIENCE = 'sse-stream';

/** Returns the Auth0 subject from a valid, unexpired ticket; throws otherwise. */
export async function verifyStreamTicket(ticket: string, secret: string): Promise<string> {
  const { payload } = await jwtVerify(ticket, new TextEncoder().encode(secret), {
    audience: STREAM_TICKET_AUDIENCE,
    algorithms: ['HS256'],
  });

  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('Ticket has no subject');
  }
  return payload.sub;
}
