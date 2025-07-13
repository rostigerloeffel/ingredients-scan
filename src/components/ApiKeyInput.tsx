import { useState } from 'react';

interface ApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
  isVisible: boolean;
}

export default function ApiKeyInput({ onApiKeySubmit, isVisible }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Bitte geben Sie einen API-Schlüssel ein.');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      setError('Ungültiger API-Schlüssel. OpenAI API-Schlüssel beginnen mit "sk-".');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Einfache Validierung des API-Schlüssels
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (testResponse.ok) {
        onApiKeySubmit(apiKey);
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

  if (!isVisible) return null;

  return (
    <div className="api-key-overlay">
      <div className="api-key-modal">
        <div className="api-key-header">
          <h2>🔑 OpenAI API-Schlüssel erforderlich</h2>
          <p>Um Zutatenlisten zu analysieren, benötigen wir Ihren OpenAI API-Schlüssel.</p>
        </div>

        <form onSubmit={handleSubmit} className="api-key-form">
          <div className="input-group">
            <label htmlFor="apiKey">OpenAI API-Schlüssel:</label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className={error ? 'error' : ''}
              disabled={isValidating}
            />
            {error && <p className="error-message">{error}</p>}
          </div>

          <div className="api-key-info">
            <h3>📋 Wie Sie Ihren API-Schlüssel erhalten:</h3>
            <ol>
              <li>Besuchen Sie <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a></li>
              <li>Erstellen Sie ein kostenloses Konto oder melden Sie sich an</li>
              <li>Gehen Sie zu "API Keys"</li>
              <li>Klicken Sie auf "Create new secret key"</li>
              <li>Kopieren Sie den Schlüssel (beginnt mit "sk-")</li>
            </ol>
            <p className="security-note">
              <strong>🔒 Sicherheit:</strong> Ihr API-Schlüssel wird nur lokal gespeichert und nie an Dritte weitergegeben.
            </p>
          </div>

          <div className="api-key-actions">
            <button 
              type="submit" 
              className="submit-button"
              disabled={isValidating || !apiKey.trim()}
            >
              {isValidating ? '🔍 Validiere...' : '✅ API-Schlüssel speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 