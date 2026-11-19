/** No confirma el inicio hasta recibir éxito; un error o tiempo agotado permite reintentar. */
export async function waitForAdInitialization(
  start: () => Promise<boolean>,
  timeoutMs: number,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(start),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } catch {
    return false;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Comparte intentos simultáneos y precarga anuncios una sola vez, solo tras un inicio confirmado. */
export function createAdInitialization(
  start: (testMode: boolean) => Promise<boolean>,
  onReady: () => void,
): (testMode: boolean) => Promise<boolean> {
  let initialized = false;
  let pending: Promise<boolean> | null = null;
  return (testMode) => {
    if (initialized) return Promise.resolve(true);
    if (pending) return pending;
    pending = Promise.resolve()
      .then(() => start(testMode))
      .then((ok) => {
        if (!ok) return false;
        onReady();
        initialized = true;
        return true;
      })
      .catch(() => false)
      .finally(() => { pending = null; });
    return pending;
  };
}
