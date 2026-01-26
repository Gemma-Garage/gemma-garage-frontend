/** Data augmentation component (placeholder) */

import React from 'react';
import '../style/modern.css';

function DataAugmentation({ selectedProjectData }) {
  const handleAugmentData = () => {
    alert(`Data augmentation started for: ${selectedProjectData?.displayName}`);
  };

  if (!selectedProjectData) {
    return (
      <div className="modern-card mt-3">
        <div className="modern-card-header">
          <h3 className="modern-card-title">Data Augmentation</h3>
        </div>
        <p>Select a project to see data augmentation options.</p>
      </div>
    );
  }

  return (
    <div className="modern-card mt-3">
      <div className="modern-card-header">
        <h3 className="modern-card-title">
          Data Augmentation for: {selectedProjectData.displayName}
        </h3>
        <p className="modern-card-subtitle">
          Configure and run data augmentation tasks for your dataset.
          (This is a placeholder component)
        </p>
      </div>
      {/* Add UI elements for data augmentation here */}
      <button className="modern-btn modern-btn-primary" onClick={handleAugmentData}>
        Start Augmentation
      </button>
    </div>
  );
}

export default DataAugmentation;
