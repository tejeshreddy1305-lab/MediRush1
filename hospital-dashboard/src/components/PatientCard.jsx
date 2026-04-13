import { useState } from 'react';
import axios from 'axios';
import { Activity, AlertTriangle, FileText, CheckCircle, MapPin } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function PatientCard({ patient, hospitalId }) {
  const [accepted, setAccepted] = useState(false);
  const [arrived, setArrived] = useState(false);

  const handleAccept = async () => {
    try {
      await axios.post(`${API_BASE}/api/accept_case`, {
        token: patient.token,
        hospital_id: parseInt(hospitalId),
        doctor_name: "Dr. On Call",
        message: "We are ready. Follow the green route to Emergency Bay 1."
      });
      setAccepted(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkArrived = async () => {
    try {
      await axios.post(`${API_BASE}/api/mark_arrived`, {
        token: patient.token
      });
      setArrived(true);
    } catch (e) {
      console.error(e);
    }
  };

  if (!patient) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden text-[var(--text)]">
      <div className="flex justify-between items-start mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight leading-tight">{patient.patient?.name || 'Unknown Patient'}</h2>
          <div className="font-mono text-sm text-[var(--text2)] mt-1">
            AGE: {patient.patient?.age || '?'}, SEX: M | TOKEN: <span className="border-b border-dashed border-[var(--text3)] text-[var(--text)]">{patient.token}</span>
          </div>
        </div>
        <div className={`p-3 rounded border text-center min-w-[100px]
          ${patient.severity === 'CRITICAL' ? 'bg-[var(--red)]/10 border-[var(--red)]' : 'bg-[var(--amber)]/10 border-[var(--amber)]'}`}>
          <div className="text-[10px] font-mono text-[var(--text2)] uppercase tracking-widest mb-1">AI SCORE</div>
          <div className={`text-2xl font-bold ${patient.severity === 'CRITICAL' ? 'text-[var(--red)]' : 'text-[var(--amber)]'}`}>
            {patient.priority_score?.toFixed(1) || '0.0'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* Condition Box */}
        <div className="bg-[var(--card)] p-4 rounded-xl border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[var(--text3)]" />
            <h3 className="font-mono text-xs text-[var(--text3)] uppercase tracking-widest">Suspected Condition</h3>
          </div>
          <div className="font-sans text-xl text-[var(--red)]">{patient.condition}</div>
        </div>

        {/* Medical History */}
        <div className="bg-[var(--card)] p-4 rounded-xl border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-[var(--text3)]" />
            <h3 className="font-mono text-xs text-[var(--text3)] uppercase tracking-widest">Medical Chart (AI summary)</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 font-mono text-sm">
            <div><span className="text-[var(--text2)] block mb-1">Blood Type:</span><span>O+</span></div>
            <div>
              <span className="text-[var(--text2)] block mb-1">Allergies:</span>
              <span className="text-[var(--amber)] bg-[var(--amber)]/10 px-2 py-0.5 rounded flex items-center inline-flex gap-1">
                <AlertTriangle size={12}/> Penicillin
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border)] shrink-0 grid grid-cols-2 gap-3">
        <button 
          onClick={handleAccept}
          disabled={accepted}
          className={`py-3 rounded-lg font-bold font-sans flex items-center justify-center gap-2 transition-colors
            ${accepted ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/50' : 'bg-transparent text-[var(--text)] border-2 border-[var(--text)] hover:bg-[var(--text)] hover:text-[var(--bg)]'}`}
        >
          {accepted ? <><CheckCircle size={18} /> ACCEPTED</> : 'ACCEPT CASE'}
        </button>
        <button 
          onClick={handleMarkArrived}
          disabled={arrived}
          className={`py-3 rounded-lg font-bold font-sans flex items-center justify-center gap-2 transition-colors
            ${arrived ? 'bg-[var(--blue)]/20 text-[var(--blue)] border border-[var(--blue)]/50' : 'bg-[var(--blue)]/20 text-[var(--blue)] border border-[var(--blue)]/50 hover:bg-[var(--blue)] hover:text-white'}`}
        >
          {arrived ? <><MapPin size={18} /> ARRIVED</> : 'MARK ARRIVED'}
        </button>
      </div>
    </div>
  );
}
