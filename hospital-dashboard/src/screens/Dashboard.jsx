import React, { useState } from 'react';
import AlertFeed from '../components/AlertFeed';
import PatientCard from '../components/PatientCard';
import LiveMap from '../components/LiveMap';
import ResourceBar from '../components/ResourceBar';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const hospitalId = localStorage.getItem('hospital_id');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('hospital_id');
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col bg-navy-900 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 bg-navy-800 border-b border-navy-700 flex justify-between items-center px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emergency animate-pulse"></div>
          <h1 className="font-sans font-bold text-lg tracking-wide uppercase text-slate-800">MediRush <span className="text-slate-400 font-mono text-xs ml-2">ID: HOS-{hospitalId}</span></h1>
        </div>
        <button onClick={handleLogout} className="text-slate-500 hover:text-emergency flex items-center gap-2 text-sm font-mono">
          <LogOut size={16} /> Disconnect
        </button>
      </header>

      {/* Main 3-Column Grid */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column - 20% */}
        <section className="w-1/5 min-w-[280px] border-r border-navy-700 bg-navy-800 flex flex-col">
          <AlertFeed hospitalId={hospitalId} onSelectPatient={setSelectedPatient} />
        </section>
        
        {/* Center Column - 50% */}
        <section className="w-2/5 flex-grow border-r border-navy-700 bg-navy-900 flex flex-col p-4">
          {selectedPatient ? (
            <PatientCard patient={selectedPatient} hospitalId={hospitalId} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-mono text-sm border border-dashed border-slate-200 rounded-xl">
              Select an incoming alert to view patient details
            </div>
          )}
        </section>
        
        {/* Right Column - 30% */}
        <section className="w-[30%] min-w-[350px] bg-navy-800 flex flex-col p-4 relative">
          <h2 className="font-mono text-xs text-gray-400 mb-3 uppercase tracking-wider">Live Ambulance Tracking</h2>
          <div className="flex-1 rounded-xl overflow-hidden border border-navy-700 relative">
            <LiveMap patient={selectedPatient} />
          </div>
        </section>
      </main>

      {/* Bottom Pinned Status Bar */}
      <ResourceBar hospitalId={hospitalId} />
    </div>
  );
}
