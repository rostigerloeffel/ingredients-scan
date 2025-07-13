import React, { useState, useEffect, useRef } from 'react';
import './CameraPreview.css';

interface CameraPreviewProps {
  onCapture: (imageSrc: string) => void;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({ onCapture }) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Kamera-Berechtigung und Geräte beim Start laden
  useEffect(() => {
    initializeCamera();
  }, []);

  // Stream starten wenn Kamera ausgewählt wird
  useEffect(() => {
    if (selectedCamera && hasPermission) {
      startCamera();
    }
  }, [selectedCamera, hasPermission]);

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const initializeCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Prüfe ob getUserMedia unterstützt wird
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera wird von diesem Browser nicht unterstützt');
      }

      // Kamera-Berechtigung anfordern
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop()); // Temporären Stream stoppen
      setHasPermission(true);

      // Verfügbare Kameras laden
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('Keine Kamera gefunden');
      }

      setCameras(videoDevices);
      setSelectedCamera(videoDevices[0].deviceId);
      setIsLoading(false);

    } catch (err: any) {
      console.error('Kamera-Initialisierung fehlgeschlagen:', err);
      
      let errorMessage = 'Kamera konnte nicht gestartet werden';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Kamera-Berechtigung verweigert. Bitte erlauben Sie den Zugriff auf die Kamera.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Keine Kamera gefunden. Bitte stellen Sie sicher, dass eine Kamera angeschlossen ist.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Kamera wird von diesem Browser nicht unterstützt.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    if (!selectedCamera || !hasPermission) return;

    try {
      // Vorherigen Stream stoppen
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      setIsLoading(true);
      setError(null);

      let constraints;
      
      if (cameras.length === 1) {
        // Wenn nur eine Kamera verfügbar ist, verwende einfache Constraints
        constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          }
        };
      } else {
        // Wenn mehrere Kameras verfügbar sind, verwende deviceId
        constraints = {
          video: {
            deviceId: { exact: selectedCamera },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: 'environment'
          }
        };
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        
        // Event-Handler für Video-Loading
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
        };
        
        // Fallback falls Events nicht ausgelöst werden
        setTimeout(() => {
          if (isLoading) {
            setIsLoading(false);
          }
        }, 5000);
      } else {
        setIsLoading(false);
      }

    } catch (err: any) {
      console.error('Kamera-Start fehlgeschlagen:', err);
      
      let errorMessage = 'Kamera konnte nicht gestartet werden';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Kamera-Berechtigung verweigert';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Ausgewählte Kamera nicht gefunden';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Kamera wird bereits von einer anderen Anwendung verwendet';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Kamera-Unterstützung nicht verfügbar. Bitte verwenden Sie eine andere Kamera.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId);
  };

  const handleCapture = async () => {
    if (!videoRef.current || !stream) return;

    setIsScanning(true);
    
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Canvas-Kontext nicht verfügbar');
      }

      // Warte bis das Video bereit ist
      if (videoRef.current.readyState < 2) {
        await new Promise(resolve => {
          videoRef.current!.onloadeddata = resolve;
        });
      }

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      context.drawImage(videoRef.current, 0, 0);
      
      const imageSrc = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(imageSrc);
    } catch (err) {
      console.error('Bildaufnahme-Fehler:', err);
      setError('Bildaufnahme fehlgeschlagen');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setStream(null);
    setHasPermission(false);
    initializeCamera();
  };

  if (error) {
    return (
      <div className="camera-error">
        <div className="error-icon">📷</div>
        <h3>Kamera-Fehler</h3>
        <p>{error}</p>
        <button onClick={handleRetry} className="retry-button">
          🔄 Erneut versuchen
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="camera-loading">
        <div className="loading-spinner"></div>
        <p>Kamera wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="camera-preview">
      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
        />
        
        <div className="scan-overlay">
          <div className="scan-window">
            <div className="scan-corners">
              <div className="scan-corner top-left"></div>
              <div className="scan-corner top-right"></div>
              <div className="scan-corner bottom-left"></div>
              <div className="scan-corner bottom-right"></div>
            </div>
          </div>
          <div className="scan-instructions">
            Inhaltsstoffe im Rahmen positionieren
          </div>
        </div>
      </div>
      
      <div className="camera-controls">
        {cameras.length > 1 && (
          <div className="camera-selector">
            <label htmlFor="camera-select">Kamera:</label>
            <select
              id="camera-select"
              className="camera-select"
              value={selectedCamera}
              onChange={(e) => handleCameraChange(e.target.value)}
            >
              {cameras.map((camera) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Kamera ${camera.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <button
          onClick={handleCapture}
          disabled={isScanning || !stream}
          className={`scan-button ${isScanning ? 'scanning' : ''}`}
        >
          {isScanning ? '📷 Scanne...' : '📷 Inhaltsstoffe scannen'}
        </button>
      </div>
    </div>
  );
};

export default CameraPreview; 