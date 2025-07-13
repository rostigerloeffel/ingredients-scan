import { useState } from 'react';
import { OpenAIService } from '../services/openaiService';

interface ApiKeyDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onApiKeyChange: () => void;
}

export default function ApiKeyDialog({ isVisible, onClose, onApiKeyChange }: ApiKeyDialogProps) {
  const [currentApiKey, setCurrentApiKey] = useState(OpenAIService.getMaskedApiKey());
  const [newApiKey, setNewApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpdateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newApiKey.trim()) {
      setError('Bitte geben Sie einen API-Schlüssel ein.');
      return;
    }

    if (!newApiKey.startsWith('sk-')) {
      setError('Ungültiger API-Schlüssel. OpenAI API-Schlüssel beginnen mit "sk-".');
      return;
    }

    setIsValidating(true);
    setError(null);
    setSuccess(null);

    try {
      // Validierung des neuen API-Schlüssels
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${newApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (testResponse.ok) {
        OpenAIService.setApiKey(newApiKey);
        setCurrentApiKey(OpenAIService.getMaskedApiKey());
        setNewApiKey('');
        setSuccess('API-Schlüssel erfolgreich aktualisiert!');
        onApiKeyChange();
        
        // Erfolgsmeldung nach 2 Sekunden ausblenden
        setTimeout(() => {
          setSuccess(null);
        }, 2000);
      } else if (testResponse.status === 401) {
        setError('Ungültiger API-Schlüssel. Bitte überprüfen Sie Ihren OpenAI API-Schlüssel.');
      } else {
        setError('Fehler bei der API-Schlüssel-Validierung. Bitte versuchen Sie es erneut.');
      }
    } catch (err) {
      setError('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDeleteApiKey = () => {
    if (window.confirm('Möchten Sie den API-Schlüssel wirklich löschen? Die App wird dann nicht mehr funktionieren.')) {
      OpenAIService.clearApiKey();
      setCurrentApiKey('');
      setNewApiKey('');
      setSuccess('API-Schlüssel erfolgreich gelöscht!');
      onApiKeyChange();
      
      // Erfolgsmeldung nach 2 Sekunden ausblenden
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="api-key-dialog-overlay" onClick={onClose}>
      <div className="api-key-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>🔑 API-Schlüssel verwalten</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="dialog-content">
          {/* Aktueller API-Schlüssel */}
          <div className="current-key-section">
            <h3>Aktueller API-Schlüssel</h3>
            <div className="current-key-display">
              <code>{currentApiKey || 'Kein API-Schlüssel gesetzt'}</code>
            </div>
            {currentApiKey && (
              <button 
                onClick={handleDeleteApiKey} 
                className="delete-button"
                type="button"
              >
                🗑️ API-Schlüssel löschen
              </button>
            )}
          </div>

          {/* Neuer API-Schlüssel */}
          <div className="new-key-section">
            <h3>Neuen API-Schlüssel setzen</h3>
            <form onSubmit={handleUpdateApiKey} className="update-form">
              <div className="input-group">
                <label htmlFor="newApiKey">Neuer OpenAI API-Schlüssel:</label>
                <input
                  type="password"
                  id="newApiKey"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="sk-..."
                  className={error ? 'error' : ''}
                  disabled={isValidating}
                />
                {error && <p className="error-message">{error}</p>}
                {success && <p className="success-message">{success}</p>}
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="update-button"
                  disabled={isValidating || !newApiKey.trim()}
                >
                  {isValidating ? '🔍 Validiere...' : '✅ API-Schlüssel aktualisieren'}
                </button>
              </div>
            </form>
          </div>

          {/* Hilfe-Sektion */}
          <div className="help-section">
            <h3>📋 Wie Sie Ihren API-Schlüssel erhalten:</h3>
            <ol>
              <li>Besuchen Sie <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></li>
              <li>Erstellen Sie ein kostenloses Konto oder melden Sie sich an</li>
              <li>Gehen Sie zu "API Keys"</li>
              <li>Klicken Sie auf "Create new secret key"</li>
              <li>Kopieren Sie den Schlüssel (beginnt mit "sk-")</li>
            </ol>
            <p className="security-note">
              <strong>🔒 Sicherheit:</strong> Ihr API-Schlüssel wird nur lokal in Ihrem Browser gespeichert und nie an Dritte weitergegeben.
            </p>
          </div>
        </div>

        <div className="dialog-footer">
          <button onClick={onClose} className="cancel-button">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
} 