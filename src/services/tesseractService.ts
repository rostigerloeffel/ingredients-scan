import { createWorker, PSM } from 'tesseract.js';

export class TesseractService {
  /**
   * Bildvorverarbeitung: Konvertiere zu Graustufen und erhöhe Kontrast
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
        
        // Graustufen und Kontrastverbesserung
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const avg = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
          // Stärkerer Kontrast (Faktor 1.8) und Helligkeit anpassen
          const contrast = 1.8;
          const brightness = 10;
          const contrasted = Math.max(0, Math.min(255, (avg - 128) * contrast + 128 + brightness));
          imageData.data[i] = imageData.data[i+1] = imageData.data[i+2] = contrasted;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = `data:image/jpeg;base64,${imageBase64}`;
    });
  }

  /**
   * OCR-Extraktion von Inhaltsstoffen (verbesserte Version)
   */
  static async extractIngredients(imageBase64: string): Promise<string[]> {
    const preprocessed = await this.preprocessImage(imageBase64);
    
    // Optimierte PSM-Modi für Inhaltsstofflisten
    const psmModes = [PSM.SINGLE_BLOCK, PSM.AUTO, PSM.SPARSE_TEXT];
    const languages = ['deu', 'eng', 'fra', 'spa', 'ita']; // Mehr Sprachen
    const ocrResults: string[] = [];
    
    // Führe OCR mit verschiedenen Konfigurationen durch
    for (const psm of psmModes) {
      for (const lang of languages) {
        try {
          const worker = await createWorker();
          await worker.load();
          await worker.reinitialize(lang);
          await worker.setParameters({
            tessedit_pageseg_mode: psm,
            tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,;:.()[]-+/%',
            preserve_interword_spaces: '1',
            textord_heavy_nr: '1'
          });
          
          const { data: { text } } = await worker.recognize(preprocessed);
          if (text && text.trim().length > 0) {
            ocrResults.push(text);
          }
          await worker.terminate();
        } catch (error) {
          console.warn(`OCR failed for PSM ${psm}, lang ${lang}:`, error);
        }
      }
    }
    
    // Merge aller OCR-Texte
    const fullText = ocrResults.join('\n');
    
    // Verbesserte Heuristik für Inhaltsstoff-Erkennung
    const lines = fullText.split(/\r?\n/).map(l => l.trim());
    let ingredientLines: string[] = [];
    
    // Suche nach Zeilen mit Inhaltsstoff-Schlüsselwörtern
    const ingredientKeywords = [
      'ingredients', 'ingrediencs', 'inc', 'bestandteile', 'bestandteil', 
      'inhaltstoffe', 'inhaltstoffe', 'zutaten', 'zutat', 'composants',
      'ingrédients', 'ingredientes', 'ingredienti', 'bestanddelen'
    ];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Prüfe auf Schlüsselwörter
      if (ingredientKeywords.some(keyword => lowerLine.includes(keyword))) {
        ingredientLines.push(line);
        continue;
      }
      
      // Prüfe auf typische Inhaltsstoff-Muster
      if (this.isIngredientLine(line)) {
        ingredientLines.push(line);
      }
    }
    
    // Wenn keine spezifischen Zeilen gefunden, verwende alle Zeilen mit Kommas
    if (ingredientLines.length === 0) {
      ingredientLines = lines.filter(line => 
        line.split(',').length > 2 || 
        line.includes(':') || 
        line.includes(';') ||
        this.isIngredientLine(line)
      );
    }
    
    // Extrahiere und normalisiere Inhaltsstoffe
    const allIngredients: string[] = [];
    
    for (const line of ingredientLines) {
      const ingredients = this.extractIngredientsFromLine(line);
      allIngredients.push(...ingredients);
    }
    
    // Entferne Duplikate und leere Einträge
    return Array.from(new Set(allIngredients)).filter(ing => ing.length > 2);
  }
  
  /**
   * Hilfsmethode: Prüft ob eine Zeile Inhaltsstoffe enthält
   */
  private static isIngredientLine(line: string): boolean {
    const lowerLine = line.toLowerCase();
    
    // Typische Inhaltsstoff-Muster
    const patterns = [
      /[a-z]+\s*,\s*[a-z]+/, // Komma-getrennte Wörter
      /[a-z]+\s*;\s*[a-z]+/, // Semikolon-getrennte Wörter
      /[a-z]+\s*\.\s*[a-z]+/, // Punkt-getrennte Wörter
      /\d+%/, // Prozentangaben
      /e\d{3,}/, // E-Nummern
      /[a-z]+ate$/, // -ate Endungen (typisch für Inhaltsstoffe)
      /[a-z]+ol$/, // -ol Endungen
      /[a-z]+ic$/, // -ic Endungen
    ];
    
    return patterns.some(pattern => pattern.test(lowerLine));
  }
  
  /**
   * Hilfsmethode: Extrahiert Inhaltsstoffe aus einer Zeile
   */
  private static extractIngredientsFromLine(line: string): string[] {
    let raw = line;
    
    // Entferne Schlüsselwörter am Anfang
    const ingredientKeywords = [
      'ingredients', 'ingrediencs', 'inc', 'bestandteile', 'bestandteil', 
      'inhaltstoffe', 'inhaltstoffe', 'zutaten', 'zutat', 'composants',
      'ingrédients', 'ingredientes', 'ingredienti', 'bestanddelen'
    ];
    
    for (const keyword of ingredientKeywords) {
      const regex = new RegExp(`.*${keyword}\\s*:?\\s*`, 'i');
      raw = raw.replace(regex, '');
    }
    
    // Entferne Doppelpunkte am Anfang
    raw = raw.replace(/^:\s*/, '');
    
    // Splitte an verschiedenen Trennzeichen
    const items = raw.split(/[;,.:\n]/).map(s => s.trim());
    
    // Normalisiere und filtere
    return items
      .map(s => s.replace(/[^a-z0-9 ]/gi, '').replace(/\s+/g, ' ').toLowerCase())
      .filter(s => s.length > 2 && !/\d{3,}/.test(s) && !/^[0-9\s]*$/.test(s));
  }
} 