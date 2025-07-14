import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import './CameraPreview.css';
import Cropper from 'react-easy-crop';

interface CameraPreviewProps {
  onCapture: (imageSrc: string) => void;
}

const CAMERA_STORAGE_KEY = 'selected_camera';

const CameraPreview: React.FC<CameraPreviewProps> = ({ onCapture }) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const webcamRef = useRef<Webcam>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Kameras nach Kamera-Berechtigung abrufen
  React.useEffect(() => {
    const getCameras = async () => {
      try {
        // Erst Kamera-Berechtigung anfordern
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        // Dann alle Kameras abrufen
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Gefundene Kameras:', videoDevices.length, videoDevices);
        setCameras(videoDevices);
        
        // Prüfe, ob eine Kamera im LocalStorage gespeichert ist
        const storedCamera = localStorage.getItem(CAMERA_STORAGE_KEY);
        if (storedCamera && videoDevices.some(cam => cam.deviceId === storedCamera)) {
          setSelectedCamera(storedCamera);
        } else if (videoDevices.length > 0) {
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
        setRawImage(imageSrc);
        setShowCrop(true);
      }
    }
  }, []);

  // Cropping-Callback
  const onCropComplete = useCallback((_: any, croppedAreaPixels: { width: number; height: number; x: number; y: number }) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Bild zuschneiden und weitergeben
  const handleCropConfirm = async () => {
    if (!rawImage || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(rawImage, croppedAreaPixels);
    setShowCrop(false);
    setRawImage(null);
    onCapture(cropped);
  };

  // Hilfsfunktion zum Croppen
  async function getCroppedImg(imageSrc: string, crop: any): Promise<string> {
    return new Promise((resolve) => {
      const image = new window.Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(
          image,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height
        );
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      image.src = imageSrc;
    });
  }

  // Kamera wechseln
  const handleCameraChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(event.target.value);
    localStorage.setItem(CAMERA_STORAGE_KEY, event.target.value);
  };

  return (
    <div className="camera-preview">
      {/* Cropping-Dialog */}
      {showCrop && rawImage && (
        <div className="cropper-modal">
          <div className="cropper-container">
            <Cropper
              image={rawImage}
              crop={crop}
              zoom={zoom}
              aspect={4/3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
            <div className="cropper-controls">
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
              />
              <button onClick={handleCropConfirm} className="scan-button">Ausschnitt übernehmen</button>
              <button onClick={() => { setShowCrop(false); setRawImage(null); }} className="cancel-button">Abbrechen</button>
            </div>
          </div>
        </div>
      )}
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
        {/* Kamera-Auswahl */}
        {cameras.length > 1 && (
          <div className="camera-selector">
            <label htmlFor="camera-select">Kamera:</label>
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
          📷 Inhaltsstoffe scannen
        </button>
      </div>
    </div>
  );
};

export default CameraPreview; 