import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { X } from 'lucide-react';
import './SettingsPanel.css';

const SettingsPanel = ({ onClose }) => {
  const {
    settings,
    availableVoices,
    setProvider,
    setVoice,
    setSpeed,
    setPitch,
    setVolume,
    updateSettings,
    loadVoices
  } = useAppStore();

  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    loadVoices(localSettings.provider);
  }, [localSettings.provider]);

  const handleProviderChange = (e) => {
    const provider = e.target.value;
    setLocalSettings({ ...localSettings, provider, voice: null });
    setProvider(provider);
  };

  const handleVoiceChange = (e) => {
    const voice = e.target.value;
    setLocalSettings({ ...localSettings, voice });
    setVoice(voice);
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    updateSettings({ [key]: value });
  };

  const providers = [
    { id: 'system', name: 'System Voices (Free)' },
    { id: 'azure', name: 'Azure Cognitive Services' },
    { id: 'google', name: 'Google Cloud TTS' },
    { id: 'polly', name: 'Amazon Polly' },
    { id: 'openai', name: 'OpenAI TTS' }
  ];

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h3>Settings</h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        )}
      </div>

      <div className="panel-content">
        {/* TTS Provider */}
        <div className="setting-group">
          <label>TTS Provider</label>
          <select
            value={localSettings.provider}
            onChange={handleProviderChange}
            className="setting-select"
          >
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <span className="setting-hint">
            Cloud providers require API keys set in environment variables
          </span>
        </div>

        {/* Voice Selection */}
        <div className="setting-group">
          <label>Voice</label>
          <select
            value={localSettings.voice || ''}
            onChange={handleVoiceChange}
            className="setting-select"
            disabled={!availableVoices.length}
          >
            <option value="">Default Voice</option>
            {availableVoices.map(voice => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
        </div>

        {/* Speed */}
        <div className="setting-group">
          <label>
            Reading Speed
            <span className="setting-value">{localSettings.speed}x</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={localSettings.speed}
            onChange={(e) => handleSettingChange('speed', parseFloat(e.target.value))}
            className="setting-slider"
          />
        </div>

        {/* Pitch */}
        <div className="setting-group">
          <label>
            Voice Pitch
            <span className="setting-value">{localSettings.pitch > 0 ? '+' : ''}{localSettings.pitch}</span>
          </label>
          <input
            type="range"
            min="-20"
            max="20"
            step="1"
            value={localSettings.pitch}
            onChange={(e) => handleSettingChange('pitch', parseInt(e.target.value))}
            className="setting-slider"
          />
        </div>

        {/* Volume */}
        <div className="setting-group">
          <label>
            Volume
            <span className="setting-value">{localSettings.volume}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={localSettings.volume}
            onChange={(e) => handleSettingChange('volume', parseInt(e.target.value))}
            className="setting-slider"
          />
        </div>

        {/* Reading Options */}
        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={localSettings.highlightCurrent}
              onChange={(e) => handleSettingChange('highlightCurrent', e.target.checked)}
            />
            <span>Highlight current sentence</span>
          </label>
        </div>

        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={localSettings.autoScroll}
              onChange={(e) => handleSettingChange('autoScroll', e.target.checked)}
            />
            <span>Auto-scroll to current position</span>
          </label>
        </div>

        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={localSettings.pauseAtSentences}
              onChange={(e) => handleSettingChange('pauseAtSentences', e.target.checked)}
            />
            <span>Pause between sentences</span>
          </label>
        </div>

        {/* API Keys Info */}
        <div className="setting-group info-group">
          <h4>API Keys</h4>
          <p className="info-text">
            To use cloud TTS providers, set environment variables:
          </p>
          <ul className="info-list">
            <li><code>AZURE_SPEECH_KEY</code> and <code>AZURE_SPEECH_REGION</code></li>
            <li><code>GOOGLE_APPLICATION_CREDENTIALS</code></li>
            <li><code>AWS_ACCESS_KEY_ID</code> and <code>AWS_SECRET_ACCESS_KEY</code></li>
            <li><code>OPENAI_API_KEY</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
