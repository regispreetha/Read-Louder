import { create } from 'zustand';

/**
 * Main application store using Zustand
 */
export const useAppStore = create((set, get) => ({
  // Document state
  document: null,
  isLoading: false,
  error: null,

  // Playback state
  isPlaying: false,
  isPaused: false,
  currentSentenceIndex: 0,
  totalSentences: 0,
  currentSentence: '',
  progress: 0,

  // Settings
  settings: {
    provider: 'system',
    voice: null,
    speed: 1.0,
    pitch: 0,
    volume: 80,
    highlightCurrent: true,
    autoScroll: true,
    pauseAtSentences: true
  },

  // Bookmarks
  bookmarks: [],

  // Voice options
  availableVoices: [],

  // Actions
  loadDocument: async (filePath) => {
    set({ isLoading: true, error: null });

    try {
      // Process document via Electron IPC
      const result = await window.electronAPI.processDocument(filePath);

      if (result.success) {
        set({
          document: result.data,
          isLoading: false,
          currentSentenceIndex: 0,
          totalSentences: result.data.text.split(/[.!?]+/).filter(s => s.trim().length > 0).length
        });

        // Add to history
        await window.electronAPI.addToHistory({
          path: filePath,
          title: result.data.metadata.title,
          type: result.data.fileType
        });

        // Load bookmarks
        const savedBookmarks = await window.electronAPI.loadBookmarks(filePath);
        set({ bookmarks: savedBookmarks });

        // Load reading progress
        const savedProgress = await window.electronAPI.loadProgress(filePath);
        if (savedProgress) {
          set({
            currentSentenceIndex: savedProgress.position || 0
          });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  togglePlayback: () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying, isPaused: isPlaying });
  },

  play: () => {
    set({ isPlaying: true, isPaused: false });
  },

  pause: () => {
    set({ isPlaying: false, isPaused: true });
  },

  stop: () => {
    set({ isPlaying: false, isPaused: false, currentSentenceIndex: 0, progress: 0 });
  },

  setCurrentSentence: (index, text) => {
    const { totalSentences } = get();
    const progress = (index / totalSentences) * 100;

    set({
      currentSentenceIndex: index,
      currentSentence: text,
      progress
    });
  },

  nextSentence: () => {
    const { currentSentenceIndex, totalSentences } = get();
    if (currentSentenceIndex < totalSentences - 1) {
      set({ currentSentenceIndex: currentSentenceIndex + 1 });
    }
  },

  previousSentence: () => {
    const { currentSentenceIndex } = get();
    if (currentSentenceIndex > 0) {
      set({ currentSentenceIndex: currentSentenceIndex - 1 });
    }
  },

  seekToPercent: (percent) => {
    const { totalSentences } = get();
    const targetIndex = Math.floor((percent / 100) * totalSentences);
    set({ currentSentenceIndex: targetIndex, progress: percent });
  },

  setSpeed: (speed) => {
    set(state => ({
      settings: { ...state.settings, speed }
    }));
  },

  setVolume: (volume) => {
    set(state => ({
      settings: { ...state.settings, volume }
    }));
  },

  setPitch: (pitch) => {
    set(state => ({
      settings: { ...state.settings, pitch }
    }));
  },

  setVoice: (voice) => {
    set(state => ({
      settings: { ...state.settings, voice }
    }));
  },

  setProvider: (provider) => {
    set(state => ({
      settings: { ...state.settings, provider }
    }));
  },

  updateSettings: (newSettings) => {
    set(state => ({
      settings: { ...state.settings, ...newSettings }
    }));
  },

  addBookmark: async (name) => {
    const { document, currentSentenceIndex, currentSentence, bookmarks } = get();

    if (!document) return;

    const bookmark = {
      id: Date.now(),
      name,
      sentenceIndex: currentSentenceIndex,
      text: currentSentence?.substring(0, 100),
      timestamp: new Date().toISOString()
    };

    const updatedBookmarks = [...bookmarks, bookmark];
    set({ bookmarks: updatedBookmarks });

    // Save to storage
    await window.electronAPI.saveBookmarks({
      documentPath: document.filePath,
      bookmarks: updatedBookmarks
    });

    return bookmark;
  },

  removeBookmark: async (bookmarkId) => {
    const { document, bookmarks } = get();
    const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);

    set({ bookmarks: updatedBookmarks });

    // Save to storage
    await window.electronAPI.saveBookmarks({
      documentPath: document.filePath,
      bookmarks: updatedBookmarks
    });
  },

  jumpToBookmark: (bookmarkId) => {
    const { bookmarks } = get();
    const bookmark = bookmarks.find(b => b.id === bookmarkId);

    if (bookmark) {
      set({ currentSentenceIndex: bookmark.sentenceIndex });
    }
  },

  saveProgress: async () => {
    const { document, currentSentenceIndex } = get();

    if (!document) return;

    await window.electronAPI.saveProgress({
      documentPath: document.filePath,
      position: currentSentenceIndex,
      timestamp: new Date().toISOString()
    });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  loadVoices: async (provider) => {
    // This would call the TTS engine to get available voices
    // For now, return mock data
    const voices = {
      system: [
        { id: 'default', name: 'System Default', language: 'en-US' }
      ],
      azure: [
        { id: 'en-US-JennyNeural', name: 'Jenny (US)', language: 'en-US' },
        { id: 'en-US-GuyNeural', name: 'Guy (US)', language: 'en-US' }
      ],
      google: [
        { id: 'en-US-Journey-F', name: 'Journey Female', language: 'en-US' },
        { id: 'en-US-Journey-M', name: 'Journey Male', language: 'en-US' }
      ],
      openai: [
        { id: 'alloy', name: 'Alloy', language: 'en-US' },
        { id: 'echo', name: 'Echo', language: 'en-US' },
        { id: 'nova', name: 'Nova', language: 'en-US' }
      ]
    };

    set({ availableVoices: voices[provider] || [] });
  }
}));

// Auto-save progress every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useAppStore.getState();
    if (state.document && state.isPlaying) {
      state.saveProgress();
    }
  }, 30000);
}
