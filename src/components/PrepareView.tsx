import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cropper } from 'react-cropper';
import '../styles/cropper.css';
import ListsButtons from './ListsButtons';
import VerticalMainLayout from './VerticalMainLayout';
import './CameraPreview.css';
import './PrepareView.css';
import { TesseractService } from '../services/tesseractService';

interface PrepareViewProps {
  image: string;
  onCropDone: (croppedImage: string) => void;
  onShowLists: () => void;
  onDebugInfo?: (info: { boundingBox?: { left: number, top: number, width: number, height: number }, blockLines?: any[], error?: string }) => void;
}

const PrepareView: React.FC<PrepareViewProps> = React.memo(({ image, onCropDone, onShowLists, onDebugInfo }) => {
  const cropperRef = useRef<any>(null);
  const pendingCropBox = useRef<{ left: number, top: number, width: number, height: number } | null>(null);
  const [cropperReady, setCropperReady] = useState(false);

  // Automatic cropping to INCI block
  useEffect(() => {
    async function detectInciBlock() {
      const { boundingBox } = await TesseractService.detectAdaptiveCrop(image, onDebugInfo);
      
      if (boundingBox) {
        pendingCropBox.current = boundingBox;
        if (cropperReady && cropperRef.current?.cropper) {
          cropperRef.current.cropper.setCropBoxData(boundingBox);
        }
      }
    }
    detectInciBlock();
    return () => { };
  }, [image, cropperReady, onDebugInfo]);

  // Handler for Cropper's ready event
  const handleCropperReady = useCallback(() => {
    setCropperReady(true);
    if (pendingCropBox.current && cropperRef.current?.cropper) {
      cropperRef.current.cropper.setCropBoxData(pendingCropBox.current);
    }
  }, []);

  const handleCrop = useCallback(() => {
    if (cropperRef.current) {
      // @ts-ignore
      const cropped = cropperRef.current.cropper.getCroppedCanvas().toDataURL('image/jpeg', 0.95);
      onCropDone(cropped);
    }
  }, [cropperRef, onCropDone]);

  return (
    <VerticalMainLayout
      top={<ListsButtons onShowLists={onShowLists} />}
      middle={
        <div className="prepare-preview">
          <div className="cropper-container">
            <Cropper
              src={image}
              style={{ width: '100%', height: '100%' }}
              guides={true}
              viewMode={1}
              dragMode="move"
              background={false}
              responsive={true}
              autoCropArea={1}
              ref={cropperRef}
              ready={handleCropperReady}
            />
          </div>
        </div>
      }
      bottom={
        <div className="camera-controls">
          <button onClick={handleCrop} className="scan-button">Weiter</button>
        </div>
      }
    />
  );
});

export default PrepareView; 