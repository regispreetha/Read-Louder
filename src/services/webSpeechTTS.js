/**
 * Web Speech API TTS Service
 * Browser-based text-to-speech using the Web Speech API
 * No external dependencies required - works in all modern browsers
 */
class WebSpeechTTS {
  constructor(options = {}) {
    this.voice = options.voice || null;
    this.speed = options.speed || 1.0;
    this.pitch = options.pitch || 1.0;
    this.volume = options.volume || 1.0;
    this.lang = options.lang || 'en-US';

    // Check if Web Speech API is available
    this.isSupported = 'speechSynthesis' in window;

    if (!this.isSupported) {
      console.warn('Web Speech API is not supported in this browser');
    }

    this.synthesis = window.speechSynthesis;
    this.currentUtterance = null;
    this.availableVoices = [];

    // Load voices when they become available
    this.loadVoices();

    // Some browsers load voices asynchronously
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  /**
   * Load available voices from the browser
   */
  loadVoices() {
    this.availableVoices = this.synthesis.getVoices();

    // If no voice is selected, try to pick a good default
    if (!this.voice && this.availableVoices.length > 0) {
      // Prefer Google voices if available
      const googleVoice = this.availableVoices.find(v =>
        v.name.includes('Google') && v.lang.startsWith('en')
      );

      // Otherwise prefer a native English voice
      const nativeEnglishVoice = this.availableVoices.find(v =>
        v.lang.startsWith('en') && v.localService
      );

      this.voice = googleVoice || nativeEnglishVoice || this.availableVoices[0];
    }
  }

  /**
   * Speak text using Web Speech API
   * @param {string} text - Text to speak
   * @param {Object} options - Speaking options
   * @returns {Promise<Object>}
   */
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Web Speech API is not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);

      // Set voice
      if (this.voice) {
        utterance.voice = this.voice;
      } else if (this.availableVoices.length > 0) {
        utterance.voice = this.availableVoices[0];
      }

      // Set speech properties
      utterance.rate = options.speed || this.speed;
      utterance.pitch = options.pitch || this.pitch;
      utterance.volume = options.volume !== undefined ? options.volume : this.volume;
      utterance.lang = options.lang || this.lang;

      // Event handlers
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve({
          success: true,
          provider: 'webspeech',
          text: text.substring(0, 50) + (text.length > 50 ? '...' : '')
        });
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Store reference and speak
      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop current speech
   */
  stop() {
    if (this.isSupported && this.synthesis.speaking) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
    return { success: true };
  }

  /**
   * Pause current speech
   */
  pause() {
    if (this.isSupported && this.synthesis.speaking) {
      this.synthesis.pause();
    }
    return { success: true };
  }

  /**
   * Resume paused speech
   */
  resume() {
    if (this.isSupported && this.synthesis.paused) {
      this.synthesis.resume();
    }
    return { success: true };
  }

  /**
   * Check if currently speaking
   * @returns {boolean}
   */
  isSpeaking() {
    return this.isSupported && this.synthesis.speaking;
  }

  /**
   * Check if speech is paused
   * @returns {boolean}
   */
  isPaused() {
    return this.isSupported && this.synthesis.paused;
  }

  /**
   * Get available voices
   * @returns {Array}
   */
  getAvailableVoices() {
    if (!this.isSupported) {
      return [];
    }

    return this.availableVoices.map(voice => ({
      id: voice.name,
      name: voice.name,
      language: voice.lang,
      localService: voice.localService,
      default: voice.default,
      provider: 'webspeech',
      voiceURI: voice.voiceURI
    }));
  }

  /**
   * Set voice by name or voice object
   * @param {string|Object} voice
   */
  setVoice(voice) {
    if (typeof voice === 'string') {
      // Find voice by name
      this.voice = this.availableVoices.find(v => v.name === voice);
    } else {
      this.voice = voice;
    }
  }

  /**
   * Update TTS settings
   * @param {Object} settings
   */
  updateSettings(settings) {
    if (settings.voice !== undefined) {
      this.setVoice(settings.voice);
    }
    if (settings.speed !== undefined) {
      this.speed = Math.max(0.1, Math.min(10, settings.speed));
    }
    if (settings.pitch !== undefined) {
      this.pitch = Math.max(0, Math.min(2, settings.pitch));
    }
    if (settings.volume !== undefined) {
      this.volume = Math.max(0, Math.min(1, settings.volume));
    }
    if (settings.lang !== undefined) {
      this.lang = settings.lang;
    }
  }

  /**
   * Get current settings
   * @returns {Object}
   */
  getSettings() {
    return {
      provider: 'webspeech',
      voice: this.voice?.name,
      speed: this.speed,
      pitch: this.pitch,
      volume: this.volume,
      lang: this.lang,
      supported: this.isSupported
    };
  }

  /**
   * Get voices by language
   * @param {string} languageCode - e.g., 'en-US', 'en-GB', 'es-ES'
   * @returns {Array}
   */
  getVoicesByLanguage(languageCode) {
    return this.availableVoices
      .filter(voice => voice.lang.startsWith(languageCode))
      .map(voice => ({
        id: voice.name,
        name: voice.name,
        language: voice.lang,
        localService: voice.localService,
        default: voice.default,
        provider: 'webspeech'
      }));
  }

  /**
   * Check if Web Speech API is supported
   * @returns {boolean}
   */
  static isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }
}

// Export for use in browser modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebSpeechTTS;
}

// Also export as ES6 module for React
if (typeof window !== 'undefined') {
  window.WebSpeechTTS = WebSpeechTTS;
}

export default WebSpeechTTS;
