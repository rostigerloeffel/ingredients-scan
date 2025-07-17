import React, { useCallback } from 'react';
import { Cropper } from 'react-cropper';
import '../styles/cropper.css';
import ListsButtons from './ListsButtons';
import VerticalMainLayout from './VerticalMainLayout';
import './CameraPreview.css';

interface PrepareViewProps {
  image: string;
  onCropDone: (croppedImage: string) => void;
  onShowLists: () => void;
}

const PrepareView: React.FC<PrepareViewProps> = React.memo(({ image, onCropDone, onShowLists }) => {
  const cropperRef = React.useRef<HTMLImageElement>(null);

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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: '100%', height: '100%', minHeight: 0 }}>
          <div style={{ width: '100%', maxWidth: 600, maxHeight: '60vh', aspectRatio: '4/3', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Cropper
              src={image}
              style={{ width: '100%', height: '100%', maxHeight: '60vh', minHeight: 0, objectFit: 'contain' }}
              guides={true}
              viewMode={1}
              dragMode="move"
              background={false}
              responsive={true}
              autoCropArea={1}
              ref={cropperRef}
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