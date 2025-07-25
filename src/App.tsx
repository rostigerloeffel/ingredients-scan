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
import './components/ScanView/CameraPreview.css'
import './components/ApiKeyManager.css'
import DebugOverlay from './debug/DebugOverlay';
import type { DebugInfo, TesseractDebugInfo } from './debug/DebugOverlay';
import CameraPermissionInfo from './components/ScanView/CameraPermissionInfo';

type CroppingDebugInfo = { boundingBox?: { left: number, top: number, width: number, height: number }, blockLines?: any[], error?: string };

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
  const [ingredientListsTab, setIngredientListsTab] = useState<'positive' | 'negative'>('positive');
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [croppingDebugInfo, setCroppingDebugInfo] = useState<CroppingDebugInfo>();

  // Prüfe beim Start, ob ein API-Schlüssel vorhanden ist
  useEffect(() => {
    const apiKeyExists = OpenAIService.hasApiKey();
    const dialogShown = localStorage.getItem('apiKeyDialogShown');
    // Zeige Dialog beim Start, wenn kein API-Key vorhanden ist und noch nie gezeigt
    if (!apiKeyExists && !dialogShown) {
      setShowApiKeyManager(true);
    }
  }, []);

  // Kamera-Berechtigung nur einmal beim App-Start abfragen
  useEffect(() => {
    async function checkCameraPermission() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraPermission('granted');
      } catch (e) {
        setCameraPermission('denied');
      }
    }
    checkCameraPermission();
  }, []);

  const handleApiKeyChange = () => {
    OpenAIService.hasApiKey();
  };

  const handleApiKeyDialogClose = () => {
    setShowApiKeyManager(false);
    localStorage.setItem('apiKeyDialogShown', 'true');
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
          summary: 'Inhaltsstoffe durch Texterkennung erkannt'
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

  const handleShowLists = (tab: 'positive' | 'negative' = 'positive') => {
    setIngredientListsTab(tab);
    setShowIngredientLists(true);
  };

  return (
    <div className="app">
      <h1>Ingredient Scanner</h1>
      
      {/* API-Schlüssel-Manager */}
      <ApiKeyManager
        isVisible={showApiKeyManager}
        onClose={handleApiKeyDialogClose}
        onApiKeyChange={handleApiKeyChange}
      />
      
      {/* Listen-Dialog */}
      <IngredientLists
        isVisible={showIngredientLists}
        onClose={() => setShowIngredientLists(false)}
        initialTab={ingredientListsTab}
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
          cameraPermission === 'granted' ? (
            <ScanView
              onCapture={handleCapture}
              onShowLists={handleShowLists}
              setDebugInfo={setDebugInfo}
              cameraPermission={cameraPermission}
            />
          ) : cameraPermission === 'denied' ? (
            <CameraPermissionInfo />
          ) : (
            <div className="camera-permission-waiting">
              <p>⏳ Kamera-Berechtigung wird angefragt...</p>
            </div>
          )
        )}
        {view === 'prepare' && capturedImage && (
          <PrepareView
            image={capturedImage}
            onCropDone={handleCropDone}
            onShowLists={(tab: 'positive' | 'negative' = 'positive') => { setIngredientListsTab(tab); setShowIngredientLists(true); }}
            onDebugInfo={setCroppingDebugInfo}
          />
        )}
        {view === 'result' && capturedImage && (
          <ResultView
            capturedImage={capturedImage}
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            error={error}
            onClose={handleResultClose}
            onShowLists={(tab: 'positive' | 'negative' = 'positive') => { setIngredientListsTab(tab); setShowIngredientLists(true); }}
          />
        )}
      </main>
      <DebugOverlay debugInfo={debugInfo} tesseractInfo={tesseractDebugInfo} />
      {import.meta.env.DEV && croppingDebugInfo && (
        <div style={{position:'fixed',bottom:16,left:16,zIndex:10000,background:'rgba(0,0,0,0.8)',color:'#fff',padding:'12px 18px',borderRadius:10,fontSize:15,maxWidth:380,boxShadow:'0 2px 12px #0008',overflowY:'auto',maxHeight:'90vh'}}>
          <div><b>Cropper Debug:</b></div>
          {croppingDebugInfo.error && <div style={{color:'#ff6b6b'}}>{croppingDebugInfo.error}</div>}
          {croppingDebugInfo.boundingBox && (
            <div>Bounding Box: left={croppingDebugInfo.boundingBox.left}, top={croppingDebugInfo.boundingBox.top}, width={croppingDebugInfo.boundingBox.width}, height={croppingDebugInfo.boundingBox.height}</div>
          )}
          {croppingDebugInfo.blockLines && (
            <div>Block lines: {croppingDebugInfo.blockLines.length}</div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
