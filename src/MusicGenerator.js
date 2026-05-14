/**
 * Procedural Background Music Generator
 * Generates royalty-free, no-copyright background scores using Web Audio API.
 * All music is synthesized in real-time — no external files needed.
 */

// Musical scales (MIDI note numbers)
const SCALES = {
  cMajor: [60, 62, 64, 65, 67, 69, 71, 72],
  aMinor: [57, 59, 60, 62, 64, 65, 67, 69],
  dMinor: [50, 53, 57, 60, 62, 65, 69, 72],
  gMajor: [55, 59, 62, 67, 71, 74, 79, 83],
  pentatonic: [60, 63, 65, 67, 70, 72, 75, 77],
  japaneseScale: [60, 61, 65, 67, 68, 72, 73, 77],
};

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Creates a convolver reverb node
 */
function createReverb(ctx, duration = 2, decay = 2) {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

// ─── TRACK GENERATORS ────────────────────────────────────────────────

/**
 * Ambient Dreamscape — soft pads with slow evolving tones
 */
function generateAmbient(ctx, dest, duration) {
  const nodes = [];
  const scale = SCALES.pentatonic;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.3;
  const reverb = createReverb(ctx, 3, 1.5);
  masterGain.connect(reverb);
  reverb.connect(dest);

  // Pad layer — 3 detuned oscillators
  for (let layer = 0; layer < 3; layer++) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const note = scale[layer % scale.length] + (layer < 2 ? 0 : 12);
    osc.frequency.value = midiToFreq(note);
    osc.detune.value = (layer - 1) * 8;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    // Slow swell in/out
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 3);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    nodes.push(osc, gain);
  }

  // Evolving melody pings
  const pingInterval = setInterval(() => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const note = pickRandom(scale) + pickRandom([0, 12, 24]);
    osc.frequency.value = midiToFreq(note);

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 3);
    nodes.push(osc);
  }, 2000 + Math.random() * 1500);

  return {
    nodes,
    stop: () => {
      clearInterval(pingInterval);
      const now = ctx.currentTime;
      masterGain.gain.linearRampToValueAtTime(0, now + 1);
      setTimeout(() => {
        nodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} });
        masterGain.disconnect();
        reverb.disconnect();
      }, 1200);
    }
  };
}

/**
 * Lo-Fi Chill — warm filtered beats with vinyl crackle
 */
function generateLoFi(ctx, dest, duration) {
  const nodes = [];
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.35;
  const reverb = createReverb(ctx, 2, 2);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 1;

  masterGain.connect(filter);
  filter.connect(reverb);
  reverb.connect(dest);

  // Warm chord pad
  const chords = [
    [60, 64, 67], // C major
    [57, 60, 64], // Am
    [53, 57, 60], // F
    [55, 59, 62], // G
  ];
  let chordIdx = 0;
  const padGain = ctx.createGain();
  padGain.gain.value = 0.12;
  padGain.connect(masterGain);

  const activeOscs = [];
  const playChord = () => {
    // Fade out previous
    activeOscs.forEach(o => {
      try { o.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5); } catch(e){}
      setTimeout(() => { try { o.osc.stop(); o.osc.disconnect(); } catch(e){} }, 600);
    });
    activeOscs.length = 0;

    const chord = chords[chordIdx % chords.length];
    chordIdx++;
    chord.forEach(note => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = midiToFreq(note);
      osc.detune.value = Math.random() * 10 - 5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.8);
      osc.connect(g);
      g.connect(padGain);
      osc.start();
      activeOscs.push({ osc, gain: g });
      nodes.push(osc);
    });
  };
  playChord();
  const chordInterval = setInterval(playChord, 4000);

  // Soft kick-like pulse
  const kickInterval = setInterval(() => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
    nodes.push(osc);
  }, 1000);

  // Vinyl crackle
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.97 ? 0.3 : 0.01);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.04;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 3000;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(dest); // bypass reverb for crackle
  noise.start();
  nodes.push(noise);

  return {
    nodes,
    stop: () => {
      clearInterval(chordInterval);
      clearInterval(kickInterval);
      const now = ctx.currentTime;
      masterGain.gain.linearRampToValueAtTime(0, now + 1);
      noiseGain.gain.linearRampToValueAtTime(0, now + 1);
      setTimeout(() => {
        nodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} });
        activeOscs.forEach(o => { try { o.osc.stop(); } catch(e){} });
        masterGain.disconnect(); filter.disconnect(); reverb.disconnect();
        noiseGain.disconnect(); noiseFilter.disconnect();
      }, 1200);
    }
  };
}

/**
 * Cinematic Tension — deep drones with rising energy
 */
function generateCinematic(ctx, dest, duration) {
  const nodes = [];
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.3;
  const reverb = createReverb(ctx, 4, 1);
  masterGain.connect(reverb);
  reverb.connect(dest);

  // Deep drone
  const drone = ctx.createOscillator();
  drone.type = 'sawtooth';
  drone.frequency.value = midiToFreq(36); // C2
  const droneFilter = ctx.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 200;
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.15;
  drone.connect(droneFilter);
  droneFilter.connect(droneGain);
  droneGain.connect(masterGain);
  drone.start();
  nodes.push(drone);

  // Sub bass pulse
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = midiToFreq(24); // C1
  const subGain = ctx.createGain();
  subGain.gain.value = 0.1;
  sub.connect(subGain);
  subGain.connect(masterGain);
  sub.start();
  nodes.push(sub);

  // Eerie high tones
  const highInterval = setInterval(() => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const note = pickRandom(SCALES.aMinor) + 24;
    osc.frequency.value = midiToFreq(note);
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.05, now + 1);
    g.gain.linearRampToValueAtTime(0, now + 4);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 4.5);
    nodes.push(osc);
  }, 3000);

  // Boom impacts
  const boomInterval = setInterval(() => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 1.5);
    nodes.push(osc);
  }, 6000);

  return {
    nodes,
    stop: () => {
      clearInterval(highInterval);
      clearInterval(boomInterval);
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => {
        nodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} });
        masterGain.disconnect(); reverb.disconnect(); droneFilter.disconnect();
      }, 1200);
    }
  };
}

/**
 * Upbeat Energy — bright arpeggios with rhythm
 */
function generateUpbeat(ctx, dest, duration) {
  const nodes = [];
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.3;
  const reverb = createReverb(ctx, 1.5, 2.5);
  masterGain.connect(reverb);
  reverb.connect(dest);

  const scale = SCALES.gMajor;
  let arpIdx = 0;

  // Fast arpeggio
  const arpInterval = setInterval(() => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    const note = scale[arpIdx % scale.length];
    arpIdx++;
    osc.frequency.value = midiToFreq(note);
    const arpFilter = ctx.createBiquadFilter();
    arpFilter.type = 'lowpass';
    arpFilter.frequency.value = 2000;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(arpFilter);
    arpFilter.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
    nodes.push(osc);
  }, 250);

  // Bass line
  const bassNotes = [55, 55, 59, 62]; // G2 pattern
  let bassIdx = 0;
  const bassInterval = setInterval(() => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = midiToFreq(bassNotes[bassIdx % bassNotes.length] - 12);
    bassIdx++;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
    nodes.push(osc);
  }, 500);

  // Hi-hat like noise
  const hatInterval = setInterval(() => {
    const bufLen = ctx.sampleRate * 0.05;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 8000;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    src.connect(hpf);
    hpf.connect(g);
    g.connect(masterGain);
    src.start(now);
    nodes.push(src);
  }, 250);

  return {
    nodes,
    stop: () => {
      clearInterval(arpInterval);
      clearInterval(bassInterval);
      clearInterval(hatInterval);
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      setTimeout(() => {
        nodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} });
        masterGain.disconnect(); reverb.disconnect();
      }, 700);
    }
  };
}

/**
 * Zen / Meditation — gentle bells and soft pads
 */
function generateZen(ctx, dest, duration) {
  const nodes = [];
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.25;
  const reverb = createReverb(ctx, 5, 0.8);
  masterGain.connect(reverb);
  reverb.connect(dest);

  const scale = SCALES.japaneseScale;

  // Singing bowl / bell tones
  const bellInterval = setInterval(() => {
    const note = pickRandom(scale) + pickRandom([0, 12]);
    const freq = midiToFreq(note);
    const now = ctx.currentTime;

    // Main tone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    // Harmonic
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2.01; // slightly detuned harmonic

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.1, now + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, now + 5);

    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.04, now + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 3);

    osc.connect(g); g.connect(masterGain);
    osc2.connect(g2); g2.connect(masterGain);
    osc.start(now); osc.stop(now + 5.5);
    osc2.start(now); osc2.stop(now + 3.5);
    nodes.push(osc, osc2);
  }, 3500 + Math.random() * 2000);

  // Breathy pad
  const padOsc = ctx.createOscillator();
  padOsc.type = 'sine';
  padOsc.frequency.value = midiToFreq(scale[0] - 12);
  const padGain = ctx.createGain();
  padGain.gain.value = 0.06;
  // Slow LFO for breathing effect
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.04;
  lfo.connect(lfoGain);
  lfoGain.connect(padGain.gain);
  padOsc.connect(padGain);
  padGain.connect(masterGain);
  padOsc.start();
  lfo.start();
  nodes.push(padOsc, lfo);

  return {
    nodes,
    stop: () => {
      clearInterval(bellInterval);
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      setTimeout(() => {
        nodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} });
        masterGain.disconnect(); reverb.disconnect();
      }, 1700);
    }
  };
}

// ─── EXPORTS ─────────────────────────────────────────────────────────

export const BUILTIN_TRACKS = [
  {
    id: 'ambient',
    name: '🌌 Ambient Dreamscape',
    description: 'Soft evolving pads — great for inspirational content',
    generator: generateAmbient,
  },
  {
    id: 'lofi',
    name: '🎧 Lo-Fi Chill',
    description: 'Warm filtered beats with vinyl crackle',
    generator: generateLoFi,
  },
  {
    id: 'cinematic',
    name: '🎬 Cinematic Tension',
    description: 'Deep drones & impacts — dramatic storytelling',
    generator: generateCinematic,
  },
  {
    id: 'upbeat',
    name: '⚡ Upbeat Energy',
    description: 'Bright arpeggios & rhythm — motivational vibes',
    generator: generateUpbeat,
  },
  {
    id: 'zen',
    name: '🔔 Zen Meditation',
    description: 'Gentle bells & breathing pads — calming feel',
    generator: generateZen,
  },
];

/**
 * Start a built-in track.
 * @param {string} trackId — one of the BUILTIN_TRACKS ids
 * @param {AudioContext} audioContext
 * @param {MediaStreamAudioDestinationNode} audioDest — for recording
 * @param {number} volume — 0-1
 * @returns {{ stop: () => void }} — call stop() to end the music
 */
export function startBuiltinTrack(trackId, audioContext, audioDest, volume = 0.15) {
  const track = BUILTIN_TRACKS.find(t => t.id === trackId);
  if (!track) return null;

  // Volume control
  const volumeGain = audioContext.createGain();
  volumeGain.gain.value = volume;
  volumeGain.connect(audioDest);              // → recording
  volumeGain.connect(audioContext.destination); // → speakers

  const instance = track.generator(audioContext, volumeGain, 60);

  return {
    stop: () => {
      instance.stop();
      setTimeout(() => {
        try { volumeGain.disconnect(); } catch(e) {}
      }, 2000);
    }
  };
}
