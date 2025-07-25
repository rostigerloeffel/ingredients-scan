import React from 'react';
import { IngredientListService } from '../../services/ingredientLists';
import './ListsButtons.css';

interface ListsButtonsProps {
  onShowLists: (tab?: 'positive' | 'negative') => void;
  disabled?: boolean;
}

const ListsButtons: React.FC<ListsButtonsProps> = React.memo(({ onShowLists, disabled }) => {
  const positiveCount = IngredientListService.getPositiveList().length;
  const negativeCount = IngredientListService.getNegativeList().length;

  return (
    <div className="lists-buttons">
      <button 
        onClick={() => onShowLists('positive')}
        className="lists-button positive"
        disabled={disabled}
      >
        ✅ Verträglich ({positiveCount})
      </button>
      <button 
        onClick={() => onShowLists('negative')}
        className="lists-button negative"
        disabled={disabled}
      >
        ❌ Unverträglich ({negativeCount})
      </button>
    </div>
  );
});

export default ListsButtons; 