import React, { useState, useRef } from 'react';
import CameraPreview from './CameraPreview';
import type { CameraPreviewHandle } from './CameraPreview';
import ListsButtons from './ListsButtons';
import VerticalMainLayout from './VerticalMainLayout';

interface ScanViewProps {
  onCapture: (imageSrc: string) => void;
  onShowLists: () => void;
}

const ScanView: React.FC<ScanViewProps> = ({ onCapture, onShowLists }) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const cameraRef = useRef<CameraPreviewHandle>(null);
  const [debugInfo, setDebugInfo] = useState<{origW:number,origH:number,cropW:number,cropH:number} | null>(null);

  React.useEffect(() => {
    const getCameras = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameras(videoDevices);
        const storedCamera = localStorage.getItem('selected_camera');
        if (storedCamera && videoDevices.some(cam => cam.deviceId === storedCamera)) {
          setSelectedCamera(storedCamera);
        } else if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (error) {
        // Fehler ignorieren
      }
    };
    getCameras();
  }, []);

  const handleCameraChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(event.target.value);
    localStorage.setItem('selected_camera', event.target.value);
  };

  // Cropping-Logik: Schneide Screenshot auf exakt den sichtbaren Bereich (wie im Kamera-Container angezeigt)
  const cropToVisibleCameraArea = async (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const videoW = img.width;
        const videoH = img.height;
        // Container-Aspect-Ratio (wie in CameraPreview.css): 4:3
        const containerAspect = 4 / 3;
        const imageAspect = videoW / videoH;
        let cropW = videoW;
        let cropH = videoH;
        let cropX = 0;
        let cropY = 0;
        if (imageAspect > containerAspect) {
          // Bild ist breiter als Container: links/rechts wird beschnitten
          cropW = videoH * containerAspect;
          cropX = (videoW - cropW) / 2;
        } else if (imageAspect < containerAspect) {
          // Bild ist höher als Container: oben/unten wird beschnitten
          cropH = videoW / containerAspect;
          cropY = (videoH - cropH) / 2;
        }
        // Debug-Overlay: Auflösungen merken
        if (import.meta.env.DEV) {
          setDebugInfo({origW: videoW, origH: videoH, cropW: Math.round(cropW), cropH: Math.round(cropH)});
        }
        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageSrc;
    });
  };

  const handleScan = async () => {
    const imageSrc = cameraRef.current?.getScreenshot();
    if (imageSrc) {
      const cropped = await cropToVisibleCameraArea(imageSrc);
      onCapture(cropped);
    }
  };

  return (
    <VerticalMainLayout
      top={<ListsButtons onShowLists={onShowLists} />}
      middle={
        <>
          <CameraPreview ref={cameraRef} cameraId={selectedCamera} />
          {import.meta.env.DEV && debugInfo && (
            <div style={{position:'absolute',top:10,right:10,zIndex:1000,background:'rgba(0,0,0,0.7)',color:'#fff',padding:'8px 14px',borderRadius:8,fontSize:14}}>
              <div><b>Debug:</b></div>
              <div>Original: {debugInfo.origW} x {debugInfo.origH}</div>
              <div>Cropped: {debugInfo.cropW} x {debugInfo.cropH}</div>
            </div>
          )}
        </>
      }
      bottom={
        <div className="camera-controls">
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
          <button onClick={handleScan} className="scan-button">
            📷 Inhaltsstoffe scannen
          </button>
        </div>
      }
    />
  );
};

export default ScanView; 