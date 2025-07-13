import { useState, useEffect } from 'react'
import CameraScanner from './components/CameraScanner'
import AnalysisResult from './components/AnalysisResult'
import ApiKeyInput from './components/ApiKeyInput'
import ApiKeyDialog from './components/ApiKeyDialog'
import { OpenAIService, type IngredientAnalysis } from './services/openaiService'
import './App.css'
import './components/CameraScanner.css'
import './components/AnalysisResult.css'

function App() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<IngredientAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Prüfe beim Start, ob ein API-Schlüssel vorhanden ist
  useEffect(() => {
    const apiKeyExists = OpenAIService.hasApiKey();
    setHasApiKey(apiKeyExists);
    setShowApiKeyInput(!apiKeyExists);
  }, []);

  const handleApiKeySubmit = (apiKey: string) => {
    OpenAIService.setApiKey(apiKey);
    setShowApiKeyInput(false);
    setHasApiKey(true);
  };

  const handleApiKeyChange = () => {
    const apiKeyExists = OpenAIService.hasApiKey();
    setHasApiKey(apiKeyExists);
    setShowApiKeyInput(!apiKeyExists);
  };

  const handleCapture = async (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setError(null);
    setIsAnalyzing(true);
    
    try {
      // Base64-String ohne "data:image/jpeg;base64," Präfix extrahieren
      const base64Data = imageSrc.split(',')[1];
      const analysisResult = await OpenAIService.analyzeIngredients(base64Data);
      setAnalysis(analysisResult);
    } catch (err) {
      console.error('Analyse-Fehler:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewScan = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setError(null);
  };

  const getErrorIcon = (errorMessage: string) => {
    if (errorMessage.includes('API-Schlüssel')) return '🔑';
    if (errorMessage.includes('Netzwerk')) return '🌐';
    if (errorMessage.includes('Server')) return '🖥️';
    if (errorMessage.includes('Bild')) return '📷';
    if (errorMessage.includes('Zutaten')) return '🔍';
    if (errorMessage.includes('Limit')) return '⏰';
    return '❌';
  };

  const getErrorSuggestion = (errorMessage: string) => {
    if (errorMessage.includes('API-Schlüssel')) {
      return 'Überprüfen Sie Ihren OpenAI API-Schlüssel oder ändern Sie ihn über die Einstellungen.';
    }
    if (errorMessage.includes('Netzwerk')) {
      return 'Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';
    }
    if (errorMessage.includes('Server')) {
      return 'Die OpenAI-Server sind temporär überlastet. Bitte versuchen Sie es in einigen Minuten erneut.';
    }
    if (errorMessage.includes('Bild')) {
      return 'Stellen Sie sicher, dass das Bild klar, gut beleuchtet und die Zutatenliste gut lesbar ist.';
    }
    if (errorMessage.includes('Zutaten')) {
      return 'Positionieren Sie die Kamera so, dass die gesamte Zutatenliste sichtbar ist.';
    }
    if (errorMessage.includes('Limit')) {
      return 'Warten Sie einen Moment und versuchen Sie es dann erneut.';
    }
    return 'Versuchen Sie es erneut oder starten Sie einen neuen Scan.';
  };

  return (
    <div className="app">
      <h1>Ingredient Scanner</h1>
      
      {/* API-Schlüssel-Eingabe */}
      <ApiKeyInput 
        onApiKeySubmit={handleApiKeySubmit}
        isVisible={showApiKeyInput}
      />
      
      {/* API-Schlüssel-Dialog */}
      <ApiKeyDialog
        isVisible={showApiKeyDialog}
        onClose={() => setShowApiKeyDialog(false)}
        onApiKeyChange={handleApiKeyChange}
      />
      
      {/* Dezenter API-Schlüssel-Hinweis */}
      {hasApiKey && !showApiKeyInput && (
        <div className="api-key-indicator" onClick={() => setShowApiKeyDialog(true)}>
          <span className="indicator-icon">🔑</span>
          <span className="indicator-text">API-Schlüssel gesetzt</span>
        </div>
      )}
      
      {!capturedImage ? (
        <CameraScanner onCapture={handleCapture} />
      ) : (
        <div className="result-view">
          <h2>Gescannte Zutatenliste</h2>
          <div className="image-preview">
            <img src={capturedImage} alt="Gescannte Zutatenliste" />
          </div>
          
          {isAnalyzing && (
            <div className="analyzing">
              <div className="loading-spinner"></div>
              <p>Analysiere Zutatenliste...</p>
              <p className="analyzing-hint">Dies kann einige Sekunden dauern</p>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <div className="error-header">
                <span className="error-icon">{getErrorIcon(error)}</span>
                <h3>Analyse fehlgeschlagen</h3>
              </div>
              <p className="error-text">{error}</p>
              <div className="error-suggestion">
                <strong>Vorschlag:</strong> {getErrorSuggestion(error)}
              </div>
              <div className="error-actions">
                <button onClick={handleNewScan} className="new-scan-button">
                  🔄 Neuen Scan starten
                </button>
                <button onClick={() => setError(null)} className="retry-button">
                  🔁 Erneut versuchen
                </button>
              </div>
            </div>
          )}
          
          {analysis && !isAnalyzing && (
            <AnalysisResult analysis={analysis} onNewScan={handleNewScan} />
          )}
          
          {!analysis && !isAnalyzing && !error && (
            <div className="result-controls">
              <button onClick={handleNewScan} className="new-scan-button">
                🔄 Neuen Scan starten
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
