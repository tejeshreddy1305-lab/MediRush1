import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

const API_BASE_WS = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000';

export default function AlertFeed({ hospitalId, onSelectPatient }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!hospitalId) return;

    const ws = new WebSocket(`${API_BASE_WS}/ws/hospital/${hospitalId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'EMERGENCY_ALERT') {
        const newAlert = {
          id: data.token,
          ...data,
          receivedAt: new Date()
        };
        setAlerts(prev => [newAlert, ...prev]);
        
        // Auto-select if it's the first one
        onSelectPatient(prev => prev ? prev : newAlert);
      }
    };

    return () => ws.close();
  }, [hospitalId, onSelectPatient]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/50">
        <h2 className="font-sans font-bold text-sm tracking-widest text-slate-500">INCOMING ALERTS</h2>
        <span className="bg-emergency text-white text-xs font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {alerts.length === 0 ? (
          <div className="text-slate-400 font-mono text-xs text-center mt-10">No active alerts</div>
        ) : (
          alerts.map(alert => {
            const isCritical = alert.severity === 'CRITICAL';
            const isModerate = alert.severity === 'MODERATE';
            
            return (
              <div 
                key={alert.id}
                onClick={() => onSelectPatient(alert)}
                className={`
                  p-3 rounded-lg cursor-pointer border-l-4 transition-all duration-200
                  ${isCritical ? 'border-emergency bg-slate-50/50 animate-pulse-border' : 
                    isModerate ? 'border-moderate bg-slate-50/50' : 'border-normal bg-slate-50/50'}
                  hover:bg-slate-100 shadow-sm
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold font-sans text-sm text-slate-800">{alert.patient?.name || 'Unknown Protocol'}</div>
                  <div className="flex items-center text-slate-400 text-xs font-mono">
                    <Clock size={12} className="mr-1" /> Just now
                  </div>
                </div>
                <div className="font-mono text-xs text-emergency mb-1">{alert.condition}</div>
                <div className="flex justify-between items-end">
                  <span className={`text-[10px] font-bold px-1.5 rounded uppercase
                    ${isCritical ? 'bg-emergency/20 text-emergency' : 
                      isModerate ? 'bg-moderate/20 text-moderate' : 'bg-normal/20 text-normal'}`}
                  >
                    {alert.severity}
                  </span>
                  <span className="font-mono text-[10px] text-gray-500">ETA: {Math.floor(alert.eta_seconds / 60)}m</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
