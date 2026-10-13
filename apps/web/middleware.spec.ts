import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('frontend authentication middleware', () => {
  const origin = 'https://app.example.com';

  it.each([
    '/api/v1',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/documents',
    '/api/v1/documents/doc-1/download',
  ])('lets the backend handle API authentication for %s', (path) => {
    const response = middleware(new NextRequest(`${origin}${path}`));
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('location')).toBeNull();
  });

  it.each(['/dashboard', '/documents', '/api/v10/documents', '/api/v1-other'])(
    'still redirects unauthenticated page requests for %s',
    (path) => {
      const response = middleware(new NextRequest(`${origin}${path}`));
      expect(response.headers.get('location')).toBe(`${origin}/login`);
    },
  );

  it('still allows authenticated page requests', () => {
    const response = middleware(
      new NextRequest(`${origin}/dashboard`, {
        headers: { cookie: 'auth_token=test-token' },
      }),
    );
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it.each(['/login', '/register', '/forgot-password', '/reset-password'])(
    'keeps %s public',
    (path) => {
      const response = middleware(new NextRequest(`${origin}${path}`));
      expect(response.headers.get('x-middleware-next')).toBe('1');
    },
  );

  it('still redirects logged-in users away from the login page', () => {
    const response = middleware(
      new NextRequest(`${origin}/login`, {
        headers: { cookie: 'auth_token=test-token' },
      }),
    );
    expect(response.headers.get('location')).toBe(`${origin}/dashboard`);
  });
});
