import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

const API_BASE_WS = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000';

export default function LiveMap({ patient }) {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    // Reset location when patient changes
    setLocation(null);

    if (!patient?.token) return;

    const ws = new WebSocket(`${API_BASE_WS}/ws/tracking/${patient.token}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'LOCATION_UPDATE') {
        setLocation({ lat: data.lat, lng: data.lng });
      }
    };

    return () => ws.close();
  }, [patient?.token]);

  if (!patient) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-navy-900 text-gray-600 font-mono text-sm">
        No active tracking
      </div>
    );
  }

  // Placeholder for real map API - showing simulated tracking UI
  return (
    <div className="absolute inset-0 bg-[#0F1724]">
      {/* Simulation abstract map background */}
      <div className="absolute inset-0" style={{ 
        backgroundImage: 'radial-gradient(circle at center, #1E293B 2px, transparent 2px)', 
        backgroundSize: '30px 30px',
        opacity: 0.3 
      }}></div>
      
      {/* Route Line Mock */}
      <div className="absolute top-[40%] left-[30%] w-[40%] h-[20%] border-t-4 border-l-4 border-normal rounded-tl-full opacity-50 blur-[1px]"></div>

      {/* Hospital Marker */}
      <div className="absolute top-[35%] left-[65%] flex flex-col items-center">
        <div className="w-8 h-8 bg-black rounded-full border-2 border-red-500 flex items-center justify-center z-10 shadow-lg">
          <div className="w-4 h-1 bg-red-500 absolute"></div>
          <div className="w-1 h-4 bg-red-500 absolute"></div>
        </div>
        <div className="bg-navy-900 px-2 py-0.5 rounded text-[10px] font-mono mt-1 border border-navy-700 shadow shadow-black">Triage Bay</div>
      </div>

      {/* Ambulance Marker */}
      <div className="absolute top-[60%] left-[25%] flex flex-col items-center transition-all duration-1000 ease-linear">
        <div className="relative">
          <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center z-10 shadow-[0_0_15px_rgba(59,130,246,0.6)]">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          {/* Ripple effect */}
          <div className="absolute top-0 left-0 w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-75"></div>
        </div>
        
        {location ? (
          <div className="bg-blue-900/80 px-2 py-0.5 rounded text-[10px] font-mono mt-2 border border-blue-700 shadow-md backdrop-blur text-blue-100 whitespace-nowrap">
            LAT {location.lat.toFixed(4)} <br/> LNG {location.lng.toFixed(4)}
          </div>
        ) : (
          <div className="bg-navy-900/80 px-2 py-0.5 rounded text-[10px] font-mono mt-2 border border-navy-600 text-gray-400">
            CONNECTING GPS...
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 right-4 bg-navy-900/90 backdrop-blur border border-navy-700 p-3 rounded-lg flex justify-between items-center outline outline-1 outline-black shadow-2xl">
        <div className="font-mono text-xs text-gray-400 flex items-center gap-2">
          <MapPin size={14} className="text-normal" /> 
          ETA: {Math.floor(patient.eta_seconds / 60)} min
        </div>
        <div className="font-mono text-xs text-gray-500">
          Last Check IN: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
