import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NextRequest } from 'next/server';

// Server-side fallback for when the client bundle calls the relative /api/v1
// (NEXT_PUBLIC_API_URL not inlined, e.g. in the v0 preview). The backend URL is
// read at request time, so build-time inlining doesn't matter here.
export const dynamic = 'force-dynamic';

const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'accept-encoding',
]);

// In dev the monorepo-root env file (written by the v0 preview) is loaded only
// in the process that evaluates next.config.js, not in the route worker.
function readRootEnv(key: string): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  for (const file of ['.env.development.local', '.env.local', '.env.development', '.env']) {
    try {
      const content = readFileSync(join(process.cwd(), '../../', file), 'utf8');
      const match = content.match(new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.*)$`, 'm'));
      if (match) return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
    } catch {
      // file absent
    }
  }
  return undefined;
}

function backendOrigin(): string | null {
  const raw = (
    process.env.API_PROXY_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    readRootEnv('API_PROXY_URL') ||
    readRootEnv('NEXT_PUBLIC_API_URL')
  )?.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

async function proxy(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const origin = backendOrigin();
  if (!origin) {
    return Response.json({ message: 'API backend URL is not configured' }, { status: 502 });
  }

  const target = new URL(`/api/v1/${path.map(encodeURIComponent).join('/')}`, origin);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  // The backend checks Origin against its CORS allow-list; same-origin proxy
  // requests don't need it and the preview origin may not be listed.
  headers.delete('origin');

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return Response.json({ message: 'API backend is unreachable' }, { status: 502 });
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === 'content-encoding' || k === 'content-length' || k === 'transfer-encoding') return;
    if (k.startsWith('access-control-')) return;
    if (k === 'set-cookie') return;
    responseHeaders.set(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie?.() ?? []) {
    responseHeaders.append('set-cookie', cookie);
  }

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
