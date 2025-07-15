import { useState, useEffect } from 'react'
import ScanView from './components/ScanView';
import PrepareView from './components/PrepareView';
import ResultView from './components/ResultView';
import ApiKeyManager from './components/ApiKeyManager'
import IngredientLists from './components/IngredientLists'
import { OpenAIService, type IngredientAnalysis } from './services/openaiService'
import { TesseractService } from './services/tesseractService'
import './App.css'
import './components/ListsButtons.css'
import './components/CameraPreview.css'
import './components/ApiKeyManager.css'
import DebugOverlay from './debug/DebugOverlay';
import type { DebugInfo, TesseractDebugInfo } from './debug/DebugOverlay';

type AppView = 'scan' | 'prepare' | 'result';

function App() {
  const [view, setView] = useState<AppView>('scan');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<IngredientAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
  const [showIngredientLists, setShowIngredientLists] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>();
  const [tesseractDebugInfo, setTesseractDebugInfo] = useState<TesseractDebugInfo>();

  // Prüfe beim Start, ob ein API-Schlüssel vorhanden ist
  useEffect(() => {
    const apiKeyExists = OpenAIService.hasApiKey();
    // Zeige Dialog beim Start, wenn kein API-Key vorhanden ist
    if (!apiKeyExists) {
      setShowApiKeyManager(true);
    }
  }, []);

  const handleApiKeyChange = () => {
    OpenAIService.hasApiKey();
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
      
      const [ocrIngredients, aiResult] = await Promise.allSettled([
        TesseractService.extractIngredients(base64Data, info => { setTesseractDebugInfo(info); }),
        OpenAIService.analyzeIngredients(base64Data)
      ]);

      // Ergebnis verarbeiten
      let finalResult: IngredientAnalysis;
      
      if (aiResult.status === 'fulfilled') {
        // OpenAI-Analyse erfolgreich
        finalResult = aiResult.value;
        
        // OCR-Ergebnisse hinzufügen, falls verfügbar
        if (ocrIngredients.status === 'fulfilled' && ocrIngredients.value.length > 0) {
          const combinedIngredients = Array.from(new Set([
            ...finalResult.ingredients,
            ...ocrIngredients.value
          ]));
          finalResult.ingredients = combinedIngredients;
        }
      } else {
        // Nur OCR verfügbar
        const ocrResult = ocrIngredients.status === 'fulfilled' ? ocrIngredients.value : [];
        finalResult = {
          ingredients: ocrResult,
          allergens: [],
          nutrition: '',
          summary: 'OCR fallback: Ingredients extracted from image text.'
        };
      }
      
      setAnalysis(finalResult);
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
            setDebugInfo={setDebugInfo}
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
      <DebugOverlay debugInfo={debugInfo} tesseractInfo={tesseractDebugInfo} />
    </div>
  )
}

export default App
