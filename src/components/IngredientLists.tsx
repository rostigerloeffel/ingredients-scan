import { useState, useEffect } from 'react';
import { IngredientListService } from '../services/ingredientLists';
import type { NegativeIngredient } from '../services/ingredientLists';
import './IngredientLists.css';
import Fuse from 'fuse.js';
import inciNames from '../inci_names.normalized.json';

interface IngredientListsProps {
  isVisible: boolean;
  onClose: () => void;
  initialTab?: 'positive' | 'negative';
}

export default function IngredientLists({ isVisible, onClose, initialTab = 'positive' }: IngredientListsProps) {
  const [activeTab, setActiveTab] = useState<'positive' | 'negative'>(initialTab);
  const [positiveList, setPositiveList] = useState<string[]>([]);
  const [negativeList, setNegativeList] = useState<NegativeIngredient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState<string[]>([]);
  const [autocompleteActive, setAutocompleteActive] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const fuse = new Fuse(inciNames, { threshold: 0.3 });

  useEffect(() => {
    if (isVisible) {
      loadLists();
      setActiveTab(initialTab);
    }
  }, [isVisible, initialTab]);

  const loadLists = () => {
    setPositiveList(IngredientListService.getPositiveList());
    setNegativeList(IngredientListService.getNegativeList());
    setSearchTerm('');
  };

  const handleDeleteSingle = (ingredient: string) => {
    if (activeTab === 'positive') {
      IngredientListService.removeFromPositiveList([ingredient]);
      setPositiveList(IngredientListService.getPositiveList());
    } else {
      IngredientListService.removeFromNegativeList([ingredient]);
      setNegativeList(IngredientListService.getNegativeList());
    }
  };

  const handleClearAll = () => {
    const listName = activeTab === 'positive' ? 'Verträglichkeitsliste' : 'Unverträglichkeitsliste';
    if (window.confirm(`Möchten Sie wirklich alle Einträge aus der ${listName} löschen?`)) {
      if (activeTab === 'positive') {
        IngredientListService.savePositiveList([]);
        setPositiveList([]);
      } else {
        IngredientListService.saveNegativeList([]);
        setNegativeList([]);
      }
    }
  };

  // Sortiere die Negativliste nach Häufigkeit absteigend
  const sortedNegativeList = [...negativeList].sort((a, b) => b.count - a.count);

  const filteredIngredients = (activeTab === 'positive' ? positiveList : sortedNegativeList)
    .filter(ingredient => 
      typeof ingredient === 'string'
        ? ingredient.toLowerCase().includes(searchTerm.toLowerCase())
        : ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getTabIcon = (tab: 'positive' | 'negative') => {
    return tab === 'positive' ? '✅' : '❌';
  };

  const getTabTitle = (tab: 'positive' | 'negative') => {
    return tab === 'positive' ? 'Verträglich' : 'Unverträglich';
  };

  // Autocomplete-Logik
  useEffect(() => {
    if (autocompleteInput.trim().length === 0) {
      setAutocompleteResults([]);
      setAutocompleteIndex(-1);
      return;
    }
    // Bereits vorhandene Namen ausfiltern
    const existing = negativeList.map(e => e.name.toLowerCase());
    const results = fuse.search(autocompleteInput).map(r => r.item).filter(name => !existing.includes(name.toLowerCase()));
    setAutocompleteResults(results.slice(0, 8));
    setAutocompleteIndex(-1);
  }, [autocompleteInput, negativeList]);

  const handleAutocompleteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutocompleteInput(e.target.value);
    setAutocompleteActive(true);
  };

  const handleAutocompleteSelect = (name: string) => {
    if (!name) return;
    IngredientListService.addToNegativeList([name]);
    setNegativeList(IngredientListService.getNegativeList());
    setAutocompleteInput('');
    setAutocompleteResults([]);
    setAutocompleteActive(false);
  };

  const handleAutocompleteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!autocompleteActive || autocompleteResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAutocompleteIndex(i => Math.min(i + 1, autocompleteResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAutocompleteIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteIndex >= 0 && autocompleteIndex < autocompleteResults.length) {
        handleAutocompleteSelect(autocompleteResults[autocompleteIndex]);
      } else if (autocompleteInput.trim().length > 0) {
        handleAutocompleteSelect(autocompleteInput.trim());
      }
    } else if (e.key === 'Escape') {
      setAutocompleteActive(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="ingredient-lists-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="ingredient-lists-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lists-header">
          <h2>📋 Meine Verträglichkeitslisten</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="lists-tabs">
          <button
            className={`tab-button ${activeTab === 'positive' ? 'active' : ''}`}
            onClick={() => setActiveTab('positive')}
          >
            <span className="tab-icon">{getTabIcon('positive')}</span>
            <span className="tab-text">{getTabTitle('positive')}</span>
            <span className="tab-count">({positiveList.length})</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'negative' ? 'active' : ''}`}
            onClick={() => setActiveTab('negative')}
          >
            <span className="tab-icon">{getTabIcon('negative')}</span>
            <span className="tab-text">{getTabTitle('negative')}</span>
            <span className="tab-count">({negativeList.length})</span>
          </button>
        </div>

        <div className="lists-content">
          {/* Tab-Description entfernt */}

          {/* Nur im Unverträglich-Tab: Autocomplete-Eingabe */}
          {activeTab === 'negative' && (
            <div className="autocomplete-section">
              <label htmlFor="add-negative-autocomplete" className="visually-hidden">Unverträglichen Inhaltsstoff hinzufügen</label>
              <input
                id="add-negative-autocomplete"
                type="text"
                className="autocomplete-input"
                placeholder="Unverträglichen Inhaltsstoff hinzufügen..."
                value={autocompleteInput}
                onChange={handleAutocompleteChange}
                onKeyDown={handleAutocompleteKeyDown}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="autocomplete-listbox"
                aria-activedescendant={autocompleteIndex >= 0 ? `autocomplete-item-${autocompleteIndex}` : undefined}
                aria-expanded={autocompleteActive && autocompleteResults.length > 0}
                aria-haspopup="listbox"
                onFocus={() => setAutocompleteActive(true)}
                onBlur={() => setTimeout(() => setAutocompleteActive(false), 100)}
              />
              {autocompleteActive && autocompleteResults.length > 0 && (
                <ul
                  id="autocomplete-listbox"
                  role="listbox"
                  className="autocomplete-listbox"
                  style={{ maxHeight: 180, overflowY: 'auto', margin: 0, padding: 0, border: '1px solid #ccc', background: '#fff', position: 'absolute', zIndex: 10, width: '100%' }}
                >
                  {autocompleteResults.map((name, idx) => (
                    <li
                      key={name}
                      id={`autocomplete-item-${idx}`}
                      role="option"
                      aria-selected={autocompleteIndex === idx}
                      className={autocompleteIndex === idx ? 'autocomplete-item active' : 'autocomplete-item'}
                      style={{ padding: '4px 8px', cursor: 'pointer', background: autocompleteIndex === idx ? '#eee' : '#fff' }}
                      onMouseDown={() => handleAutocompleteSelect(name)}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="add-negative-button"
                onClick={() => handleAutocompleteSelect(autocompleteInput.trim())}
                disabled={autocompleteInput.trim().length === 0}
              >
                Hinzufügen
              </button>
            </div>
          )}

          <div className="search-section">
            <input
              type="text"
              placeholder="Inhaltsstoffe durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="ingredients-section">
            {filteredIngredients.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📝</span>
                <p>Keine {activeTab === 'positive' ? 'Verträglichkeits' : 'Unverträglichkeits'}-Einträge vorhanden</p>
                <p className="empty-hint">
                  Scannen Sie Produkte und bewerten Sie Ihre Verträglichkeit, um Listen zu erstellen.
                </p>
              </div>
            ) : (
              <>
                <div className="ingredients-list">
                  {filteredIngredients.map((ingredient) => {
                    // If ingredient is an object (Negativliste), show count
                    const name = typeof ingredient === 'string' ? ingredient : ingredient.name;
                    const count = typeof ingredient === 'object' && ingredient.count ? ingredient.count : null;
                    return (
                      <div
                        key={name}
                        className="ingredient-chip"
                        onClick={() => handleDeleteSingle(name)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Entferne ${name}`}
                      >
                        {name}
                        {count !== null && <span className="ingredient-count">{count}</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="list-actions">
                  <button onClick={handleClearAll} className="clear-all-button">
                    🗑️ Alle löschen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 