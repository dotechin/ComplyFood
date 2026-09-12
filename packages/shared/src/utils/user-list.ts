import type { User } from '../types/user';

export function sortUsersOldestFirst(users: User[]) {
  return [...users].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function upsertUserOldestFirst(users: User[], createdUser: User) {
  return sortUsersOldestFirst([...users.filter((user) => user.id !== createdUser.id), createdUser]);
}
