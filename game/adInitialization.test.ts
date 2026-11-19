import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createAdInitialization, waitForAdInitialization } from './adInitialization';

test('inicio: el SDK sin respuesta no se considera inicializado', async () => {
  assert.equal(await waitForAdInitialization(() => new Promise(() => {}), 0), false);
});
test('inicio: conserva el resultado real y controla errores', async () => {
  assert.equal(await waitForAdInitialization(async () => true, 100), true);
  assert.equal(await waitForAdInitialization(async () => false, 100), false);
  assert.equal(await waitForAdInitialization(async () => { throw new Error('SDK'); }, 100), false);
});
test('inicio: llamadas simultáneas comparten el intento y la precarga', async () => {
  let resolve!: (ok: boolean) => void;
  let attempts = 0;
  let loads = 0;
  let mode: boolean | undefined;
  const init = createAdInitialization((testMode) => {
    attempts++;
    mode = testMode;
    return new Promise<boolean>((done) => { resolve = done; });
  }, () => { loads++; });
  const first = init(true);
  const second = init(true);
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(attempts, 1);
  assert.equal(loads, 0);
  resolve(true);
  assert.equal(await first, true);
  assert.equal(mode, true);
  assert.equal(loads, 1);
  assert.equal(await init(true), true);
  assert.equal(attempts, 1);
  assert.equal(loads, 1);
});
test('inicio: un fallo no precarga y permite un nuevo intento', async () => {
  let attempts = 0;
  let loads = 0;
  const init = createAdInitialization(async () => ++attempts > 1, () => { loads++; });
  assert.equal(await init(false), false);
  assert.equal(loads, 0);
  assert.equal(await init(false), true);
  assert.equal(attempts, 2);
  assert.equal(loads, 1);
});
test('inicio: una excepción no bloquea el siguiente intento', async () => {
  let attempts = 0;
  const init = createAdInitialization(async () => {
    if (++attempts === 1) throw new Error('SDK no disponible');
    return true;
  }, () => {});
  assert.equal(await init(false), false);
  assert.equal(await init(false), true);
});
test('inicio: una respuesta tardía tras timeout no precarga anuncios', async () => {
  let finish!: (ok: boolean) => void;
  let loads = 0;
  const init = createAdInitialization(() => waitForAdInitialization(
    () => new Promise<boolean>((resolve) => { finish = resolve; }), 0,
  ), () => { loads++; });
  assert.equal(await init(true), false);
  finish(true);
  await Promise.resolve();
  assert.equal(loads, 0);
});
