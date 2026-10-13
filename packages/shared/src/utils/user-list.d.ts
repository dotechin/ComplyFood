import type { User } from '../types/user';
export declare function sortUsersOldestFirst(users: User[]): User[];
export declare function upsertUserOldestFirst(users: User[], createdUser: User): User[];
