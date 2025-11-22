import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Play,
  Pause,
  StopCircle,
  SkipBack,
  SkipForward,
  Volume2,
  Gauge
} from 'lucide-react';
import './TTSControls.css';

const TTSControls = () => {
  const {
    isPlaying,
    isPaused,
    currentSentenceIndex,
    totalSentences,
    settings,
    togglePlayback,
    stop,
    nextSentence,
    previousSentence,
    setSpeed,
    setVolume
  } = useAppStore();

  const [showSpeedControl, setShowSpeedControl] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);

  const handleSpeedChange = (e) => {
    setSpeed(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e) => {
    setVolume(parseInt(e.target.value));
  };

  return (
    <div className="tts-controls">
      {/* Playback Buttons */}
      <div className="control-buttons">
        <button
          className="control-button"
          onClick={previousSentence}
          disabled={currentSentenceIndex === 0}
          title="Previous sentence"
        >
          <SkipBack size={20} />
        </button>

        <button
          className="control-button play-pause"
          onClick={togglePlayback}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} />}
        </button>

        <button
          className="control-button"
          onClick={nextSentence}
          disabled={currentSentenceIndex >= totalSentences - 1}
          title="Next sentence"
        >
          <SkipForward size={20} />
        </button>

        <button
          className="control-button"
          onClick={stop}
          disabled={!isPlaying && !isPaused}
          title="Stop"
        >
          <StopCircle size={20} />
        </button>
      </div>

      {/* Speed Control */}
      <div className="control-section">
        <button
          className="control-toggle"
          onClick={() => setShowSpeedControl(!showSpeedControl)}
        >
          <Gauge size={18} />
          <span>{settings.speed}x</span>
        </button>

        {showSpeedControl && (
          <div className="control-dropdown">
            <label>Reading Speed</label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={settings.speed}
              onChange={handleSpeedChange}
              className="slider"
            />
            <div className="speed-presets">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
                <button
                  key={speed}
                  className={`preset-button ${settings.speed === speed ? 'active' : ''}`}
                  onClick={() => setSpeed(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Volume Control */}
      <div className="control-section">
        <button
          className="control-toggle"
          onClick={() => setShowVolumeControl(!showVolumeControl)}
        >
          <Volume2 size={18} />
          <span>{settings.volume}%</span>
        </button>

        {showVolumeControl && (
          <div className="control-dropdown">
            <label>Volume</label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={settings.volume}
              onChange={handleVolumeChange}
              className="slider"
            />
          </div>
        )}
      </div>

      {/* Position Info */}
      <div className="position-info">
        <span className="sentence-count">
          Sentence {currentSentenceIndex + 1} of {totalSentences}
        </span>
      </div>
    </div>
  );
};

export default TTSControls;
