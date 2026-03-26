import React from 'react';
import { DoctorInfo } from '../types';

interface DoctorHeaderProps {
  info: DoctorInfo;
  date: string;
}

const formatDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
};

export const DoctorHeader: React.FC<DoctorHeaderProps> = ({ info, date }) => {
  return (
    <div className="relative bg-white p-4 rounded-xl shadow-sm border border-medical-blue/10 mb-4">
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
              {formatDate(date)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
