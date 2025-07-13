import React from 'react';
import { IngredientListService } from '../services/ingredientLists';
import './ListsButtons.css';

interface ListsButtonsProps {
  onShowLists: () => void;
}

const ListsButtons: React.FC<ListsButtonsProps> = ({ onShowLists }) => {
  const positiveCount = IngredientListService.getPositiveList().length;
  const negativeCount = IngredientListService.getNegativeList().length;

  return (
    <div className="lists-buttons">
      <button 
        onClick={onShowLists}
        className="lists-button positive"
      >
        ✅ Verträglich ({positiveCount})
      </button>
      <button 
        onClick={onShowLists}
        className="lists-button negative"
      >
        ❌ Unverträglich ({negativeCount})
      </button>
    </div>
  );
};

export default ListsButtons; 