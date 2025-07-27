import React, { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import './CameraPreview.css';
import '../../styles/cropper.css';

export interface CameraPreviewHandle {
  getFullResScreenshot: () => Promise<string | null>;
}

interface CameraPreviewProps {
  cameraId?: string;
}

const CameraPreviewInner = forwardRef<CameraPreviewHandle, CameraPreviewProps>(({ cameraId }, ref) => {
  const webcamRef = useRef<Webcam>(null);



  const getFullResScreenshot = useCallback(async () => {
    if (webcamRef.current && webcamRef.current.video) {
      const video = webcamRef.current.video as HTMLVideoElement;
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width && height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { 
          alpha: false,
          willReadFrequently: false,
          desynchronized: false
        });
        if (ctx) {
          // Beste Qualität für Canvas-Rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, 0, 0, width, height);
          return canvas.toDataURL('image/jpeg', 1.0);
        }
      }
    }
    return null;
  }, []);

  useImperativeHandle(ref, () => ({
    getFullResScreenshot
  }), [getFullResScreenshot]);

  return (
    <div className="camera-preview">
      <div className="camera-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={{
            deviceId: cameraId ? { exact: cameraId } : undefined,
            width: { ideal: 3840, min: 640, max: 4096 },
            height: { ideal: 2160, min: 480, max: 2160 },
            facingMode: 'environment'
          }}
          screenshotFormat="image/jpeg"
          screenshotQuality={1.0}
          className="camera-video"
        />
        <div className="scan-overlay">
          <div className="scan-window"></div>
          <div className="scan-instructions">
            Inhaltsstoffe im Rahmen positionieren
          </div>
        </div>
      </div>
    </div>
  );
});

const CameraPreview = React.memo(CameraPreviewInner);

export default CameraPreview; 