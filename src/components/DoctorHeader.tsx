import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { DoctorInfo } from '../types';

interface DoctorHeaderProps {
  info: DoctorInfo;
  onUpdate: (info: DoctorInfo) => void;
}

export const DoctorHeader: React.FC<DoctorHeaderProps> = ({ info, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempInfo, setTempInfo] = useState(info);

  const handleSave = () => {
    onUpdate(tempInfo);
    setIsEditing(false);
  };

  return (
    <div className="relative bg-white p-4 rounded-xl shadow-sm border border-medical-blue/10 mb-4">
      {!isEditing ? (
        <div className="flex justify-between items-start">
          <div className="flex-1 border-r border-medical-blue/30 pr-4">
            <h1 className="text-xl font-bold text-medical-blue uppercase tracking-tight">
              {info.name}
            </h1>
            <p className="text-medical-green font-semibold text-sm">
              {info.specialty}
            </p>
            <p className="text-medical-blue font-bold text-sm mt-1">
              {info.phone}
            </p>
          </div>
          <div className="flex-1 pl-4 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2">
              <span className="text-medical-blue font-bold text-xs uppercase">Date :</span>
              <span className="text-medical-slate font-hand text-lg border-b border-dotted border-medical-slate/40 flex-1">
                {new Date().toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="absolute top-2 right-2 p-1 text-medical-slate/20 hover:text-medical-blue transition-colors"
          >
            <Edit2 size={14} />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-2">
            <input
              type="text"
              value={tempInfo.name}
              onChange={(e) => setTempInfo({ ...tempInfo, name: e.target.value })}
              className="w-full border-b border-medical-blue/30 py-1 focus:border-medical-blue outline-none transition-colors font-bold text-medical-blue"
              placeholder="Nom du Docteur"
            />
            <input
              type="text"
              value={tempInfo.specialty}
              onChange={(e) => setTempInfo({ ...tempInfo, specialty: e.target.value })}
              className="w-full border-b border-medical-blue/30 py-1 focus:border-medical-blue outline-none transition-colors text-medical-green font-semibold"
              placeholder="Spécialité"
            />
            <input
              type="text"
              value={tempInfo.phone}
              onChange={(e) => setTempInfo({ ...tempInfo, phone: e.target.value })}
              className="w-full border-b border-medical-blue/30 py-1 focus:border-medical-blue outline-none transition-colors text-medical-blue font-bold"
              placeholder="Téléphone"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setTempInfo(info);
                setIsEditing(false);
              }}
              className="p-1 text-red-400"
            >
              <X size={16} />
            </button>
            <button
              onClick={handleSave}
              className="p-1 text-medical-green"
            >
              <Check size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
