import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import DocumentViewer from './components/DocumentViewer';
import TTSControls from './components/TTSControls';
import SettingsPanel from './components/SettingsPanel';
import BookmarkManager from './components/BookmarkManager';
import ProgressTracker from './components/ProgressTracker';
import { FileText, Settings, BookMarked, Upload } from 'lucide-react';
import { useAppStore } from './store/appStore';
import './styles/App.css';

function App() {
  const {
    document,
    isLoading,
    currentSentence,
    isPlaying,
    loadDocument,
    setError
  } = useAppStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Drag and drop handler
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      await handleFileLoad(file.path);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/rtf': ['.rtf']
    },
    multiple: false,
    noClick: !!document
  });

  // Handle file loading
  const handleFileLoad = async (filePath) => {
    try {
      await loadDocument(filePath);
    } catch (error) {
      setError(error.message);
    }
  };

  // Open file dialog
  const handleOpenFile = async () => {
    try {
      const filePaths = await window.electronAPI.openFile();
      if (filePaths && filePaths.length > 0) {
        await handleFileLoad(filePaths[0]);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + O: Open file
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      }

      // Ctrl/Cmd + ,: Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(!showSettings);
      }

      // Ctrl/Cmd + B: Bookmarks
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setShowBookmarks(!showBookmarks);
      }

      // Space: Play/Pause (when not in input)
      if (e.key === ' ' && document && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        useAppStore.getState().togglePlayback();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [document, showSettings, showBookmarks]);

  return (
    <div className="app" {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <FileText size={24} />
          <h1>Read Louder</h1>
          {document && (
            <span className="document-title">{document.metadata.title}</span>
          )}
        </div>

        <div className="header-right">
          <button
            className="icon-button"
            onClick={() => setShowBookmarks(!showBookmarks)}
            title="Bookmarks (Ctrl+B)"
          >
            <BookMarked size={20} />
          </button>
          <button
            className="icon-button"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings (Ctrl+,)"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-content">
        {!document ? (
          <div className={`drop-zone ${isDragActive ? 'active' : ''}`}>
            <Upload size={48} />
            <h2>
              {isDragActive
                ? 'Drop your document here'
                : 'Drag & drop a document or click to browse'}
            </h2>
            <p>Supports PDF, Word (.docx, .doc), and text files (.txt, .md, .rtf)</p>
            <button className="primary-button" onClick={handleOpenFile}>
              Browse Files
            </button>
          </div>
        ) : (
          <>
            {/* Document Viewer */}
            <div className="viewer-container">
              <DocumentViewer />
            </div>

            {/* Sidebar */}
            <div className="sidebar">
              {showBookmarks && <BookmarkManager />}
              {showSettings && <SettingsPanel />}
            </div>
          </>
        )}
      </div>

      {/* Controls Footer */}
      {document && (
        <footer className="app-footer">
          <ProgressTracker />
          <TTSControls />
        </footer>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing document...</p>
        </div>
      )}
    </div>
  );
}

export default App;
