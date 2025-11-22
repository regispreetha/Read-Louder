import React from 'react';
import { useAppStore } from '../store/appStore';
import { BookMarked, Trash2, X } from 'lucide-react';
import './BookmarkManager.css';

const BookmarkManager = ({ onClose }) => {
  const { bookmarks, jumpToBookmark, removeBookmark } = useAppStore();

  const handleJumpToBookmark = (bookmarkId) => {
    jumpToBookmark(bookmarkId);
  };

  const handleRemoveBookmark = (bookmarkId, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this bookmark?')) {
      removeBookmark(bookmarkId);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than a day ago
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Less than a week ago
    if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    }

    // Older
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bookmark-manager">
      <div className="panel-header">
        <h3>
          <BookMarked size={20} />
          Bookmarks
        </h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        )}
      </div>

      <div className="panel-content">
        {bookmarks.length === 0 ? (
          <div className="empty-state">
            <BookMarked size={48} />
            <p>No bookmarks yet</p>
            <span>Click "Add Bookmark" while reading to save your position</span>
          </div>
        ) : (
          <div className="bookmark-list">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="bookmark-item"
                onClick={() => handleJumpToBookmark(bookmark.id)}
              >
                <div className="bookmark-content">
                  <div className="bookmark-name">{bookmark.name}</div>
                  <div className="bookmark-text">{bookmark.text}...</div>
                  <div className="bookmark-meta">
                    <span className="bookmark-time">
                      {formatTimestamp(bookmark.timestamp)}
                    </span>
                  </div>
                </div>
                <button
                  className="bookmark-delete"
                  onClick={(e) => handleRemoveBookmark(bookmark.id, e)}
                  title="Remove bookmark"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarkManager;
