import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage();

export function runWithUser(userName, fn) {
  return als.run({ userName }, fn);
}

export function getCurrentUserName() {
  return als.getStore()?.userName ?? null;
}
