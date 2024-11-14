import type { SoundCustomizationSettings } from '@/lib/types';

interface GeneratorOptions {
  baseFrequency?: number;
  harmonicity?: number;
  modulation?: number;
  resonance?: number;
}

export class SoundGenerator {
  private context: AudioContext | null = null;
  private initialized: boolean = false;
  private sourceBuffer: AudioBuffer | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      this.context = new AudioContext();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw error;
    }
  }

  async loadSound(url: string) {
    if (!this.context) await this.initialize();
    if (!this.context) throw new Error('AudioContext not initialized');

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.sourceBuffer = await this.context.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Failed to load sound:', error);
      throw error;
    }
  }

  async generateVariant(
    settings: SoundCustomizationSettings,
    options: GeneratorOptions = {}
  ): Promise<ArrayBuffer> {
    if (!this.initialized || !this.context || !this.sourceBuffer) {
      throw new Error('Sound not loaded');
    }

    try {
      // Create offline context for rendering
      const offlineContext = new OfflineAudioContext(
        this.sourceBuffer.numberOfChannels,
        Math.ceil(this.sourceBuffer.length * (settings.duration / 100)),
        this.sourceBuffer.sampleRate
      );

      // Create source
      const source = offlineContext.createBufferSource();
      source.buffer = this.sourceBuffer;

      // Create gain node for volume
      const gainNode = offlineContext.createGain();
      gainNode.gain.value = settings.volume / 100;

      // Apply pitch and speed separately
      const pitchRate = Math.pow(2, settings.pitch / 12); // Semitones to rate
      const speedRate = settings.speed / 100; // Percentage to rate
      const combinedRate = pitchRate * speedRate;
      source.playbackRate.value = combinedRate;

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(offlineContext.destination);

      // Start the source
      source.start(0);

      // Render and return
      const renderedBuffer = await offlineContext.startRendering();
      return this.audioBufferToWav(renderedBuffer);
    } catch (error) {
      console.error('Failed to generate variant:', error);
      throw error;
    }
  }

  private audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    const channels = [];
    let sample = 0;
    let offset = 0;
    let pos = 0;

    // Get channels
    for (let i = 0; i < numOfChan; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    // Write WAV header
    setUint32(0x46464952);                            // "RIFF"
    setUint32(36 + length);                           // file length
    setUint32(0x45564157);                            // "WAVE"
    setUint32(0x20746D66);                            // "fmt " chunk
    setUint32(16);                                    // length = 16
    setUint16(1);                                     // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                         // block-align
    setUint16(16);                                    // 16-bit
    setUint32(0x61746164);                            // "data" - chunk
    setUint32(length);                                // chunk length

    // Write interleaved data
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        sample = channels[ch][i] * 1;
        // Clamp between -1 and 1
        sample = Math.max(-1, Math.min(1, sample));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
    }

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }

    return buffer;
  }

  async generateVariants(
    baseSettings: SoundCustomizationSettings,
    soundUrl: string,
    count: number = 3
  ): Promise<ArrayBuffer[]> {
    if (!this.sourceBuffer) {
      await this.loadSound(soundUrl);
    }

    const variants: ArrayBuffer[] = [];
    
    try {
      for (let i = 0; i < count; i++) {
        const variantSettings = this.createVariantSettings(baseSettings, i);
        const variant = await this.generateVariant(variantSettings);
        // Create a new copy of the ArrayBuffer for each variant
        variants.push(variant.slice(0));
      }
      return variants;
    } catch (error) {
      console.error('Failed to generate variants:', error);
      throw error;
    }
  }

  private createVariantSettings(
    base: SoundCustomizationSettings,
    index: number
  ): SoundCustomizationSettings {
    // Create more subtle variations
    const pitchVariations = [-1, 0, 1];
    const durationVariations = [0.95, 1, 1.05];
    const volumeVariations = [0.9, 1, 1.1];
    const speedVariations = [0.95, 1, 1.05];

    return {
      pitch: base.pitch + pitchVariations[index % pitchVariations.length],
      duration: base.duration * durationVariations[index % durationVariations.length],
      volume: base.volume * volumeVariations[index % volumeVariations.length],
      speed: base.speed * speedVariations[index % speedVariations.length],
    };
  }
}

export const soundGenerator = new SoundGenerator();