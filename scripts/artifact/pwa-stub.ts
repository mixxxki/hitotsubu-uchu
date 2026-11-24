// Artifact 版では Service Worker を使わないため何もしない
export function registerSW(_opts?: unknown): () => Promise<void> {
  return async () => {};
}
