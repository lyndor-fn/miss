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
          value={info.lastName}
          onChange={(e) => onChange({ ...info, lastName: e.target.value })}
          className="dotted-input flex-1 font-hand text-lg px-2"
          placeholder="..."
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-medical-blue font-bold text-xs uppercase whitespace-nowrap">Prénom :</label>
        <input
          type="text"
          value={info.firstName}
          onChange={(e) => onChange({ ...info, firstName: e.target.value })}
          className="dotted-input flex-1 font-hand text-lg px-2"
          placeholder="..."
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-medical-blue font-bold text-xs uppercase whitespace-nowrap">Date :</label>
        <input
          type="date"
          value={info.date}
          onChange={(e) => onChange({ ...info, date: e.target.value })}
          className="dotted-input flex-1 text-sm px-2"
        />
      </div>

      {showWeight && (
        <div className="flex items-center gap-2">
          <label className="text-medical-blue font-bold text-xs uppercase whitespace-nowrap">Poids :</label>
          <input
            type="text"
            value={info.weight}
            onChange={(e) => onChange({ ...info, weight: e.target.value })}
            className="dotted-input flex-1 font-hand text-lg px-2"
            placeholder="kg"
          />
        </div>
      )}
    </div>
  );
};
