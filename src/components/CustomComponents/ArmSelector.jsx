import React from 'react';

const ArmSelector = ({ 
  classesForSubject, 
  selectedArms, 
  onArmToggle, 
  filterClassId 
}) => {
  const filteredArms = classesForSubject.filter(c => c.class_id === filterClassId);

  return (
    <div className="mt-6">
      <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
        Apply To Additional Arms
      </label>

      <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
        {filteredArms.map((arm) => (
          <label
            key={arm.arm_id}
            className="flex items-center gap-2 text-sm mb-1 cursor-pointer"
          >
            <input
              type="checkbox"
              className="accent-green-600"
              checked={selectedArms.includes(arm.arm_id)}
              onChange={(e) => onArmToggle(arm.arm_id, e.target.checked)}
            />
            {arm.arm_name}
          </label>
        ))}
      </div>
    </div>
  );
};

export default ArmSelector;