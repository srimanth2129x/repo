import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EvidenceModal from '../components/EvidenceModal';

export default function AlertsView() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlertForEvidence, setSelectedAlertForEvidence] = useState(null);

  const fetchAlerts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/alerts');
      setAlerts(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold tracking-wider text-white">INCIDENT ALERTS & THREAT INTELLIGENCE</h1>
        <button onClick={fetchAlerts} className="text-xs px-3 py-1.5 bg-slate-800 rounded border border-slate-700 text-slate-300 cursor-pointer">
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-slate-400 uppercase text-[11px]">
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Alert Title</th>
              <th className="py-3 px-4">Device</th>
              <th className="py-3 px-4">MITRE ATT&CK</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-slate-500 font-sans">
                  No active high-risk alerts detected.
                </td>
              </tr>
            ) : (
              alerts.map((al) => (
                <tr key={al.id} className="border-b border-[var(--border-color)] hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      al.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      al.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {al.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white font-medium">{al.title}</td>
                  <td className="py-3 px-4 text-[var(--color-accent)]">{al.device_id}</td>
                  <td className="py-3 px-4">
                    {al.mitre_technique_id ? (
                      <span className="text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded text-[10px]">
                        {al.mitre_technique_id} - {al.mitre_technique_name}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {al.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setSelectedAlertForEvidence(al)}
                      className="px-3 py-1 bg-[var(--color-accent)]/20 border border-[var(--color-accent)] text-[var(--color-accent)] rounded text-[11px] font-semibold hover:bg-[var(--color-accent)]/30 transition cursor-pointer"
                    >
                      View Evidence
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Interactive Evidence Graph Modal */}
      {selectedAlertForEvidence && (
        <EvidenceModal 
          alert={selectedAlertForEvidence} 
          onClose={() => setSelectedAlertForEvidence(null)} 
        />
      )}
    </div>
  );
}