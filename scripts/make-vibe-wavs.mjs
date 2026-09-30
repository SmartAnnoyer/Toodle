import fs from 'node:fs';
import path from 'node:path';

const rate = 22050;
const seconds = 14;
const count = rate * seconds;
const outDir = path.resolve('client/public/audio/music');

function envelope(index) {
  const attack = rate * 0.35;
  const release = count - rate * 0.7;
  if (index < attack) return index / attack;
  if (index > release) return Math.max(0, (count - index) / (count - release));
  return 1;
}

function melody(notes, step, gain, drone) {
  const samples = new Float64Array(count);
  for (let index = 0; index < count; index += 1) {
    const time = index / rate;
    const note = notes[Math.floor(time / step) % notes.length];
    const local = (time % step) / step;
    const shape = Math.sin(Math.min(1, local * 1.6) * Math.PI) * (1 - local * 0.4);
    const voice = Math.sin(2 * Math.PI * note * time) + Math.sin(2 * Math.PI * note * 2 * time) * 0.12;
    const bed = Math.sin(2 * Math.PI * drone * time) * 0.22;
    samples[index] = (voice * shape * gain + bed * gain) * envelope(index);
  }
  return samples;
}

function writeWav(file, samples) {
  const data = Buffer.alloc(44 + samples.length * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + samples.length * 2, 4);
  data.write('WAVE', 8);
  data.write('fmt ', 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    data.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }
  fs.writeFileSync(path.join(outDir, file), data);
}

fs.mkdirSync(outDir, { recursive: true });
writeWav('night-window.wav', melody([220, 261.63, 293.66, 329.63, 392], 0.7, 0.34, 110));
writeWav('pink-room.wav', melody([261.63, 329.63, 392, 440, 392, 329.63], 0.45, 0.32, 130.81));
writeWav('cyan-stairs.wav', melody([329.63, 392, 493.88, 587.33, 493.88, 392], 0.22, 0.28, 164.81));
writeWav('soft-exit.wav', melody([220, 261.63, 246.94, 196], 0.85, 0.3, 98));
console.log('wrote 4 original loops');
