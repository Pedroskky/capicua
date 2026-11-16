// Genera los efectos y la música (sintetizados, sin derechos de terceros).
// Uso: npm run sounds  →  assets/sounds/*.wav (se suben al repo: EAS compila desde git).
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050;
const TAU = Math.PI * 2;
mkdirSync('assets/sounds', { recursive: true });

// Ruido con semilla: los archivos salen siempre iguales.
let seed = 23;
function noise() {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
}
function rand() {
  return (noise() + 1) / 2;
}

function writeWav(name, samples, peakTarget = 0.9) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0 ? peakTarget / peak : 1;
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * gain)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(`assets/sounds/${name}.wav`, Buffer.concat([header, data]));
}

const buffer = (seconds) => new Float32Array(Math.floor(RATE * seconds));

/** Golpe de ficha de marfil: chasquido seco con dos resonancias agudas y un toque grave de la mesa. */
function addClack(out, at, strength = 1, pitch = 1) {
  const start = Math.floor(at * RATE);
  const len = Math.floor(0.09 * RATE);
  let hp = 0;
  let last = 0;
  for (let i = 0; i < len && start + i < out.length; i++) {
    const t = i / RATE;
    const n = noise();
    hp = 0.6 * (hp + n - last);
    last = n;
    const click = hp * Math.exp(-t * 260);
    const ring = (Math.sin(TAU * 2350 * pitch * t) * 0.6 + Math.sin(TAU * 3900 * pitch * t) * 0.35) * Math.exp(-t * 120);
    const knock = Math.sin(TAU * 210 * t) * Math.exp(-t * 55) * 0.45;
    out[start + i] += (click * 0.9 + ring + knock) * strength;
  }
}

// Clac: una ficha que cae en la mesa (con un rebote muy corto).
{
  const out = buffer(0.16);
  addClack(out, 0, 1);
  addClack(out, 0.028, 0.25, 1.04);
  writeWav('clac', out);
}

// Barajeo: fichas arrastradas por el paño, muchos golpecitos y roce.
{
  const out = buffer(1.3);
  let lp = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    lp += (noise() - lp) * 0.08;
    const swell = Math.sin(Math.PI * Math.min(1, t / 1.3)) ** 0.7;
    out[i] += lp * 0.5 * swell;
  }
  for (let k = 0; k < 46; k++) addClack(out, rand() * 1.2, 0.15 + rand() * 0.35, 0.85 + rand() * 0.3);
  writeWav('shuffle', out, 0.8);
}

// Paso: dos toques con los nudillos en la mesa.
{
  const out = buffer(0.42);
  const knock = (at) => {
    const start = Math.floor(at * RATE);
    let lp = 0;
    for (let i = 0; i < 0.14 * RATE; i++) {
      const t = i / RATE;
      lp += (noise() - lp) * 0.2;
      out[start + i] += (Math.sin(TAU * 150 * t) * 0.8 + Math.sin(TAU * 320 * t) * 0.3 + lp * 0.6) * Math.exp(-t * 38);
    }
  };
  knock(0);
  knock(0.17);
  writeWav('pass', out, 0.85);
}

// Dominó: la última ficha de golpe y un acorde alegre.
{
  const out = buffer(1.6);
  addClack(out, 0, 1.4, 0.92);
  addClack(out, 0.03, 0.4);
  const pluck = (f, at, amp) => {
    const start = Math.floor(at * RATE);
    for (let i = 0; start + i < out.length; i++) {
      const t = i / RATE;
      out[start + i] += (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2 * t) + 0.15 * Math.sin(TAU * f * 3 * t)) * Math.exp(-t * 3.2) * amp;
    }
  };
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => pluck(f, 0.12 + i * 0.07, 0.35));
  writeWav('domino', out);
}

// Música: rasgueo en 3/4 de un cuatro (cuerda pulsada, Karplus-Strong) con bajo, en bucle de 16 compases.
{
  const BPM = 132;
  const beat = 60 / BPM;
  const bars = 16;
  const seconds = bars * 3 * beat;
  const out = buffer(seconds);
  const note = (midi) => 440 * 2 ** ((midi - 69) / 12);

  /** Cuerda pulsada que se puede repetir en bucle (la cola que se sale del final vuelve al principio). */
  const pluck = (f, at, amp, decay = 0.996, bright = 0.5) => {
    const period = Math.max(2, Math.round(RATE / f));
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i++) ring[i] = noise() * bright + (i < period / 2 ? 1 : -1) * (1 - bright) * 0.5;
    const start = Math.floor(at * RATE);
    const len = Math.floor(1.6 * RATE);
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const next = (idx + 1) % period;
      const v = ring[idx];
      ring[idx] = (v + ring[next]) * 0.5 * decay;
      idx = next;
      out[(start + i) % out.length] += v * amp * Math.min(1, i / 30);
    }
  };

  // I – IV – V7 – I en Re mayor (re, sol, la7, re), dos veces y una variación.
  const chords = {
    D: [62, 66, 69, 74],
    G: [62, 67, 71, 74],
    A7: [61, 64, 67, 69],
    Bm: [62, 66, 71, 74],
    Em: [64, 67, 71, 76],
  };
  const bass = { D: 50, G: 43, A7: 45, Bm: 47, Em: 40 };
  const progression = ['D', 'D', 'G', 'G', 'A7', 'A7', 'D', 'D', 'Bm', 'Bm', 'Em', 'Em', 'A7', 'A7', 'D', 'A7'];
  progression.forEach((name, bar) => {
    const t0 = bar * 3 * beat;
    const chord = chords[name];
    // Bajo en el 1 y en el 3.
    pluck(note(bass[name]), t0, 0.55, 0.997, 0.2);
    pluck(note(bass[name] + 7), t0 + 2 * beat, 0.35, 0.997, 0.2);
    // Rasgueo: abajo en cada tiempo y un repique en el «y» del 2.
    const strum = (at, amp, up) => {
      const order = up ? [...chord].reverse() : chord;
      order.forEach((m, i) => pluck(note(m), at + i * 0.012, amp, 0.994, 0.55));
    };
    strum(t0, 0.22, false);
    strum(t0 + beat, 0.16, false);
    strum(t0 + 1.5 * beat, 0.12, true);
    strum(t0 + 2 * beat, 0.16, false);
    strum(t0 + 2.5 * beat, 0.1, true);
    // Una maraca suave en cada corchea.
    for (let k = 0; k < 6; k++) {
      const start = Math.floor((t0 + k * beat * 0.5) * RATE);
      let hp = 0;
      let last = 0;
      for (let i = 0; i < 0.05 * RATE; i++) {
        const n = noise();
        hp = 0.7 * (hp + n - last);
        last = n;
        out[(start + i) % out.length] += hp * Math.exp(-(i / RATE) * 70) * (k % 2 === 0 ? 0.06 : 0.04);
      }
    }
  });
  writeWav('music', out, 0.7);
}

console.log('Sonidos generados en assets/sounds/');
