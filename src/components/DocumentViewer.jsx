import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { BookMarked } from 'lucide-react';
import './DocumentViewer.css';

const DocumentViewer = () => {
  const {
    document,
    currentSentenceIndex,
    currentSentence,
    settings,
    addBookmark
  } = useAppStore();

  const viewerRef = useRef(null);
  const currentSentenceRef = useRef(null);

  // Split text into sentences for highlighting
  const sentences = document?.text.split(/[.!?]+/).filter(s => s.trim().length > 0) || [];

  // Auto-scroll to current sentence
  useEffect(() => {
    if (settings.autoScroll && currentSentenceRef.current) {
      currentSentenceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentSentenceIndex, settings.autoScroll]);

  const handleAddBookmark = () => {
    const bookmarkName = prompt('Enter bookmark name:');
    if (bookmarkName) {
      addBookmark(bookmarkName);
    }
  };

  if (!document) {
    return null;
  }

  return (
    <div className="document-viewer" ref={viewerRef}>
      {/* Document Header */}
      <div className="document-header">
        <div className="document-info">
          <h2>{document.metadata.title}</h2>
          <div className="document-meta">
            {document.metadata.author && document.metadata.author !== 'Unknown' && (
              <span>By {document.metadata.author}</span>
            )}
            {document.statistics && (
              <>
                <span>•</span>
                <span>{document.statistics.wordCount.toLocaleString()} words</span>
                <span>•</span>
                <span>{document.statistics.estimatedReadingTime} min read</span>
              </>
            )}
          </div>
        </div>

        <button
          className="bookmark-button"
          onClick={handleAddBookmark}
          title="Add bookmark at current position"
        >
          <BookMarked size={20} />
          Add Bookmark
        </button>
      </div>

      {/* Document Content */}
      <div className="document-content">
        {/* Chapter Navigation */}
        {document.chapters && document.chapters.length > 1 && (
          <div className="chapters-nav">
            <h3>Chapters</h3>
            <ul>
              {document.chapters.map((chapter) => (
                <li key={chapter.number}>
                  <button
                    className="chapter-link"
                    onClick={() => {
                      // Calculate sentence index for chapter start
                      const chapterStartIndex = Math.floor(
                        (chapter.startLine / document.text.split('\n').length) * sentences.length
                      );
                      useAppStore.getState().setCurrentSentence(chapterStartIndex, sentences[chapterStartIndex]);
                    }}
                  >
                    <span className="chapter-number">{chapter.number}</span>
                    <span className="chapter-title">{chapter.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Text Content */}
        <div className="text-content">
          {sentences.map((sentence, index) => {
            const isCurrent = index === currentSentenceIndex;
            const isNearby = Math.abs(index - currentSentenceIndex) <= 2;

            return (
              <span
                key={index}
                ref={isCurrent ? currentSentenceRef : null}
                className={`sentence ${isCurrent ? 'current' : ''} ${isNearby ? 'nearby' : ''}`}
                onClick={() => {
                  useAppStore.getState().setCurrentSentence(index, sentence);
                }}
              >
                {sentence.trim()}.{' '}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
