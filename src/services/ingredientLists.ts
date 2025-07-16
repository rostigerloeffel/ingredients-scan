export interface IngredientList {
  ingredients: string[];
  lastUpdated: Date;
}

export interface NegativeIngredient {
  name: string;
  count: number;
}

export class IngredientListService {
  private static readonly POSITIVE_LIST_KEY = 'ingredient_scanner_positive_list';
  private static readonly NEGATIVE_LIST_KEY = 'ingredient_scanner_negative_list';

  /**
   * Lädt die Positivliste aus dem localStorage
   */
  static getPositiveList(): string[] {
    try {
      const stored = localStorage.getItem(this.POSITIVE_LIST_KEY);
      if (stored) {
        const data: IngredientList = JSON.parse(stored);
        return data.ingredients || [];
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Positivliste:', error);
    }
    return [];
  }

  /**
   * Lädt die Negativliste aus dem localStorage (jetzt als Array von Objekten)
   */
  static getNegativeList(): NegativeIngredient[] {
    try {
      const stored = localStorage.getItem(this.NEGATIVE_LIST_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          // Migration: Altes Format (reine Strings)
          return data.map((name: string) => ({ name, count: 1 }));
        } else if (Array.isArray(data.ingredients)) {
          // Migration: IngredientList-Format
          return data.ingredients.map((name: string) => ({ name, count: 1 }));
        } else if (Array.isArray(data.negativeIngredients)) {
          // Neues Format
          return data.negativeIngredients;
        }
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Negativliste:', error);
    }
    return [];
  }

  /**
   * Speichert die Positivliste im localStorage
   */
  static savePositiveList(ingredients: string[]): void {
    try {
      const filtered = ingredients.map(i => i.trim()).filter(i => i.length > 0);
      const data: IngredientList = {
        ingredients: filtered,
        lastUpdated: new Date()
      };
      localStorage.setItem(this.POSITIVE_LIST_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Fehler beim Speichern der Positivliste:', error);
    }
  }

  /**
   * Speichert die Negativliste im localStorage (als Array von Objekten)
   */
  static saveNegativeList(ingredients: NegativeIngredient[]): void {
    try {
      const filtered = ingredients.filter(i => i.name && i.name.trim().length > 0 && i.count > 0);
      const data = {
        negativeIngredients: filtered,
        lastUpdated: new Date()
      };
      localStorage.setItem(this.NEGATIVE_LIST_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Fehler beim Speichern der Negativliste:', error);
    }
  }

  /**
   * Fügt Inhaltsstoffe zur Positivliste hinzu und entfernt sie von der Negativliste
   */
  static addToPositiveList(ingredients: string[]): void {
    const positiveList = this.getPositiveList();
    const negativeList = this.getNegativeList();
    
    // Füge neue Inhaltsstoffe zur Positivliste hinzu
    const updatedPositiveList = [...new Set([...positiveList, ...ingredients])];
    
    // Entferne diese Inhaltsstoffe von der Negativliste
    const updatedNegativeList = negativeList.filter(
      ingredient => !ingredients.includes(ingredient.name)
    );
    
    this.savePositiveList(updatedPositiveList);
    this.saveNegativeList(updatedNegativeList);
  }

  /**
   * Fügt Inhaltsstoffe zur Negativliste hinzu (Zähler erhöhen)
   */
  static addToNegativeList(ingredients: string[]): void {
    const positiveList = this.getPositiveList();
    let negativeList = this.getNegativeList();
    for (const ing of ingredients) {
      if (positiveList.includes(ing)) continue;
      const idx = negativeList.findIndex(e => e.name === ing);
      if (idx >= 0) {
        negativeList[idx].count += 1;
      } else {
        negativeList.push({ name: ing, count: 1 });
      }
    }
    this.saveNegativeList(negativeList);
  }

  /**
   * Entfernt Inhaltsstoffe aus der Positivliste
   */
  static removeFromPositiveList(ingredients: string[]): void {
    const positiveList = this.getPositiveList();
    const updatedPositiveList = positiveList.filter(
      ingredient => !ingredients.includes(ingredient)
    );
    this.savePositiveList(updatedPositiveList);
  }

  /**
   * Entfernt Inhaltsstoffe aus der Negativliste (Zähler dekrementieren oder löschen)
   */
  static removeFromNegativeList(ingredients: string[]): void {
    let negativeList = this.getNegativeList();
    negativeList = negativeList.map(e =>
      ingredients.includes(e.name) ? { ...e, count: e.count - 1 } : e
    ).filter(e => e.count > 0);
    this.saveNegativeList(negativeList);
  }

  /**
   * Löscht alle Listen
   */
  static clearAllLists(): void {
    try {
      localStorage.removeItem(this.POSITIVE_LIST_KEY);
      localStorage.removeItem(this.NEGATIVE_LIST_KEY);
    } catch (error) {
      console.warn('Fehler beim Löschen der Listen:', error);
    }
  }

  /**
   * Prüft, ob ein Inhaltsstoff in der Positivliste steht
   */
  static isInPositiveList(ingredient: string): boolean {
    const positiveList = this.getPositiveList();
    return positiveList.includes(ingredient);
  }

  /**
   * Prüft, ob ein Inhaltsstoff in der Negativliste steht
   */
  static isInNegativeList(ingredient: string): boolean {
    const negativeList = this.getNegativeList();
    return negativeList.some(e => e.name === ingredient);
  }

  /**
   * Gibt die Anzahl der Markierungen für einen Inhaltsstoff zurück
   */
  static getNegativeCount(ingredient: string): number {
    const negativeList = this.getNegativeList();
    const entry = negativeList.find(e => e.name === ingredient);
    return entry ? entry.count : 0;
  }

  /**
   * Normalisiert Inhaltsstoff-Namen für besseren Vergleich
   */
  static normalizeIngredient(ingredient: string): string {
    return ingredient.toLowerCase().trim();
  }

  /**
   * Normalisiert eine Liste von Inhaltsstoffen
   */
  static normalizeIngredients(ingredients: string[]): string[] {
    return ingredients.map(this.normalizeIngredient);
  }
} 