import React, { useCallback, useEffect } from 'react';
import { Cropper } from 'react-cropper';
import '../styles/cropper.css';
import ListsButtons from './ListsButtons';
import VerticalMainLayout from './VerticalMainLayout';
import './CameraPreview.css';
import { createWorker, PSM } from 'tesseract.js';
import Fuse from 'fuse.js';

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
      const psmModes = [
        PSM.SINGLE_BLOCK, // 6
        PSM.AUTO,         // 3
        PSM.SPARSE_TEXT,  // 11
        PSM.SINGLE_LINE,  // 7
        PSM.SINGLE_WORD   // 8
      ];
      const worker = await createWorker();
      await worker.load();
      await worker.reinitialize('eng+deu');
      let blockLines: any[] = [];
      for (const psm of psmModes) {
        await worker.setParameters({
          tessedit_pageseg_mode: psm
        });
        const { data } = await worker.recognize(image);
        // Zielwörter für Ingredients-Header
        const headerWords = [
          'ingredients', 'ingredient', 'inc', 'zutaten', 'bestandteile',
          'composition', 'composizione', 'composición', 'ingrédients', 'ingrediënten'
        ];
        const fuse = new Fuse(headerWords, { threshold: 0.4 });
        blockLines = [];
        let inBlock = false;
        const lines = (data.blocks || []).flatMap((block: any) => block.lines || []);
        for (const line of lines) {
          // Fuzzy-Suche nach Header
          const lineText = line.text.toLowerCase();
          // Prüfe auf Doppelpunkt, entferne ihn für die Suche
          const textForSearch = lineText.replace(/[:：]/g, '').trim();
          const fuseResult = fuse.search(textForSearch);
          if (!inBlock && fuseResult.length > 0) {
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
        if (blockLines.length > 0) {
          // Treffer gefunden, breche die Schleife ab
          break;
        }
      }
      await worker.terminate();
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