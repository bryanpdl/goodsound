import * as Tone from 'tone';
import type { SoundCustomizationSettings, Sound, CustomizableSound } from './types';

interface LayerData {
  sound: Sound;
  volume: number;
  delay: number;
}

class SoundManager {
  private context: AudioContext | null = null;
  public sounds: Map<string, HTMLAudioElement> = new Map();
  private audioSources: Map<string, MediaElementAudioSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  
  // Separate maps for customized playback
  private customSounds: Map<string, HTMLAudioElement> = new Map();
  private customAudioSources: Map<string, MediaElementAudioSourceNode> = new Map();
  private customGainNodes: Map<string, GainNode> = new Map();

  async loadSound(id: string, path: string, forCustomization: boolean = false) {
    if (!this.context) {
      this.context = new AudioContext();
    }

    try {
      // Clean up existing sound if any
      this.cleanupSound(id, forCustomization);

      // Create and set up audio element
      const audio = new Audio(path);
      audio.crossOrigin = "anonymous";
      await new Promise((resolve) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.load();
      });

      // Create and connect nodes
      const source = this.context.createMediaElementSource(audio);
      const gainNode = this.context.createGain();
      
      source.connect(gainNode);
      gainNode.connect(this.context.destination);

      // Store references in appropriate maps
      if (forCustomization) {
        this.customSounds.set(id, audio);
        this.customAudioSources.set(id, source);
        this.customGainNodes.set(id, gainNode);
      } else {
        this.sounds.set(id, audio);
        this.audioSources.set(id, source);
        this.gainNodes.set(id, gainNode);
      }
    } catch (error) {
      console.error('Error loading sound:', error);
      this.cleanupSound(id, forCustomization);
      throw error;
    }
  }

  private cleanupSound(id: string, forCustomization: boolean = false) {
    const maps = forCustomization 
      ? {
          sounds: this.customSounds,
          sources: this.customAudioSources,
          gains: this.customGainNodes
        }
      : {
          sounds: this.sounds,
          sources: this.audioSources,
          gains: this.gainNodes
        };

    // Stop playback
    const audio = maps.sounds.get(id);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    // Disconnect and remove nodes
    const source = maps.sources.get(id);
    const gainNode = maps.gains.get(id);
    
    if (source) {
      source.disconnect();
      maps.sources.delete(id);
    }
    
    if (gainNode) {
      gainNode.disconnect();
      maps.gains.delete(id);
    }

    // Remove audio element
    maps.sounds.delete(id);
  }

  playSound(id: string, forCustomization: boolean = false) {
    const audio = forCustomization ? this.customSounds.get(id) : this.sounds.get(id);
    if (!audio) return;

    // Reset audio to start
    audio.currentTime = 0;
    audio.play().catch(console.error);
  }

  stopSound(id: string, forCustomization: boolean = false) {
    const audio = forCustomization ? this.customSounds.get(id) : this.sounds.get(id);
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
  }

  updateSoundCustomization(id: string, settings: SoundCustomizationSettings) {
    if (!settings) return;
    
    const audio = this.customSounds.get(id);
    const gainNode = this.customGainNodes.get(id);
    if (!audio || !gainNode) return;

    // Apply volume
    gainNode.gain.value = settings.volume / 100;

    // Apply pitch and speed
    const semitoneChange = settings.pitch;
    const pitchShiftValue = Math.pow(2, semitoneChange / 12);
    audio.preservesPitch = false;
    audio.playbackRate = (settings.speed / 100) * pitchShiftValue;
  }

  setVolume(id: string, volume: number, forCustomization: boolean = false) {
    const gainNode = forCustomization ? this.customGainNodes.get(id) : this.gainNodes.get(id);
    if (!gainNode) return;
    gainNode.gain.value = volume / 100;
  }

  dispose() {
    // Clean up all sounds
    for (const id of this.sounds.keys()) {
      this.cleanupSound(id);
    }

    // Close audio context
    if (this.context) {
      this.context.close();
      this.context = null;
    }

    // Clear all maps
    this.sounds.clear();
    this.audioSources.clear();
    this.gainNodes.clear();
    this.customSounds.clear();
    this.customAudioSources.clear();
    this.customGainNodes.clear();
  }

  async combineLayeredSounds(layers: LayerData[]): Promise<Blob> {
    if (!this.context) {
      this.context = new AudioContext();
    }

    // Create an offline context for rendering
    const totalDuration = Math.max(...layers.map(layer => layer.delay)) + 2; // Add 2 seconds buffer
    const offlineContext = new OfflineAudioContext(2, this.context.sampleRate * totalDuration, this.context.sampleRate);

    try {
      // Load and process each layer
      const sourceNodes = await Promise.all(layers.map(async (layer) => {
        const response = await fetch(layer.sound.path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer);
        
        const source = offlineContext.createBufferSource();
        const gainNode = offlineContext.createGain();
        
        source.buffer = audioBuffer;
        gainNode.gain.value = layer.volume / 100;
        
        source.connect(gainNode);
        gainNode.connect(offlineContext.destination);
        
        // Return the source node so we can start it later
        return { source, delay: layer.delay };
      }));

      // Start all sources with their respective delays
      sourceNodes.forEach(({ source, delay }) => {
        source.start(delay);
      });

      // Render the audio
      const renderedBuffer = await offlineContext.startRendering();

      // Convert to WAV
      const wavBlob = await this.audioBufferToWav(renderedBuffer);
      return wavBlob;
    } catch (error) {
      console.error('Error combining layered sounds:', error);
      throw error;
    }
  }

  private audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
    // Basic WAV encoding - you might want to use a more robust solution
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const dataLength = buffer.length * numChannels * (bitDepth / 8);
    const headerLength = 44;
    const totalLength = headerLength + dataLength;
    
    const arrayBuffer = new ArrayBuffer(totalLength);
    const dataView = new DataView(arrayBuffer);
    
    // WAV header
    this.writeWavHeader(dataView, {
      numChannels,
      sampleRate,
      bitDepth,
      dataLength
    });
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        const sample16 = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        dataView.setInt16(offset, sample16, true);
        offset += 2;
      }
    }
    
    return Promise.resolve(new Blob([arrayBuffer], { type: 'audio/wav' }));
  }

  private writeWavHeader(dataView: DataView, {
    numChannels,
    sampleRate,
    bitDepth,
    dataLength
  }: {
    numChannels: number;
    sampleRate: number;
    bitDepth: number;
    dataLength: number;
  }) {
    // Write WAV header - simplified version
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        dataView.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    dataView.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    dataView.setUint32(16, 16, true);
    dataView.setUint16(20, 1, true);
    dataView.setUint16(22, numChannels, true);
    dataView.setUint32(24, sampleRate, true);
    dataView.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    dataView.setUint16(32, numChannels * (bitDepth / 8), true);
    dataView.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    dataView.setUint32(40, dataLength, true);
  }

  async exportSound(id: string, settings: SoundCustomizationSettings): Promise<Blob> {
    if (!this.context) {
      this.context = new AudioContext();
    }

    const audio = this.sounds.get(id);
    if (!audio) {
      throw new Error('Sound not found');
    }

    try {
      // Create an offline context for rendering
      const duration = audio.duration;
      const offlineContext = new OfflineAudioContext(2, this.context.sampleRate * duration, this.context.sampleRate);

      // Load the audio into the offline context
      const response = await fetch(audio.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer);

      // Create and connect nodes
      const source = offlineContext.createBufferSource();
      const gainNode = offlineContext.createGain();

      source.buffer = audioBuffer;
      source.playbackRate.value = (settings.speed / 100) * Math.pow(2, settings.pitch / 12);
      gainNode.gain.value = settings.volume / 100;

      source.connect(gainNode);
      gainNode.connect(offlineContext.destination);

      // Render the audio
      source.start(0);
      const renderedBuffer = await offlineContext.startRendering();

      // Convert to WAV
      return await this.audioBufferToWav(renderedBuffer);
    } catch (error) {
      console.error('Error exporting sound:', error);
      throw error;
    }
  }

  stopAllSounds(): void {
    // Convert the keys iterator to an array before iterating
    Array.from(this.sounds.keys()).forEach((soundId: string) => {
      this.stopSound(soundId);
    });
  }
}

export const soundManager = new SoundManager();