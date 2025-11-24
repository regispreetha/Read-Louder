const say = require('say');
const { prepareForTTS } = require('../utils/textCleaner');

/**
 * Text-to-Speech Engine
 * Supports multiple TTS providers:
 * - System voices (macOS, Windows, Linux)
 * - Web Speech API (browser-based)
 * - Azure Cognitive Services
 * - Google Cloud TTS
 * - Amazon Polly
 * - OpenAI TTS
 */
class TTSEngine {
  constructor(options = {}) {
    this.provider = options.provider || 'system';
    this.voice = options.voice || null;
    this.speed = options.speed || 1.0;
    this.pitch = options.pitch || 0;
    this.volume = options.volume || 80;

    // Provider-specific clients
    this.azureClient = null;
    this.googleClient = null;
    this.pollyClient = null;
    this.openaiClient = null;
    this.webSpeechClient = null;

    this.isInitialized = false;
    this.isBrowser = typeof window !== 'undefined';
  }

  /**
   * Initialize TTS engine with selected provider
   */
  async initialize() {
    try {
      switch (this.provider) {
        case 'webspeech':
          await this.initializeWebSpeech();
          break;
        case 'azure':
          await this.initializeAzure();
          break;
        case 'google':
          await this.initializeGoogle();
          break;
        case 'polly':
          await this.initializePolly();
          break;
        case 'openai':
          await this.initializeOpenAI();
          break;
        case 'system':
        default:
          // System voices don't need initialization
          this.isInitialized = true;
          break;
      }

      console.log(`TTS Engine initialized with provider: ${this.provider}`);
      return { success: true };
    } catch (error) {
      console.error('TTS initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize Web Speech API
   */
  async initializeWebSpeech() {
    if (!this.isBrowser) {
      throw new Error('Web Speech API is only available in browser environments');
    }

    if (!('speechSynthesis' in window)) {
      throw new Error('Web Speech API is not supported in this browser');
    }

    // Dynamically import WebSpeechTTS (for browser environments)
    const WebSpeechTTS = require('./webSpeechTTS');

    this.webSpeechClient = new WebSpeechTTS({
      voice: this.voice,
      speed: this.speed,
      pitch: this.pitch,
      volume: this.volume / 100 // Convert to 0-1 range
    });

    this.isInitialized = true;
  }

  /**
   * Initialize Azure Cognitive Services
   */
  async initializeAzure() {
    const sdk = require('microsoft-cognitiveservices-speech-sdk');

    const subscriptionKey = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION || 'eastus';

    if (!subscriptionKey) {
      throw new Error('Azure Speech API key not found. Set AZURE_SPEECH_KEY environment variable.');
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
    speechConfig.speechSynthesisVoiceName = this.voice || 'en-US-JennyNeural';

    this.azureClient = speechConfig;
    this.isInitialized = true;
  }

  /**
   * Initialize Google Cloud TTS
   */
  async initializeGoogle() {
    const textToSpeech = require('@google-cloud/text-to-speech');

    this.googleClient = new textToSpeech.TextToSpeechClient();
    this.isInitialized = true;
  }

  /**
   * Initialize Amazon Polly
   */
  async initializePolly() {
    const AWS = require('aws-sdk');

    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.pollyClient = new AWS.Polly();
    this.isInitialized = true;
  }

  /**
   * Initialize OpenAI TTS
   */
  async initializeOpenAI() {
    const OpenAI = require('openai');

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable.');
    }

    this.openaiClient = new OpenAI({ apiKey });
    this.isInitialized = true;
  }

  /**
   * Speak text using selected TTS provider
   * @param {string} text - Text to speak
   * @param {Object} options - Speaking options
   * @returns {Promise<Object>}
   */
  async speak(text, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const preparedText = prepareForTTS(text, {
      expandNumbers: options.expandNumbers !== false,
      expandDates: options.expandDates !== false,
      expandCurrency: options.expandCurrency !== false
    });

    try {
      switch (this.provider) {
        case 'webspeech':
          return await this.speakWebSpeech(preparedText, options);
        case 'azure':
          return await this.speakAzure(preparedText, options);
        case 'google':
          return await this.speakGoogle(preparedText, options);
        case 'polly':
          return await this.speakPolly(preparedText, options);
        case 'openai':
          return await this.speakOpenAI(preparedText, options);
        case 'system':
        default:
          return await this.speakSystem(preparedText, options);
      }
    } catch (error) {
      console.error('TTS speak error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Speak using system TTS
   */
  async speakSystem(text, options = {}) {
    return new Promise((resolve, reject) => {
      const voice = this.voice || null;
      const speed = this.speed;

      say.speak(text, voice, speed, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve({ success: true, provider: 'system' });
        }
      });
    });
  }

  /**
   * Speak using Web Speech API
   */
  async speakWebSpeech(text, options = {}) {
    if (!this.webSpeechClient) {
      throw new Error('Web Speech API client not initialized');
    }

    return await this.webSpeechClient.speak(text, {
      speed: options.speed || this.speed,
      pitch: options.pitch || this.pitch,
      volume: options.volume !== undefined ? options.volume : this.volume / 100
    });
  }

  /**
   * Speak using Azure TTS
   */
  async speakAzure(text, options = {}) {
    const sdk = require('microsoft-cognitiveservices-speech-sdk');

    const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
    const synthesizer = new sdk.SpeechSynthesizer(this.azureClient, audioConfig);

    return new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        result => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve({
              success: true,
              provider: 'azure',
              audioData: result.audioData
            });
          } else {
            reject(new Error('Azure TTS failed: ' + result.errorDetails));
          }
          synthesizer.close();
        },
        error => {
          synthesizer.close();
          reject(error);
        }
      );
    });
  }

  /**
   * Speak using Google Cloud TTS
   */
  async speakGoogle(text, options = {}) {
    const request = {
      input: { text },
      voice: {
        languageCode: options.languageCode || 'en-US',
        name: this.voice || 'en-US-Journey-F'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: this.speed,
        pitch: this.pitch,
        volumeGainDb: (this.volume / 100) * 16 - 8
      }
    };

    const [response] = await this.googleClient.synthesizeSpeech(request);

    return {
      success: true,
      provider: 'google',
      audioData: response.audioContent
    };
  }

  /**
   * Speak using Amazon Polly
   */
  async speakPolly(text, options = {}) {
    const params = {
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: this.voice || 'Joanna',
      Engine: 'neural'
    };

    const data = await this.pollyClient.synthesizeSpeech(params).promise();

    return {
      success: true,
      provider: 'polly',
      audioData: data.AudioStream
    };
  }

  /**
   * Speak using OpenAI TTS
   */
  async speakOpenAI(text, options = {}) {
    const mp3 = await this.openaiClient.audio.speech.create({
      model: options.model || 'tts-1',
      voice: this.voice || 'alloy',
      input: text,
      speed: this.speed
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return {
      success: true,
      provider: 'openai',
      audioData: buffer
    };
  }

  /**
   * Generate audio file from text
   * @param {string} text
   * @param {string} outputPath
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async generateAudioFile(text, outputPath, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const preparedText = prepareForTTS(text, options);

    try {
      let audioData;

      switch (this.provider) {
        case 'azure':
          audioData = (await this.speakAzure(preparedText, options)).audioData;
          break;
        case 'google':
          audioData = (await this.speakGoogle(preparedText, options)).audioData;
          break;
        case 'polly':
          audioData = (await this.speakPolly(preparedText, options)).audioData;
          break;
        case 'openai':
          audioData = (await this.speakOpenAI(preparedText, options)).audioData;
          break;
        default:
          throw new Error('Audio file generation not supported for system voices');
      }

      // Write audio data to file
      const fs = require('fs').promises;
      await fs.writeFile(outputPath, audioData);

      return {
        success: true,
        filePath: outputPath,
        size: audioData.length
      };
    } catch (error) {
      console.error('Audio generation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop current speech
   */
  stop() {
    if (this.provider === 'system') {
      say.stop();
    } else if (this.provider === 'webspeech' && this.webSpeechClient) {
      this.webSpeechClient.stop();
    }
    return { success: true };
  }

  /**
   * Get available voices for current provider
   * @returns {Promise<Array>}
   */
  async getAvailableVoices() {
    try {
      switch (this.provider) {
        case 'system':
          return this.getSystemVoices();
        case 'webspeech':
          return this.getWebSpeechVoices();
        case 'azure':
          return this.getAzureVoices();
        case 'google':
          return this.getGoogleVoices();
        case 'polly':
          return this.getPollyVoices();
        case 'openai':
          return this.getOpenAIVoices();
        default:
          return [];
      }
    } catch (error) {
      console.error('Error getting voices:', error);
      return [];
    }
  }

  /**
   * Get system voices
   */
  getSystemVoices() {
    return new Promise((resolve) => {
      say.getInstalledVoices((error, voices) => {
        if (error) {
          resolve([]);
        } else {
          resolve(voices.map(voice => ({
            id: voice,
            name: voice,
            language: 'en-US', // Default
            provider: 'system'
          })));
        }
      });
    });
  }

  /**
   * Get Web Speech API voices
   */
  getWebSpeechVoices() {
    if (!this.webSpeechClient) {
      return [];
    }
    return this.webSpeechClient.getAvailableVoices();
  }

  /**
   * Get Azure voices
   */
  getAzureVoices() {
    return [
      { id: 'en-US-JennyNeural', name: 'Jenny (US English)', language: 'en-US', provider: 'azure' },
      { id: 'en-US-GuyNeural', name: 'Guy (US English)', language: 'en-US', provider: 'azure' },
      { id: 'en-US-AriaNeural', name: 'Aria (US English)', language: 'en-US', provider: 'azure' },
      { id: 'en-US-DavisNeural', name: 'Davis (US English)', language: 'en-US', provider: 'azure' },
      { id: 'en-GB-SoniaNeural', name: 'Sonia (UK English)', language: 'en-GB', provider: 'azure' },
      { id: 'en-GB-RyanNeural', name: 'Ryan (UK English)', language: 'en-GB', provider: 'azure' }
    ];
  }

  /**
   * Get Google voices
   */
  getGoogleVoices() {
    return [
      { id: 'en-US-Journey-F', name: 'Journey Female (US)', language: 'en-US', provider: 'google' },
      { id: 'en-US-Journey-M', name: 'Journey Male (US)', language: 'en-US', provider: 'google' },
      { id: 'en-US-Studio-Q', name: 'Studio Q (US)', language: 'en-US', provider: 'google' },
      { id: 'en-GB-Studio-B', name: 'Studio B (UK)', language: 'en-GB', provider: 'google' }
    ];
  }

  /**
   * Get Polly voices
   */
  getPollyVoices() {
    return [
      { id: 'Joanna', name: 'Joanna (US)', language: 'en-US', provider: 'polly' },
      { id: 'Matthew', name: 'Matthew (US)', language: 'en-US', provider: 'polly' },
      { id: 'Ivy', name: 'Ivy (US)', language: 'en-US', provider: 'polly' },
      { id: 'Justin', name: 'Justin (US)', language: 'en-US', provider: 'polly' },
      { id: 'Amy', name: 'Amy (UK)', language: 'en-GB', provider: 'polly' },
      { id: 'Brian', name: 'Brian (UK)', language: 'en-GB', provider: 'polly' }
    ];
  }

  /**
   * Get OpenAI voices
   */
  getOpenAIVoices() {
    return [
      { id: 'alloy', name: 'Alloy', language: 'en-US', provider: 'openai' },
      { id: 'echo', name: 'Echo', language: 'en-US', provider: 'openai' },
      { id: 'fable', name: 'Fable', language: 'en-US', provider: 'openai' },
      { id: 'onyx', name: 'Onyx', language: 'en-US', provider: 'openai' },
      { id: 'nova', name: 'Nova', language: 'en-US', provider: 'openai' },
      { id: 'shimmer', name: 'Shimmer', language: 'en-US', provider: 'openai' }
    ];
  }

  /**
   * Update TTS settings
   */
  updateSettings(settings) {
    if (settings.provider) this.provider = settings.provider;
    if (settings.voice) this.voice = settings.voice;
    if (settings.speed !== undefined) this.speed = settings.speed;
    if (settings.pitch !== undefined) this.pitch = settings.pitch;
    if (settings.volume !== undefined) this.volume = settings.volume;

    // Reinitialize if provider changed
    if (settings.provider && settings.provider !== this.provider) {
      this.isInitialized = false;
    }
  }
}

module.exports = TTSEngine;
