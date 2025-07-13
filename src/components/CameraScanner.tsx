import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';

interface CameraScannerProps {
  onCapture: (imageSrc: string) => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture }) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  // Kameras nach Kamera-Berechtigung abrufen
  React.useEffect(() => {
    const getCameras = async () => {
      try {
        // Erst Kamera-Berechtigung anfordern
        await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraPermissionGranted(true);
        
        // Dann alle Kameras abrufen
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Gefundene Kameras:', videoDevices.length, videoDevices);
        setCameras(videoDevices);
        
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Fehler beim Abrufen der Kameras:', error);
      }
    };

    getCameras();
  }, []);

  // Foto aufnehmen
  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        onCapture(imageSrc);
      }
    }
  }, [onCapture]);

  // Kamera wechseln
  const handleCameraChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(event.target.value);
  };

  return (
    <div className="camera-scanner">
      <div className="camera-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={{
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment' // Rückkamera bevorzugen
          }}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.8}
          className="camera-view"
        />
        
        {/* Scan-Fenster Overlay */}
        <div className="scan-overlay">
          <div className="scan-window">
            <div className="scan-corner scan-corner-tl"></div>
            <div className="scan-corner scan-corner-tr"></div>
            <div className="scan-corner scan-corner-bl"></div>
            <div className="scan-corner scan-corner-br"></div>
          </div>
        </div>
      </div>

      <div className="camera-controls">
        {/* Debug-Info */}
        <div className="debug-info" style={{ color: '#00ff88', fontSize: '12px', marginBottom: '10px' }}>
          Kameras gefunden: {cameras.length} | Berechtigung: {cameraPermissionGranted ? 'Ja' : 'Nein'}
        </div>

        {/* Kamera-Auswahl */}
        {cameras.length > 1 && (
          <div className="camera-selector">
            <label htmlFor="camera-select">Kamera wählen:</label>
            <select
              id="camera-select"
              value={selectedCamera}
              onChange={handleCameraChange}
              className="camera-select"
            >
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Kamera ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scan-Button */}
        <button onClick={capture} className="scan-button">
          📸 Inhaltsstoffe scannen
        </button>
      </div>
    </div>
  );
};

export default CameraScanner; 