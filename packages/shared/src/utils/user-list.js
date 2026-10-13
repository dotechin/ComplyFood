"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortUsersOldestFirst = sortUsersOldestFirst;
exports.upsertUserOldestFirst = upsertUserOldestFirst;
function sortUsersOldestFirst(users) {
    return [...users].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}
function upsertUserOldestFirst(users, createdUser) {
    return sortUsersOldestFirst([...users.filter((user) => user.id !== createdUser.id), createdUser]);
}
//# sourceMappingURL=user-list.js.map