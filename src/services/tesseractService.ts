import { createWorker, PSM } from 'tesseract.js';
import Fuse from 'fuse.js';
import inciNames from '../inci_names.normalized.json';

let fuseInstance: Fuse<string> | null = null;
function getFuseInstance(): Fuse<string> {
  if (!fuseInstance) {
    fuseInstance = new Fuse(inciNames, {
      includeScore: true,
      threshold: 0.70, // adjust according to desired tolerance
    });
  }
  return fuseInstance;
}

export class TesseractService {
  /**
   * Get image dimensions from base64 string
   */
  private static getImageDimensions(image: string): Promise<{ width: number, height: number }> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = image;
    });
  }

  /**
   * Check if a bounding box is meaningful (not the default fallback)
   */
  private static isMeaningfulBoundingBox(boundingBox: { left: number, top: number, width: number, height: number }, imageWidth: number, imageHeight: number): boolean {
    // Default bounding box is 80% of image size centered (10% margin on each side)
    const defaultLeft = imageWidth * 0.1;
    const defaultTop = imageHeight * 0.1;
    const defaultWidth = imageWidth * 0.8;
    const defaultHeight = imageHeight * 0.8;
    
    // Check if the bounding box is significantly different from the default
    const tolerance = 0.05; // 5% tolerance
    const leftDiff = Math.abs(boundingBox.left - defaultLeft) / imageWidth;
    const topDiff = Math.abs(boundingBox.top - defaultTop) / imageHeight;
    const widthDiff = Math.abs(boundingBox.width - defaultWidth) / imageWidth;
    const heightDiff = Math.abs(boundingBox.height - defaultHeight) / imageHeight;
    
    // Return true if any dimension differs significantly from default
    return leftDiff > tolerance || topDiff > tolerance || widthDiff > tolerance || heightDiff > tolerance;
  }

  /**
   * Adaptive cropping strategy with fallback to user-friendly default crops
   */
  static async detectAdaptiveCrop(
    image: string,
    onDebugInfo?: (info: { boundingBox?: { left: number, top: number, width: number, height: number }, blockLines?: any[], error?: string, strategy: string }) => void
  ): Promise<{ boundingBox?: { left: number, top: number, width: number, height: number }, blockLines: any[], strategy: string }> {
    
    // Get image dimensions for meaningful bounding box check
    const imageDimensions = await this.getImageDimensions(image);
    
    // Strategy 1: Template-based detection (look for "Ingredients:" headers)
    const templateResult = await this.detectByTemplate(image);
    if (templateResult.boundingBox && this.isMeaningfulBoundingBox(templateResult.boundingBox, imageDimensions.width, imageDimensions.height)) {
      if (onDebugInfo) {
        onDebugInfo({
          boundingBox: templateResult.boundingBox,
          blockLines: templateResult.blockLines,
          strategy: 'template'
        });
      }
      return { ...templateResult, strategy: 'template' };
    }

    // Strategy 2: Optimized OCR detection
    const ocrResult = await this.detectWithOptimizedOCR(image);
    if (ocrResult.boundingBox && this.isMeaningfulBoundingBox(ocrResult.boundingBox, imageDimensions.width, imageDimensions.height)) {
      if (onDebugInfo) {
        onDebugInfo({
          boundingBox: ocrResult.boundingBox,
          blockLines: ocrResult.blockLines,
          strategy: 'ocr'
        });
      }
      return { ...ocrResult, strategy: 'ocr' };
    }

    // Strategy 3: High contrast image analysis
    const contrastResult = await this.detectByContrast(image);
    if (contrastResult.boundingBox && this.isMeaningfulBoundingBox(contrastResult.boundingBox, imageDimensions.width, imageDimensions.height)) {
      if (onDebugInfo) {
        onDebugInfo({
          boundingBox: contrastResult.boundingBox,
          blockLines: contrastResult.blockLines,
          strategy: 'contrast'
        });
      }
      return { ...contrastResult, strategy: 'contrast' };
    }

    // Fallback: User-friendly default crops
    const defaultResult = await this.getDefaultCropAreas(image);
    if (onDebugInfo) {
      onDebugInfo({
        boundingBox: defaultResult.boundingBox,
        blockLines: [],
        strategy: 'default',
        error: 'No meaningful text regions detected, using default crop area'
      });
    }
    return { boundingBox: defaultResult.boundingBox, blockLines: [], strategy: 'default' };
  }

  /**
   * Template-based detection: Look for "Ingredients:" headers
   */
  private static async detectByTemplate(image: string): Promise<{ boundingBox?: { left: number, top: number, width: number, height: number }, blockLines: any[] }> {
    const worker = await createWorker();
    await worker.load();
    await worker.reinitialize('eng+deu');
    
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      tessedit_min_conf: '30',
      user_defined_dpi: '1000'
    });
    
    const { data } = await worker.recognize(image);
    await worker.terminate();

    const headerRegex = /\b(ingredients?|inc|zutaten|bestandteile|composition|composizione|composición|ingrédients|ingrediënten)\b\s*[:：]/i;
    
    for (const block of data.blocks || []) {
      const lines = (block as any).lines || [];
      for (const line of lines) {
        const words = line.words || [];
        for (const word of words) {
          const text = word.text?.toLowerCase() || '';
          if (headerRegex.test(text)) {
            // Found ingredients header, calculate bounding box for the block
            const blockLines = (block as any).lines || [];
            if (blockLines.length > 0) {
              const minX = Math.min(...blockLines.map((l: any) => l.bbox.x0));
              const minY = Math.min(...blockLines.map((l: any) => l.bbox.y0));
              const maxX = Math.max(...blockLines.map((l: any) => l.bbox.x1));
              const maxY = Math.max(...blockLines.map((l: any) => l.bbox.y1));
              
              return {
                boundingBox: {
                  left: minX,
                  top: minY,
                  width: maxX - minX,
                  height: maxY - minY
                },
                blockLines
              };
            }
          }
        }
      }
    }
    
    return { blockLines: [] };
  }

  /**
   * Contrast-based detection for high contrast images
   */
  private static async detectByContrast(image: string): Promise<{ boundingBox?: { left: number, top: number, width: number, height: number }, blockLines: any[] }> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Calculate contrast and find text regions
        const contrastThreshold = 50;
        const textRegions: { x: number, y: number, width: number, height: number }[] = [];
        
        // Simple edge detection and contrast analysis
        for (let y = 0; y < canvas.height; y += 10) {
          for (let x = 0; x < canvas.width; x += 10) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // Calculate local contrast
            let maxDiff = 0;
            for (let dy = -5; dy <= 5; dy++) {
              for (let dx = -5; dx <= 5; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                  const nidx = (ny * canvas.width + nx) * 4;
                  const diff = Math.abs(r - data[nidx]) + Math.abs(g - data[nidx + 1]) + Math.abs(b - data[nidx + 2]);
                  maxDiff = Math.max(maxDiff, diff);
                }
              }
            }
            
            if (maxDiff > contrastThreshold) {
              textRegions.push({ x, y, width: 10, height: 10 });
            }
          }
        }
        
        if (textRegions.length > 0) {
          // Calculate bounding box from text regions
          const minX = Math.min(...textRegions.map(r => r.x));
          const minY = Math.min(...textRegions.map(r => r.y));
          const maxX = Math.max(...textRegions.map(r => r.x + r.width));
          const maxY = Math.max(...textRegions.map(r => r.y + r.height));
          
          resolve({
            boundingBox: {
              left: minX,
              top: minY,
              width: maxX - minX,
              height: maxY - minY
            },
            blockLines: []
          });
        } else {
          resolve({ blockLines: [] });
        }
      };
      img.src = image;
    });
  }

  /**
   * Optimized OCR detection with multiple PSM modes and parameters
   */
  private static async detectWithOptimizedOCR(image: string): Promise<{ boundingBox?: { left: number, top: number, width: number, height: number }, blockLines: any[] }> {
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
    let boundingBox: { left: number, top: number, width: number, height: number } | undefined = undefined;
    
    for (const psm of psmModes) {
      await worker.setParameters({
        tessedit_pageseg_mode: psm,
        tessedit_min_conf: '20', // Lower confidence threshold
        user_defined_dpi: '1500' // Higher DPI for better detection
      });
      
      const { data } = await worker.recognize(image);
      
      // Find the largest contiguous text block (by number of lines)
      const blocks = (data.blocks || []);
      let largestBlock = null;
      let maxLines = 0;
      
      for (const block of blocks) {
        const lines = (block as any).lines || [];
        if (lines.length > maxLines) {
          maxLines = lines.length;
          largestBlock = block;
        }
      }
      
      if (largestBlock && ((largestBlock as any).lines || []).length > 0) {
        blockLines = (largestBlock as any).lines;
        
        // Calculate bounding box
        const minX = Math.min(...blockLines.map(l => l.bbox.x0));
        const minY = Math.min(...blockLines.map(l => l.bbox.y0));
        const maxX = Math.max(...blockLines.map(l => l.bbox.x1));
        const maxY = Math.max(...blockLines.map(l => l.bbox.y1));
        
        boundingBox = {
          left: minX,
          top: minY,
          width: maxX - minX,
          height: maxY - minY
        };
        
        break;
      }
    }
    
    await worker.terminate();
    
    return { boundingBox, blockLines };
  }

  /**
   * User-friendly default crop areas
   */
  private static async getDefaultCropAreas(image: string): Promise<{ boundingBox: { left: number, top: number, width: number, height: number } }> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const imageWidth = img.width;
        const imageHeight = img.height;
        
        // Default: centered area (80% of image size)
        const boundingBox = {
          left: imageWidth * 0.1,
          top: imageHeight * 0.1,
          width: imageWidth * 0.8,
          height: imageHeight * 0.8
        };
        
        resolve({ boundingBox });
      };
      img.src = image;
    });
  }

  /**
   * Enhanced image preprocessing for better OCR results
   */
  private static preprocessImage(imageBase64: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        //const data = imageData.data;
        // Step 1: Grayscale
        // for (let i = 0; i < data.length; i += 4) {
        //  const avg = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        //  data[i] = data[i+1] = data[i+2] = avg;
        // }
        // No sharpening, only grayscale
        ctx.putImageData(imageData, 0, 0);
        const resultUrl = canvas.toDataURL('image/png');
        if (import.meta.env && import.meta.env.DEV) {
          // Debug Log: Resolution and Base64 Preview
          console.log('[OCR-DEBUG] Preprocess:', {
            width: canvas.width,
            height: canvas.height,
            base64Preview: resultUrl.substring(0, 100) + '...'
          });
        }
        resolve(resultUrl);
      };
      img.src = `data:image/jpeg;base64,${imageBase64}`;
    });
  }

  /**
   * OCR extraction of ingredients (enhanced version)
   */
  static async extractIngredients(
    imageBase64: string,
    onDebugInfo?: (info: { preprocessedUrl: string, languages: string[], psmModes: string[], confidenceThreshold: number, dpi: number, charWhitelist: string, params: Record<string, string> }) => void
  ): Promise<string[]> {
    const preprocessed = await this.preprocessImage(imageBase64);
    if (onDebugInfo) {
      onDebugInfo({
        preprocessedUrl: preprocessed,
        languages: ['eng'],
        psmModes: [
          'SINGLE_BLOCK', 'AUTO', 'SPARSE_TEXT', 'SINGLE_LINE', 'SINGLE_WORD'
        ],
        confidenceThreshold: 40,
        dpi: 1000,
        charWhitelist: '',
        params: {
          'preserve_interword_spaces': '1',
          'tessedit_do_invert': '0',
          'textord_min_linesize': '2.0',
          'textord_old_baselines': '0',
          'textord_min_xheight': '8',
          'textord_heavy_nr': '1',
          'tessedit_ocr_engine_mode': '3',
          'lstm_use_matrix': '1',
          'lstm_choice_mode': '2',
          'user_defined_dpi': '1000'
        }
      });
    }

    // OCR with Tesseract
    const worker = await createWorker();
    await worker.load();
    await worker.reinitialize('eng');
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: '',
      preserve_interword_spaces: '1',
      tessedit_do_invert: '0',
      textord_min_linesize: '2.0',
      textord_old_baselines: '0',
      textord_min_xheight: '8',
      textord_heavy_nr: '1',
      tessedit_ocr_engine_mode: '3',
      lstm_use_matrix: '1',
      lstm_choice_mode: '2',
      user_defined_dpi: '300'
    });
    const { data: { text } } = await worker.recognize(preprocessed);
    await worker.terminate();

    if (!text || text.trim().length === 0) return [];

    // Search for the block that starts with 'ingredients:' or similar
    const lines = text.split(/\r?\n/);
    const headerRegex = /\b(ingredients?|inc|zutaten|bestandteile|composition|composizione|composición|ingrédients|ingrediënten)\b\s*[:：]/i;
    let inciLines: string[] = [];
    let inInciBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!inInciBlock && headerRegex.test(line)) {
        // Start new INCI block after the header (remove header itself)
        const afterHeader = line.replace(headerRegex, '').trim();
        if (afterHeader.length > 0) inciLines.push(afterHeader);
        inInciBlock = true;
        continue;
      }
      if (inInciBlock) {
        // Block end: empty line or line without comma (and not very long)
        if (line === '' || (line.indexOf(',') === -1 && line.length < 20)) break;
        inciLines.push(line);
      }
    }
    // Fallback: as before, longest comma block
    if (inciLines.length === 0) {
      const blocks = text.split(/\n+/);
      let inciBlock = '';
      let maxCommas = 0;
      for (const block of blocks) {
        const commaCount = (block.match(/,/g) || []).length;
        if (commaCount > maxCommas) {
          maxCommas = commaCount;
          inciBlock = block;
        }
      }
      if (!inciBlock && text.includes(',')) {
        inciBlock = text;
      }
      if (!inciBlock) return [];
      inciLines = [inciBlock];
    }
    // Combine lines into a block
    let inciBlock = inciLines.join(' ');
    // Remove everything before the first colon (e.g., "Ingredients:")
    inciBlock = inciBlock.replace(/^.*?:\s*/, '');
    // Split by commas and normalize
    const rawIngredients = inciBlock.split(',').map(s => s.trim()).filter(Boolean);

    // Fuzzy matching against INCI list
    const fuse = getFuseInstance();
    const bestMatches: string[] = [];
    for (const ing of rawIngredients) {
      const result = fuse.search(ing);
      if (result.length > 0) {
        bestMatches.push(result[0].item);
      }
    }
    // Return only unique hits
    return Array.from(new Set(bestMatches));
  }
} 