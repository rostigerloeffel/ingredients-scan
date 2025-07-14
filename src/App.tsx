import { useState, useEffect } from 'react'
import ScanView from './components/ScanView';
import PrepareView from './components/PrepareView';
import ResultView from './components/ResultView';
import ApiKeyManager from './components/ApiKeyManager'
import IngredientLists from './components/IngredientLists'
import { OpenAIService, type IngredientAnalysis } from './services/openaiService'
import './App.css'
import './components/ListsButtons.css'
import './components/CameraPreview.css'
import './components/ApiKeyManager.css'

type AppView = 'scan' | 'prepare' | 'result';

function App() {
  const [view, setView] = useState<AppView>('scan');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<IngredientAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
  const [showIngredientLists, setShowIngredientLists] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

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

  // Handler für die Übergänge
  const handleCapture = (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setView('prepare');
  };

  const handleCropDone = async (croppedImage: string) => {
    setCapturedImage(croppedImage);
    setIsAnalyzing(true);
    setError(null);
    setView('result');
    try {
      // Base64-String ohne Präfix extrahieren
      const base64Data = croppedImage.split(',')[1];
      const result = await OpenAIService.analyzeIngredients(base64Data);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResultClose = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setError(null);
    setIsAnalyzing(false);
    setView('scan');
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
      
      {/* Listen-Dialog */}
      <IngredientLists
        isVisible={showIngredientLists}
        onClose={() => setShowIngredientLists(false)}
      />
      
      {/* Dezenter API-Schlüssel-Hinweis */}
      {!showApiKeyManager && (
        <button
          className="api-key-indicator"
          onClick={() => setShowApiKeyManager(true)}
        >
          <span className="indicator-icon">💬</span>
          <span className="indicator-text">ChatGPT</span>
        </button>
      )}
      
      <main className="main-view">
        {view === 'scan' && (
          <ScanView
            onCapture={handleCapture}
            onShowLists={() => setShowIngredientLists(true)}
          />
        )}
        {view === 'prepare' && capturedImage && (
          <PrepareView
            image={capturedImage}
            onCropDone={handleCropDone}
            onShowLists={() => setShowIngredientLists(true)}
          />
        )}
        {view === 'result' && capturedImage && (
          <ResultView
            capturedImage={capturedImage}
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            error={error}
            onClose={handleResultClose}
            onShowLists={() => setShowIngredientLists(true)}
          />
        )}
      </main>
    </div>
  )
}

export default App
