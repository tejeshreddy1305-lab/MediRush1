import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function Login() {
  const [email, setEmail] = useState('satya.k@apollotirupati.com'); // Seeded user
  const [password, setPassword] = useState('securepass123'); // Default dummy password in seed
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email,
        password
      });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('hospital_id', res.data.hospital_id);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials or server down.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 p-4">
      <div className="bg-navy-800 p-8 rounded-xl w-full max-w-md shadow-2xl border border-navy-700">
        <div className="flex flex-col items-center mb-8">
          <Activity className="w-12 h-12 text-emergency mb-2" />
          <h1 className="text-3xl font-bold font-sans tracking-tight">MediRush</h1>
          <p className="text-gray-400 font-mono text-sm mt-1">HOSPITAL COMMAND CENTER</p>
        </div>
        
        {error && <div className="mb-4 p-3 bg-red-900/50 border border-emergency text-red-200 text-sm rounded font-mono">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1 uppercase">Staff Email</label>
            <input 
              type="text" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emergency font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1 uppercase">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emergency font-mono"
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-emergency hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
