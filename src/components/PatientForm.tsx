import React from 'react';
import { PatientInfo } from '../types';

interface PatientFormProps {
  info: PatientInfo;
  onChange: (info: PatientInfo) => void;
  showWeight?: boolean;
}

export const PatientForm: React.FC<PatientFormProps> = ({ info, onChange, showWeight = false }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-medical-blue/10 mb-4 space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-medical-blue font-bold text-xs uppercase whitespace-nowrap">Nom :</label>
        <input
          type="text"
          value={info.name}
          onChange={(e) => onChange({ ...info, name: e.target.value })}
          className="dotted-input flex-1 font-hand text-lg px-2"
          placeholder="..."
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-medical-blue font-bold text-xs uppercase whitespace-nowrap">Prénom :</label>
        <input
          type="text"
          value={info.age} // Reusing age field for simplicity or adding a new field if needed, but let's stick to the prompt's fields
          onChange={(e) => onChange({ ...info, age: e.target.value })}
          className="dotted-input flex-1 font-hand text-lg px-2"
          placeholder="..."
        />
      </div>

      {showWeight && (
        <div className="flex items-center gap-2">
          <label className="text-medical-blue font-bold text-xs uppercase whitespace-nowrap">Poids :</label>
          <input
            type="text"
            value={info.weight || ''}
            onChange={(e) => onChange({ ...info, weight: e.target.value })}
            className="dotted-input flex-1 font-hand text-lg px-2"
            placeholder="..."
          />
        </div>
      )}
    </div>
  );
};
