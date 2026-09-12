import { upsertUserOldestFirst } from '@complyfood/shared';
import { UserRole, type User } from '@complyfood/shared';

describe('upsertUserOldestFirst', () => {
  it('inserts a created user and keeps oldest-first ordering', () => {
    const users: User[] = [
      {
        id: 'user-2',
        email: 'staff@demo.com',
        role: UserRole.STAFF,
        orgId: 'org-1',
        createdAt: '2026-09-02T10:00:00.000Z',
      },
      {
        id: 'user-1',
        email: 'admin@demo.com',
        role: UserRole.ADMIN,
        orgId: 'org-1',
        createdAt: '2026-09-01T10:00:00.000Z',
      },
    ];

    const createdUser: User = {
      id: 'user-3',
      email: 'auditor@demo.com',
      role: UserRole.AUDITOR,
      orgId: 'org-1',
      createdAt: '2026-09-03T10:00:00.000Z',
    };

    expect(upsertUserOldestFirst(users, createdUser).map((user) => user.id)).toEqual([
      'user-1',
      'user-2',
      'user-3',
    ]);
  });

  it('replaces the same user id without duplicating it', () => {
    const users: User[] = [
      {
        id: 'user-1',
        email: 'admin@demo.com',
        role: UserRole.ADMIN,
        orgId: 'org-1',
        createdAt: '2026-09-01T10:00:00.000Z',
      },
    ];

    const updatedUser: User = {
      id: 'user-1',
      email: 'admin+updated@demo.com',
      role: UserRole.ADMIN,
      orgId: 'org-1',
      createdAt: '2026-09-01T10:00:00.000Z',
    };

    expect(upsertUserOldestFirst(users, updatedUser)).toEqual([updatedUser]);
  });
});
