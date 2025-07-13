import OpenAI from 'openai';

// OpenAI Client initialisieren
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // Für Client-seitige Nutzung
});

export interface IngredientAnalysis {
  ingredients: string[];
  allergens: string[];
  nutrition: string;
  summary: string;
}

export class OpenAIService {
  
  /**
   * Analysiert ein Bild von einer Zutatenliste
   */
  static async analyzeIngredients(imageBase64: string): Promise<IngredientAnalysis> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Du bist ein Experte für Lebensmittelanalyse. Analysiere die Zutatenliste im Bild und gib eine strukturierte Antwort zurück.
            
            Antworte im folgenden JSON-Format:
            {
              "ingredients": ["Zutat 1", "Zutat 2", ...],
              "allergens": ["Allergen 1", "Allergen 2", ...],
              "nutrition": "Kurze Nährwertinformationen",
              "summary": "Zusammenfassung der wichtigsten Punkte"
            }
            
            Wichtige Regeln:
            - Erkenne alle Zutaten genau
            - Identifiziere Allergene (Gluten, Laktose, Nüsse, etc.)
            - Gib praktische Nährwertinformationen
            - Fasse die wichtigsten Punkte zusammen`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analysiere diese Zutatenliste und gib mir eine strukturierte Analyse zurück."
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
        throw new Error('Keine Antwort von OpenAI erhalten');
      }

      // Versuche JSON zu parsen
      try {
        const analysis = JSON.parse(content);
        return analysis as IngredientAnalysis;
      } catch (parseError) {
        // Fallback: Strukturierte Antwort parsen
        return this.parseStructuredResponse(content);
      }

    } catch (error) {
      console.error('Fehler bei der OpenAI-Analyse:', error);
      throw new Error('Fehler bei der Zutatenanalyse. Bitte versuchen Sie es erneut.');
    }
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

    return {
      ingredients,
      allergens,
      nutrition,
      summary
    };
  }
} 