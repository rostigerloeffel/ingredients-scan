import React, { useState, useEffect } from 'react';
import { OpenAIService } from '../services/openaiService';
import './ApiKeyManager.css';

interface ApiKeyManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onApiKeyChange: () => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ isVisible, onClose, onApiKeyChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const currentKey = OpenAIService.getApiKey();
      setApiKey(currentKey || '');
      setIsValid(!!currentKey);
    }
  }, [isVisible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      OpenAIService.setApiKey(apiKey.trim());
      onApiKeyChange();
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleDelete = () => {
    OpenAIService.deleteApiKey();
    setApiKey('');
    setIsValid(false);
    onApiKeyChange();
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApiKey(value);
    setIsValid(value.trim().length > 0);
  };

  if (!isVisible) return null;

  return (
    <div className="api-key-manager-overlay" onClick={handleClose}>
      <div className="api-key-manager-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>OpenAI API-Schlüssel</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        
        <div className="dialog-info">
          <p>
            <strong>Wofür wird der API-Schlüssel benötigt?</strong><br/>
            Die App verwendet OpenAI's KI, um Inhaltsstoffe aus Fotos zu analysieren und Allergene zu erkennen.
          </p>
          <p>
            <strong>Wie erhalte ich einen API-Schlüssel?</strong><br/>
            1. Besuchen Sie <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com/api-keys</a><br/>
            2. Erstellen Sie ein kostenloses Konto<br/>
            3. Generieren Sie einen neuen API-Schlüssel<br/>
            4. Kopieren Sie den Schlüssel (beginnt mit "sk-")
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="api-key-form">
          <div className="form-group">
            <label htmlFor="api-key">Ihr OpenAI API-Schlüssel:</label>
            <div className="input-container">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={handleKeyChange}
                placeholder="sk-..."
                className="api-key-input"
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          <div className="form-actions-row">
            <button
              type="submit"
              disabled={!isValid}
              className="save-button"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="delete-button"
              disabled={!isValid}
            >
              Löschen
            </button>
          </div>
          <div className="form-actions-bottom">
            <button
              type="button"
              onClick={handleClose}
              className="cancel-button"
            >
              Abbrechen
            </button>
          </div>
        </form>
        
        <div className="dialog-footer">
          <p>
            <strong>Hinweis:</strong> Der API-Schlüssel wird nur lokal in Ihrem Browser gespeichert.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManager; 