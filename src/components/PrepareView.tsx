import React, { useCallback, useEffect } from 'react';
import { Cropper } from 'react-cropper';
import '../styles/cropper.css';
import ListsButtons from './ListsButtons';
import VerticalMainLayout from './VerticalMainLayout';
import './CameraPreview.css';
import Tesseract from 'tesseract.js';

interface PrepareViewProps {
  image: string;
  onCropDone: (croppedImage: string) => void;
  onShowLists: () => void;
}

const PrepareView: React.FC<PrepareViewProps> = React.memo(({ image, onCropDone, onShowLists }) => {
  const cropperRef = React.useRef<any>(null);

  // Automatisches Cropping auf INCI-Block
  useEffect(() => {
    let cancelled = false;
    async function detectInciBlock() {
      const { data } = await Tesseract.recognize(image, 'eng+deu', { logger: () => {} });
      // Suche nach Zeile mit "ingredients" o.ä.
      const headerRegex = /\b(ingredients?|inc|zutaten|bestandteile|composition|composizione|composición|ingrédients|ingrediënten)\b\s*[:：]/i;
      let blockLines: any[] = [];
      let inBlock = false;
      const lines = (data.blocks || []).flatMap((block: any) => block.lines || []);
      for (const line of lines) {
        if (!inBlock && headerRegex.test(line.text)) {
          inBlock = true;
          blockLines.push(line);
          continue;
        }
        if (inBlock) {
          // Block-Ende: Leere Zeile oder Zeile ohne Komma (und nicht sehr lang)
          if (line.text.trim() === '' || (line.text.indexOf(',') === -1 && line.text.length < 20)) break;
          blockLines.push(line);
        }
      }
      if (blockLines.length > 0 && cropperRef.current) {
        // Bounding Box berechnen
        const minX = Math.min(...blockLines.map(l => l.bbox.x0));
        const minY = Math.min(...blockLines.map(l => l.bbox.y0));
        const maxX = Math.max(...blockLines.map(l => l.bbox.x1));
        const maxY = Math.max(...blockLines.map(l => l.bbox.y1));
        // Cropper setzen (Timeout, damit Cropper bereit ist)
        setTimeout(() => {
          if (!cancelled && cropperRef.current?.cropper) {
            cropperRef.current.cropper.setCropBoxData({
              left: minX,
              top: minY,
              width: maxX - minX,
              height: maxY - minY
            });
          }
        }, 500);
      }
    }
    detectInciBlock();
    return () => { cancelled = true; };
  }, [image]);

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