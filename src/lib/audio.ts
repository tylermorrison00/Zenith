let context: AudioContext | null = null;
let activeNodes: AudioNode[] = [];

function makeNoiseBuffer(ctx: AudioContext, brown: boolean): AudioBuffer {
  const seconds = 5;
  const buffer = ctx.createBuffer(1, seconds * ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.018 * white) / 1.018;
      data[i] = last * 3.5;
    } else {
      data[i] = white * (0.35 + Math.random() * 0.18);
    }
  }
  return buffer;
}

export async function startAmbientSound(): Promise<void> {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is not available in this browser.');
  if (!context) context = new AudioContextClass();
  await context.resume();
  stopAmbientSound();

  const master = context.createGain();
  master.gain.value = 0.42;
  master.connect(context.destination);

  const rain = context.createBufferSource();
  rain.buffer = makeNoiseBuffer(context, false);
  rain.loop = true;
  const rainFilter = context.createBiquadFilter();
  rainFilter.type = 'lowpass';
  rainFilter.frequency.value = 1650;
  const rainGain = context.createGain();
  rainGain.gain.value = 0.27;
  rain.connect(rainFilter).connect(rainGain).connect(master);

  const brown = context.createBufferSource();
  brown.buffer = makeNoiseBuffer(context, true);
  brown.loop = true;
  const brownFilter = context.createBiquadFilter();
  brownFilter.type = 'lowpass';
  brownFilter.frequency.value = 360;
  const brownGain = context.createGain();
  brownGain.gain.value = 0.34;
  brown.connect(brownFilter).connect(brownGain).connect(master);

  rain.start();
  brown.start();
  activeNodes = [rain, rainFilter, rainGain, brown, brownFilter, brownGain, master];
}

export function stopAmbientSound(): void {
  for (const node of activeNodes) {
    if (node instanceof AudioBufferSourceNode) {
      try { node.stop(); } catch { /* already stopped */ }
    }
    try { node.disconnect(); } catch { /* detached */ }
  }
  activeNodes = [];
}
