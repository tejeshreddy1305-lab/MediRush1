import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BedDouble, Stethoscope, DoorOpen, Users } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function ResourceBar({ hospitalId }) {
  const [hospital, setHospital] = useState(null);

  const fetchHospital = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/hospitals/${hospitalId}`);
      setHospital(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (hospitalId) {
      fetchHospital();
      // Polling every 10s for bed updates in Phase 2
      const interval = setInterval(fetchHospital, 10000);
      return () => clearInterval(interval);
    }
  }, [hospitalId]);

  if (!hospital) return (
    <footer className="h-16 bg-navy-800 border-t border-navy-700 flex justify-center items-center shrink-0">
      <div className="w-4 h-4 rounded-full border-2 border-gray-500 border-t-white animate-spin"></div>
    </footer>
  );

  const bedOccupancy = hospital.beds_occupied / hospital.beds_total;
  const icuOccupancy = 0.65; // Mock ICU for dashboard
  const isIcuWarning = icuOccupancy > 0.7;

  return (
    <footer className="h-16 bg-navy-800 border-t border-navy-700 shrink-0 flex items-center px-6 gap-8">
      
      {/* Beds Section */}
      <div className="flex items-center gap-3 w-1/4">
        <BedDouble className="text-gray-400" />
        <div className="flex-1">
          <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
            <span>GENERAL BEDS</span>
            <span>{hospital.beds_occupied} / {hospital.beds_total}</span>
          </div>
          <div className="h-1.5 w-full bg-navy-900 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500
                ${bedOccupancy > 0.8 ? 'bg-emergency' : bedOccupancy > 0.5 ? 'bg-moderate' : 'bg-normal'}`}
              style={{ width: `${Math.min(100, bedOccupancy * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* ICU Section */}
      <div className="flex items-center gap-3 w-1/4">
        <Stethoscope className="text-gray-400" />
        <div className="flex-1">
          <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
            <span>ICU STATUS</span>
            <span>{Math.floor(hospital.icu_beds * icuOccupancy)} / {hospital.icu_beds}</span>
          </div>
          <div className="h-1.5 w-full bg-navy-900 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isIcuWarning ? 'bg-emergency' : 'bg-moderate'}`}
              style={{ width: `${icuOccupancy * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Emergency Bay */}
      <div className="flex items-center gap-2 border-l border-navy-700 pl-8">
        <DoorOpen size={16} className={hospital.emergency_bay ? "text-normal" : "text-emergency"} />
        <div>
          <div className="text-[10px] font-mono text-gray-500">TRAUMA BAY</div>
          <div className={`text-sm font-bold font-sans ${hospital.emergency_bay ? 'text-normal' : 'text-emergency'}`}>
            {hospital.emergency_bay ? 'OPEN / RECEIVING' : 'AT CAPACITY'}
          </div>
        </div>
      </div>

      {/* Staff Check */}
      <div className="flex items-center gap-2 border-l border-navy-700 pl-8 ml-auto">
        <Users size={16} className="text-gray-400" />
        <div>
          <div className="text-[10px] font-mono text-gray-500">STAFF ON CALL</div>
          <div className="text-sm font-bold font-sans text-gray-300">12 DR / 34 RN</div>
        </div>
      </div>

      {isIcuWarning && (
        <div className="absolute bottom-16 right-4 mb-2 bg-moderate/10 border border-moderate text-moderate text-xs px-3 py-2 rounded-lg font-mono animate-bounce shadow-lg">
          WARNING: ICU approaching capacity (70%+)
        </div>
      )}

    </footer>
  );
}
