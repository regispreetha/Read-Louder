import React from 'react';
import { useAppStore } from '../store/appStore';
import { Clock } from 'lucide-react';
import './ProgressTracker.css';

const ProgressTracker = () => {
  const { progress, document, currentSentenceIndex, totalSentences, seekToPercent } = useAppStore();

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    seekToPercent(percent);
  };

  // Calculate remaining time
  const getRemainingTime = () => {
    if (!document || !document.statistics) return 0;

    const totalWords = document.statistics.wordCount;
    const wordsPerSentence = totalWords / totalSentences;
    const remainingSentences = totalSentences - currentSentenceIndex;
    const remainingWords = remainingSentences * wordsPerSentence;
    const wordsPerMinute = 200; // Average reading speed

    return Math.ceil(remainingWords / wordsPerMinute);
  };

  const remainingTime = getRemainingTime();

  return (
    <div className="progress-tracker">
      <div className="progress-bar-container" onClick={handleProgressClick}>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-labels">
          <span className="progress-percent">{Math.round(progress)}%</span>
          <span className="progress-time">
            <Clock size={14} />
            {remainingTime} min remaining
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
