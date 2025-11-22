const { EventEmitter } = require('events');
const { tokenizeSentences } = require('../utils/textCleaner');

/**
 * Audio Controller
 * Manages audio playback, position tracking, and reading controls
 */
class AudioController extends EventEmitter {
  constructor(ttsEngine) {
    super();

    this.ttsEngine = ttsEngine;

    // Document state
    this.document = null;
    this.sentences = [];
    this.currentSentenceIndex = 0;

    // Playback state
    this.isPlaying = false;
    this.isPaused = false;
    this.playbackSpeed = 1.0;

    // Position tracking
    this.currentPosition = 0; // Character position in text
    this.totalLength = 0;

    // Bookmarks
    this.bookmarks = [];

    // Reading settings
    this.settings = {
      pauseAtSentences: true,
      pauseAtParagraphs: true,
      highlightCurrent: true,
      autoScroll: true
    };
  }

  /**
   * Load document for reading
   * @param {Object} document - Processed document object
   */
  loadDocument(document) {
    this.document = document;
    this.sentences = tokenizeSentences(document.text);
    this.totalLength = document.text.length;
    this.currentSentenceIndex = 0;
    this.currentPosition = 0;

    this.emit('document-loaded', {
      title: document.metadata.title,
      sentences: this.sentences.length,
      wordCount: document.statistics.wordCount,
      estimatedTime: document.statistics.estimatedReadingTime
    });

    console.log(`Document loaded: ${this.sentences.length} sentences`);
  }

  /**
   * Start or resume playback
   */
  async play() {
    if (!this.document) {
      throw new Error('No document loaded');
    }

    this.isPlaying = true;
    this.isPaused = false;

    this.emit('playback-started', {
      position: this.currentSentenceIndex,
      total: this.sentences.length
    });

    await this.readFromCurrent();
  }

  /**
   * Pause playback
   */
  pause() {
    this.isPlaying = false;
    this.isPaused = true;

    if (this.ttsEngine) {
      this.ttsEngine.stop();
    }

    this.emit('playback-paused', {
      position: this.currentSentenceIndex,
      total: this.sentences.length
    });
  }

  /**
   * Stop playback and reset position
   */
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentSentenceIndex = 0;
    this.currentPosition = 0;

    if (this.ttsEngine) {
      this.ttsEngine.stop();
    }

    this.emit('playback-stopped');
  }

  /**
   * Read from current position
   */
  async readFromCurrent() {
    while (this.isPlaying && this.currentSentenceIndex < this.sentences.length) {
      const sentence = this.sentences[this.currentSentenceIndex];

      if (!sentence || sentence.trim().length === 0) {
        this.currentSentenceIndex++;
        continue;
      }

      // Calculate character position
      const textUpToCurrent = this.sentences
        .slice(0, this.currentSentenceIndex)
        .join(' ');
      this.currentPosition = textUpToCurrent.length;

      // Emit sentence change
      this.emit('sentence-changed', {
        index: this.currentSentenceIndex,
        total: this.sentences.length,
        text: sentence,
        position: this.currentPosition,
        progress: (this.currentSentenceIndex / this.sentences.length) * 100
      });

      try {
        // Speak current sentence
        await this.ttsEngine.speak(sentence, {
          speed: this.playbackSpeed
        });

        // Small pause between sentences if enabled
        if (this.settings.pauseAtSentences && this.isPlaying) {
          await this.sleep(200);
        }

        this.currentSentenceIndex++;
      } catch (error) {
        console.error('Error reading sentence:', error);
        this.emit('playback-error', error);
        this.pause();
        break;
      }
    }

    // Finished reading
    if (this.currentSentenceIndex >= this.sentences.length) {
      this.isPlaying = false;
      this.emit('playback-finished');
    }
  }

  /**
   * Skip to next sentence
   */
  nextSentence() {
    if (this.currentSentenceIndex < this.sentences.length - 1) {
      this.currentSentenceIndex++;

      if (this.ttsEngine) {
        this.ttsEngine.stop();
      }

      if (this.isPlaying) {
        this.readFromCurrent();
      }

      this.emit('position-changed', {
        index: this.currentSentenceIndex,
        total: this.sentences.length
      });
    }
  }

  /**
   * Skip to previous sentence
   */
  previousSentence() {
    if (this.currentSentenceIndex > 0) {
      this.currentSentenceIndex--;

      if (this.ttsEngine) {
        this.ttsEngine.stop();
      }

      if (this.isPlaying) {
        this.readFromCurrent();
      }

      this.emit('position-changed', {
        index: this.currentSentenceIndex,
        total: this.sentences.length
      });
    }
  }

  /**
   * Seek to specific position
   * @param {number} percentage - Position as percentage (0-100)
   */
  seekToPercent(percentage) {
    const targetIndex = Math.floor((percentage / 100) * this.sentences.length);
    this.seekToSentence(targetIndex);
  }

  /**
   * Seek to specific sentence
   * @param {number} sentenceIndex
   */
  seekToSentence(sentenceIndex) {
    if (sentenceIndex >= 0 && sentenceIndex < this.sentences.length) {
      const wasPlaying = this.isPlaying;

      if (this.isPlaying) {
        this.pause();
      }

      this.currentSentenceIndex = sentenceIndex;

      this.emit('position-changed', {
        index: this.currentSentenceIndex,
        total: this.sentences.length,
        progress: (this.currentSentenceIndex / this.sentences.length) * 100
      });

      if (wasPlaying) {
        this.play();
      }
    }
  }

  /**
   * Set playback speed
   * @param {number} speed - Speed multiplier (0.5 - 3.0)
   */
  setSpeed(speed) {
    this.playbackSpeed = Math.max(0.5, Math.min(3.0, speed));
    this.ttsEngine.updateSettings({ speed: this.playbackSpeed });

    this.emit('speed-changed', this.playbackSpeed);
  }

  /**
   * Jump to chapter
   * @param {number} chapterNumber
   */
  jumpToChapter(chapterNumber) {
    if (!this.document || !this.document.chapters) {
      return;
    }

    const chapter = this.document.chapters.find(ch => ch.number === chapterNumber);

    if (chapter) {
      // Find sentence index closest to chapter start
      const chapterText = this.document.text.substring(0, chapter.startLine);
      const sentencesBeforeChapter = tokenizeSentences(chapterText);
      const targetIndex = sentencesBeforeChapter.length;

      this.seekToSentence(targetIndex);

      this.emit('chapter-changed', {
        chapter: chapter.number,
        title: chapter.title
      });
    }
  }

  /**
   * Add bookmark at current position
   * @param {string} name - Bookmark name
   */
  addBookmark(name) {
    const bookmark = {
      id: Date.now(),
      name,
      sentenceIndex: this.currentSentenceIndex,
      position: this.currentPosition,
      timestamp: new Date().toISOString(),
      text: this.sentences[this.currentSentenceIndex]?.substring(0, 100)
    };

    this.bookmarks.push(bookmark);

    this.emit('bookmark-added', bookmark);

    return bookmark;
  }

  /**
   * Remove bookmark
   * @param {number} bookmarkId
   */
  removeBookmark(bookmarkId) {
    const index = this.bookmarks.findIndex(b => b.id === bookmarkId);

    if (index !== -1) {
      const removed = this.bookmarks.splice(index, 1)[0];
      this.emit('bookmark-removed', removed);
      return true;
    }

    return false;
  }

  /**
   * Jump to bookmark
   * @param {number} bookmarkId
   */
  jumpToBookmark(bookmarkId) {
    const bookmark = this.bookmarks.find(b => b.id === bookmarkId);

    if (bookmark) {
      this.seekToSentence(bookmark.sentenceIndex);
      this.emit('bookmark-activated', bookmark);
      return true;
    }

    return false;
  }

  /**
   * Get playback progress
   * @returns {Object}
   */
  getProgress() {
    return {
      currentSentence: this.currentSentenceIndex,
      totalSentences: this.sentences.length,
      progress: (this.currentSentenceIndex / this.sentences.length) * 100,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      speed: this.playbackSpeed,
      currentText: this.sentences[this.currentSentenceIndex]
    };
  }

  /**
   * Get remaining reading time estimate
   * @returns {number} Minutes remaining
   */
  getRemainingTime() {
    const remainingSentences = this.sentences.length - this.currentSentenceIndex;
    const remainingWords = this.sentences
      .slice(this.currentSentenceIndex)
      .join(' ')
      .split(/\s+/).length;

    const wordsPerMinute = 200 * this.playbackSpeed;
    return Math.ceil(remainingWords / wordsPerMinute);
  }

  /**
   * Update settings
   * @param {Object} newSettings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.emit('settings-updated', this.settings);
  }

  /**
   * Sleep utility
   * @param {number} ms
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Export current state for saving
   * @returns {Object}
   */
  exportState() {
    return {
      documentPath: this.document?.filePath,
      currentSentenceIndex: this.currentSentenceIndex,
      currentPosition: this.currentPosition,
      bookmarks: this.bookmarks,
      settings: this.settings,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import saved state
   * @param {Object} state
   */
  importState(state) {
    if (state.currentSentenceIndex !== undefined) {
      this.currentSentenceIndex = state.currentSentenceIndex;
    }
    if (state.currentPosition !== undefined) {
      this.currentPosition = state.currentPosition;
    }
    if (state.bookmarks) {
      this.bookmarks = state.bookmarks;
    }
    if (state.settings) {
      this.settings = { ...this.settings, ...state.settings };
    }

    this.emit('state-imported', state);
  }
}

module.exports = AudioController;
