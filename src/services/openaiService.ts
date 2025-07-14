import OpenAI from 'openai';
import { createWorker, PSM } from 'tesseract.js';

export interface IngredientAnalysis {
  ingredients: string[];
  allergens: string[];
  nutrition: string;
  summary: string;
}

export class OpenAIService {
  private static apiKey: string | null = null;
  private static readonly STORAGE_KEY = 'ingredient_scanner_api_key';

  /**
   * Lädt den API-Schlüssel aus dem localStorage
   */
  static loadApiKeyFromStorage(): string | null {
    if (this.apiKey) return this.apiKey;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.apiKey = stored;
        return stored;
      }
    } catch (error) {
      console.warn('Fehler beim Laden des API-Schlüssels aus localStorage:', error);
    }
    return null;
  }

  /**
   * Setzt den API-Schlüssel und speichert ihn im localStorage
   */
  static setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    try {
      localStorage.setItem(this.STORAGE_KEY, apiKey);
    } catch (error) {
      console.warn('Fehler beim Speichern des API-Schlüssels in localStorage:', error);
    }
  }

  /**
   * Löscht den API-Schlüssel aus dem localStorage
   */
  static clearApiKey() {
    this.apiKey = null;
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Fehler beim Löschen des API-Schlüssels aus localStorage:', error);
    }
  }

  /**
   * Prüft, ob ein API-Schlüssel gesetzt ist
   */
  static hasApiKey(): boolean {
    if (this.apiKey) return true;
    return this.loadApiKeyFromStorage() !== null;
  }

  /**
   * Gibt den aktuellen API-Schlüssel zurück
   */
  static getApiKey(): string | null {
    return this.apiKey || this.loadApiKeyFromStorage();
  }

  /**
   * Gibt den aktuellen API-Schlüssel zurück (maskiert)
   */
  static getMaskedApiKey(): string {
    const key = this.apiKey || this.loadApiKeyFromStorage();
    if (!key) return '';
    
    // Zeige nur die ersten 7 und letzten 4 Zeichen
    if (key.length <= 11) return '***' + key.slice(-4);
    return key.slice(0, 7) + '***' + key.slice(-4);
  }

  /**
   * Löscht den API-Schlüssel
   */
  static deleteApiKey() {
    this.clearApiKey();
  }

  /**
   * Analysiert ein Bild von Inhaltsstoffen
   */
  static async analyzeIngredients(imageBase64: string): Promise<IngredientAnalysis> {
    // API Key Validierung
    if (!this.apiKey && !this.loadApiKeyFromStorage()) {
      throw new Error('OpenAI API-Schlüssel fehlt. Bitte geben Sie Ihren API-Schlüssel ein.');
    }

    // Bilddaten Validierung
    if (!imageBase64 || imageBase64.length < 100) {
      throw new Error('Ungültiges Bild. Bitte stellen Sie sicher, dass das Bild klar und gut lesbar ist.');
    }

    // OCR-Analyse parallel starten
    const ocrPromise = this.ocrIngredients(imageBase64);

    // OpenAI-Analyse starten
    const openAIPromise = (async () => {
      // OpenAI Client mit aktuellem API-Schlüssel initialisieren
      const openai = new OpenAI({
        apiKey: this.apiKey || this.loadApiKeyFromStorage()!,
        dangerouslyAllowBrowser: true // Für Client-seitige Nutzung
      });

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Du bist ein Experte für die Analyse von Inhaltsstoffen in Lebensmitteln und kosmetischen Produkten (z.B. Shampoos, Conditioner, Duschgel, Cremes, Seifen usw.). Deine Aufgabe ist es, ausschließlich die Inhaltsstoffe auf dem Bild zu erkennen und zu extrahieren.

            Antworte im folgenden JSON-Format:
            {
              "ingredients": ["inhaltsstoff 1", "inhaltsstoff 2", ...],
              "allergens": ["allergen 1", "allergen 2", ...],
              "summary": "kurze zusammenfassung der wichtigsten punkte auf englisch"
            }

            Wichtige Regeln:
            - Erkenne und extrahiere alle Inhaltsstoffe so präzise wie möglich
            - Normalisiere alle Bezeichnungen: alles klein geschrieben, keine Umlaute, keine Sonderzeichen, keine Steuerzeichen, keine Kommas, keine doppelten Leerzeichen
            - Bevorzuge chemische Bezeichnungen, falls vorhanden
            - Übersetze alle natürlichsprachlichen Begriffe, die nicht englisch sind, ins Englische
            - Die JSON-Liste ingredients darf nur einzelne, saubere Begriffe enthalten (keine Sätze, keine Kommas, keine Steuerzeichen)
            - Die JSON-Liste allergens enthält nur erkannte Allergene (z.B. gluten, lactose, nuts, soy, egg, etc.), ebenfalls normalisiert und auf englisch
            - Die summary ist eine sehr kurze Zusammenfassung auf englisch
            - Gib ausschließlich das JSON-Objekt als Antwort zurück, ohne weitere Erklärungen oder Text`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analysiere diese Inhaltsstoffe und gib mir eine strukturierte Analyse zurück."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Keine Antwort von der KI erhalten. Bitte versuchen Sie es erneut.');
        }

        // Versuche JSON zu parsen
        try {
          const analysis = JSON.parse(content);
          
          // Validierung der Analyse-Struktur
          if (!analysis.ingredients || !Array.isArray(analysis.ingredients)) {
            throw new Error('Ungültige Analyse-Struktur: Inhaltsstoffe fehlen');
          }
          
          return analysis as IngredientAnalysis;
        } catch (parseError) {
          console.warn('JSON-Parsing fehlgeschlagen, verwende Fallback-Parser:', parseError);
          // Fallback: Strukturierte Antwort parsen
          return this.parseStructuredResponse(content);
        }

      } catch (error: any) {
        console.error('Fehler bei der OpenAI-Analyse:', error);
        
        // Spezifische Fehlermeldungen basierend auf dem Fehlertyp
        if (error?.status === 401) {
          throw new Error('Ungültiger API-Schlüssel. Bitte überprüfen Sie Ihren OpenAI API-Schlüssel.');
        } else if (error?.status === 429) {
          throw new Error('API-Limit erreicht. Bitte warten Sie einen Moment und versuchen Sie es erneut.');
        } else if (error?.status === 400) {
          throw new Error('Ungültige Anfrage. Das Bild könnte zu groß oder in einem nicht unterstützten Format sein.');
        } else if (error?.status === 500 || error?.status === 502 || error?.status === 503) {
          throw new Error('OpenAI-Server temporär nicht verfügbar. Bitte versuchen Sie es in einigen Minuten erneut.');
        } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
          throw new Error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
        } else if (error?.message?.includes('timeout')) {
          throw new Error('Zeitüberschreitung bei der Analyse. Bitte versuchen Sie es erneut.');
        } else {
          throw new Error(`Analyse fehlgeschlagen: ${error?.message || 'Unbekannter Fehler'}. Bitte versuchen Sie es erneut.`);
        }
      }
    })();

    // Beide Ergebnisse abwarten
    const [ocrResult, openAIResult] = await Promise.allSettled([ocrPromise, openAIPromise]);

    // Ergebnis-Verrechnung
    let aiResult: IngredientAnalysis | null = null;
    if (openAIResult.status === 'fulfilled') {
      aiResult = openAIResult.value;
    }
    let ocrIngredients: string[] = [];
    if (ocrResult.status === 'fulfilled') {
      ocrIngredients = ocrResult.value;
    }

    // Wenn AI keine oder zu wenige Inhaltsstoffe liefert, ergänze mit OCR
    if (!aiResult || !aiResult.ingredients || aiResult.ingredients.length < 2) {
      return {
        ingredients: ocrIngredients,
        allergens: [],
        nutrition: '',
        summary: 'OCR fallback: Ingredients extracted from image text.'
      };
    }
    // Kombiniere AI- und OCR-Inhaltsstoffe, entferne Duplikate
    const combinedIngredients = Array.from(new Set([
      ...aiResult.ingredients,
      ...ocrIngredients
    ]));
    return {
      ...aiResult,
      ingredients: combinedIngredients
    };
  }

  /**
   * Fallback-Parser für strukturierte Antworten
   */
  private static parseStructuredResponse(content: string): IngredientAnalysis {
    const ingredients: string[] = [];
    const allergens: string[] = [];
    let nutrition = '';
    let summary = '';

    // Einfache Text-Parsing-Logik
    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.toLowerCase().includes('zutat')) {
        currentSection = 'ingredients';
      } else if (trimmedLine.toLowerCase().includes('allergen')) {
        currentSection = 'allergens';
      } else if (trimmedLine.toLowerCase().includes('nährwert')) {
        currentSection = 'nutrition';
      } else if (trimmedLine.toLowerCase().includes('zusammenfassung')) {
        currentSection = 'summary';
      } else if (trimmedLine && currentSection) {
        if (currentSection === 'ingredients') {
          ingredients.push(trimmedLine);
        } else if (currentSection === 'allergens') {
          allergens.push(trimmedLine);
        } else if (currentSection === 'nutrition') {
          nutrition = trimmedLine;
        } else if (currentSection === 'summary') {
          summary = trimmedLine;
        }
      }
    }

    // Validierung der geparsten Daten
    if (ingredients.length === 0) {
      throw new Error('Keine Inhaltsstoffe im Bild erkannt. Bitte stellen Sie sicher, dass die Inhaltsstoffe klar sichtbar sind.');
    }

    return {
      ingredients,
      allergens,
      nutrition,
      summary
    };
  }

  // Bildvorverarbeitung: Konvertiere zu Graustufen und erhöhe Kontrast
  private static preprocessImage(imageBase64: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        // Graustufen
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const avg = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
          // Kontrast erhöhen (Faktor 1.4)
          const contrast = 1.4;
          const contrasted = Math.max(0, Math.min(255, (avg - 128) * contrast + 128));
          imageData.data[i] = imageData.data[i+1] = imageData.data[i+2] = contrasted;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = `data:image/jpeg;base64,${imageBase64}`;
    });
  }

  // OCR-Extraktion von Inhaltsstoffen (mit mehreren PSM-Modi und Sprachen)
  private static async ocrIngredients(imageBase64: string): Promise<string[]> {
    const preprocessed = await this.preprocessImage(imageBase64);
    const psmModes = [PSM.SINGLE_BLOCK, PSM.AUTO, PSM.SPARSE_TEXT, PSM.SPARSE_TEXT_OSD];
    const ocrResults: string[] = [];
    for (const psm of psmModes) {
      const worker = await createWorker();
      await worker.load();
      await worker.reinitialize('deu+eng');
      await worker.setParameters({
        tessedit_pageseg_mode: psm,
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,;:. '
      });
      const { data: { text } } = await worker.recognize(preprocessed);
      ocrResults.push(text);
      await worker.terminate();
    }
    // Merge aller OCR-Texte
    const fullText = ocrResults.join('\n');
    // Heuristik: Zeilen mit "ingredients", "inc", "bestandteile" (auch mit Tippfehlern)
    const lines = fullText.split(/\r?\n/).map(l => l.trim().toLowerCase());
    let ingredientLine = lines.find(l => /(ingredients?|ingrediencs?|inc|bestandteile|bestandteil|inhaltstoffe|inhaltstoffe)/.test(l));
    if (!ingredientLine) {
      // Fallback: Zeile mit vielen Kommas, Doppelpunkten oder Semikolons
      ingredientLine = lines.find(l => l.split(',').length > 2 || l.includes(':') || l.includes(';'));
    }
    if (!ingredientLine) return [];
    // Extrahiere nach Doppelpunkt oder nach Schlüsselwort
    let raw = ingredientLine;
    if (/:/.test(raw)) raw = raw.split(':').slice(1).join(':');
    if (/(ingredients?|ingrediencs?|inc|bestandteile|bestandteil|inhaltstoffe|inhaltstoffe)/.test(raw)) raw = raw.replace(/.*(ingredients?|ingrediencs?|inc|bestandteile|bestandteil|inhaltstoffe|inhaltstoffe)/, '');
    // Splitte an Kommas, Semikolons, Punkten, Doppelpunkten, Zeilenumbrüchen
    let items = raw.split(/[;,.:\n]/).map(s => s.trim());
    // Filtere leere und zu kurze Einträge, normalisiere (nur Kleinbuchstaben, keine Sonderzeichen, keine Steuerzeichen, keine Kommas)
    items = items
      .map(s => s.replace(/[^a-z0-9 ]/gi, '').replace(/\s+/g, ' ').toLowerCase())
      .filter(s => s.length > 2 && !/\d{3,}/.test(s));
    // Entferne Duplikate
    return Array.from(new Set(items));
  }
} 