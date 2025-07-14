import { useState, useEffect } from 'react'
import CameraPreview from './components/CameraPreview'
import ApiKeyManager from './components/ApiKeyManager'
import ToleranceQuestion from './components/ToleranceQuestion'
import IngredientLists from './components/IngredientLists'
import ListsButtons from './components/ListsButtons'
import ResultView from './components/ResultView';
import { OpenAIService, type IngredientAnalysis } from './services/openaiService'
import './App.css'
import './components/ListsButtons.css'
import './components/CameraPreview.css'
import './components/ApiKeyManager.css'

function App() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<IngredientAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
  const [showToleranceQuestion, setShowToleranceQuestion] = useState(false);
  const [showIngredientLists, setShowIngredientLists] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showResultView, setShowResultView] = useState(false);

  // Prüfe beim Start, ob ein API-Schlüssel vorhanden ist
  useEffect(() => {
    const apiKeyExists = OpenAIService.hasApiKey();
    setHasApiKey(apiKeyExists);
    // Zeige Dialog beim Start, wenn kein API-Key vorhanden ist
    if (!apiKeyExists) {
      setShowApiKeyManager(true);
    }
  }, []);

  const handleApiKeyChange = () => {
    const apiKeyExists = OpenAIService.hasApiKey();
    setHasApiKey(apiKeyExists);
  };

  const handleCapture = async (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setError(null);
    setIsAnalyzing(true);
    setShowResultView(true);
    
    try {
      // Base64-String ohne "data:image/jpeg;base64," Präfix extrahieren
      const base64Data = imageSrc.split(',')[1];
      const analysisResult = await OpenAIService.analyzeIngredients(base64Data);
      setAnalysis(analysisResult);
      
      // Zeige Verträglichkeits-Abfrage nach erfolgreicher Analyse
      setShowToleranceQuestion(true);
    } catch (err) {
      console.error('Analyse-Fehler:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToleranceComplete = () => {
    setShowToleranceQuestion(false);
  };

  const handleToleranceCancel = () => {
    setShowToleranceQuestion(false);
  };

  return (
    <div className="app">
      <h1>Ingredient Scanner</h1>
      
      {/* API-Schlüssel-Manager */}
      <ApiKeyManager
        isVisible={showApiKeyManager}
        onClose={() => setShowApiKeyManager(false)}
        onApiKeyChange={handleApiKeyChange}
      />
      
      {/* Verträglichkeits-Abfrage */}
      {analysis && showToleranceQuestion && (
        <ToleranceQuestion
          analysis={analysis}
          onComplete={handleToleranceComplete}
          onCancel={handleToleranceCancel}
        />
      )}
      
      {/* Listen-Dialog */}
      <IngredientLists
        isVisible={showIngredientLists}
        onClose={() => setShowIngredientLists(false)}
      />
      
      {/* Dezenter API-Schlüssel-Hinweis */}
      {hasApiKey && !showApiKeyManager && (
        <div className="api-key-indicator" onClick={() => setShowApiKeyManager(true)}>
          <span className="indicator-icon">🔑</span>
          <span className="indicator-text">API-Schlüssel gesetzt</span>
        </div>
      )}
      
      {/* Listen-Buttons */}
      {hasApiKey && !showApiKeyManager && !capturedImage && (
        <ListsButtons onShowLists={() => setShowIngredientLists(true)} />
      )}
      
      {/* Kamera-Vorschau */}
      {!capturedImage || !showResultView ? (
        <CameraPreview onCapture={handleCapture} />
      ) : (
        <ResultView
          capturedImage={capturedImage}
          isAnalyzing={isAnalyzing}
          error={error}
          analysis={analysis}
          showToleranceQuestion={showToleranceQuestion}
          onClose={() => {
            setShowResultView(false);
            setCapturedImage(null);
            setAnalysis(null);
            setError(null);
          }}
        />
      )}
    </div>
  )
}

export default App
