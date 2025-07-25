import React, { useState, useRef, useCallback } from 'react';
import CameraPreview from './CameraPreview';
import type { CameraPreviewHandle } from './CameraPreview';
import ListsButtons from '../ingredients/ListsButtons';
import VerticalMainLayout from '../VerticalMainLayout';
import type { DebugInfo } from '../../debug/DebugOverlay';
import { t } from '../../i18n';

interface ScanViewProps {
  onCapture: (imageSrc: string) => void;
  onShowLists: () => void;
  setDebugInfo: (info: DebugInfo) => void;
  cameraPermission: 'unknown' | 'granted' | 'denied';
}

const ScanView: React.FC<ScanViewProps> = React.memo(({ onCapture, onShowLists, setDebugInfo, cameraPermission }) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const cameraRef = useRef<CameraPreviewHandle>(null);

  React.useEffect(() => {
    if (cameraPermission !== 'granted') return;
    const getCameras = async () => {
      try {
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
  }, [cameraPermission]);

  const handleCameraChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(event.target.value);
    localStorage.setItem('selected_camera', event.target.value);
  }, []);

  // Cropping-Logik: Schneide Screenshot auf exakt den sichtbaren Bereich (wie im Kamera-Container angezeigt)
  const cropToVisibleCameraArea = useCallback(async (imageSrc: string): Promise<string> => {
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
        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const dataUrl = canvas.toDataURL('image/png');
        if (import.meta.env.DEV) {
          setDebugInfo({origW: videoW, origH: videoH, cropW: Math.round(cropW), cropH: Math.round(cropH), cropUrl: dataUrl});
        }
        resolve(dataUrl);
      };
      img.src = imageSrc;
    });
  }, [setDebugInfo]);

  const handleScan = useCallback(async () => {
    const imageSrc = await cameraRef.current?.getFullResScreenshot();
    if (imageSrc) {
      const cropped = await cropToVisibleCameraArea(imageSrc);
      onCapture(cropped);
    }
  }, [cropToVisibleCameraArea, onCapture]);

  return (
    <VerticalMainLayout
      top={<ListsButtons onShowLists={onShowLists} />}
      middle={
        <>
          <CameraPreview ref={cameraRef} cameraId={selectedCamera} />
        </>
      }
      bottom={
        <div className="camera-controls">
          {cameras.length > 1 && (
            <div className="camera-selector">
              <label htmlFor="camera-select">{t('camera')}</label>
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
            {t('scan_button')}
          </button>
        </div>
      }
    />
  );
});

export default ScanView; 