import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import WebSpeechTTS from '../services/webSpeechTTS';

/**
 * Custom hook to manage TTS playback
 * Connects the app state to the Web Speech API
 */
export const useTTSPlayback = () => {
  const {
    document,
    isPlaying,
    isPaused,
    currentSentenceIndex,
    settings,
    setCurrentSentence,
    nextSentence,
    pause,
    stop: stopPlayback
  } = useAppStore();

  const ttsRef = useRef(null);
  const [sentences, setSentences] = useState([]);
  const isPlayingRef = useRef(false);

  // Initialize TTS engine
  useEffect(() => {
    if (!ttsRef.current) {
      ttsRef.current = new WebSpeechTTS({
        speed: settings.speed,
        pitch: settings.pitch || 1.0,
        volume: settings.volume / 100
      });
      console.log('Web Speech TTS initialized');
    }
  }, []);

  // Update TTS settings when they change
  useEffect(() => {
    if (ttsRef.current) {
      ttsRef.current.updateSettings({
        speed: settings.speed,
        pitch: settings.pitch || 1.0,
        volume: settings.volume / 100
      });
    }
  }, [settings.speed, settings.pitch, settings.volume]);

  // Extract sentences from document
  useEffect(() => {
    if (document && document.text) {
      // Split text into sentences
      const sentenceArray = document.text
        .split(/([.!?]+)/)
        .reduce((acc, part, index, array) => {
          // Combine sentence with its punctuation
          if (index % 2 === 0 && part.trim()) {
            const punctuation = array[index + 1] || '';
            acc.push((part + punctuation).trim());
          }
          return acc;
        }, [])
        .filter(s => s.length > 0);

      setSentences(sentenceArray);
      console.log(`Extracted ${sentenceArray.length} sentences from document`);
    } else {
      setSentences([]);
    }
  }, [document]);

  // Main playback loop
  useEffect(() => {
    // Stop if not playing
    if (!isPlaying) {
      if (ttsRef.current) {
        ttsRef.current.stop();
      }
      isPlayingRef.current = false;
      return;
    }

    // Don't start if not ready
    if (!ttsRef.current || sentences.length === 0) {
      console.warn('TTS not ready: ttsRef=' + !!ttsRef.current + ', sentences=' + sentences.length);
      return;
    }

    // Don't start if already playing (prevents double-triggering)
    if (isPlayingRef.current) {
      return;
    }

    console.log('Starting playback from sentence', currentSentenceIndex + 1);

    const speakCurrentSentence = async () => {
      if (currentSentenceIndex >= sentences.length) {
        console.log('Reached end of document');
        stopPlayback();
        return;
      }

      const sentence = sentences[currentSentenceIndex];

      if (!sentence || sentence.trim().length === 0) {
        // Skip empty sentences
        console.log('Skipping empty sentence');
        nextSentence();
        return;
      }

      console.log(`Speaking sentence ${currentSentenceIndex + 1}/${sentences.length}: ${sentence.substring(0, 50)}...`);

      setCurrentSentence(currentSentenceIndex, sentence);

      try {
        await ttsRef.current.speak(sentence);

        // Only advance if we're still playing
        if (isPlayingRef.current) {
          if (currentSentenceIndex < sentences.length - 1) {
            console.log('Moving to next sentence');
            nextSentence();
          } else {
            console.log('Playback completed');
            stopPlayback();
          }
        }
      } catch (error) {
        console.error('TTS error:', error);
        pause();
      }
    };

    isPlayingRef.current = true;
    speakCurrentSentence();

    // Cleanup
    return () => {
      isPlayingRef.current = false;
    };
  }, [isPlaying, currentSentenceIndex, sentences, nextSentence, setCurrentSentence, pause, stopPlayback]);

  // Handle pause/resume
  useEffect(() => {
    if (ttsRef.current) {
      if (isPaused) {
        ttsRef.current.stop();
        isPlayingRef.current = false;
      }
    }
  }, [isPaused]);

  return {
    isReady: !!ttsRef.current && sentences.length > 0,
    sentenceCount: sentences.length
  };
};
