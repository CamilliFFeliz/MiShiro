import { IndexedDbApplicationRepository } from "./indexeddb-repository.js";

export function createApplicationRepository(repositoryConfiguration) {
  return new IndexedDbApplicationRepository(repositoryConfiguration);
}
