import React, { useState } from 'react';

export default function EvidenceModal({ alert, onClose }) {
  const [selectedNode, setSelectedNode] = useState(null);

  if (!alert) return null;
  const graph = alert.evidence_graph || { nodes: [], edges: [] };

  const getNodeColor = (type) => {
    switch (type) {
      case 'entity': return 'border-cyan-500 bg-cyan-950/40 text-cyan-300';
      case 'event': return 'border-blue-500 bg-blue-950/40 text-blue-300';
      case 'mutation': return 'border-purple-500 bg-purple-950/40 text-purple-300';
      case 'mitre': return 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold';
      case 'risk': return 'border-orange-500 bg-orange-950/40 text-orange-300';
      case 'alert': return 'border-red-500 bg-red-950/40 text-red-300 font-bold';
      default: return 'border-slate-600 bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
                {alert.severity || 'HIGH'}
              </span>
              <h2 className="text-base font-bold text-white tracking-wide">{alert.title}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Device: <span className="text-[var(--color-accent)] font-mono">{alert.device_id}</span> | 
              Generated: <span className="text-slate-300">{new Date(alert.created_at).toLocaleTimeString()}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg text-sm transition cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* MITRE ATT&CK Header Ribbon */}
        {alert.mitre_technique_id && (
          <div className="bg-amber-950/20 border-b border-amber-500/20 p-3 px-6 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-amber-400 font-mono text-sm">{alert.mitre_technique_id}</span>
              <span className="text-slate-200 font-semibold">{alert.mitre_technique_name}</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Tactic: {alert.mitre_tactic}
              </span>
            </div>
            <span className="text-slate-400 italic text-[11px]">Observed pattern consistent with ATT&CK</span>
          </div>
        )}

        {/* Split Body: Graph Canvas & Node Inspector */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          
          {/* Graph Sequence Panel */}
          <div className="md:col-span-2 p-6 bg-slate-950/40 border-r border-[var(--border-color)] overflow-y-auto flex flex-col gap-4">
            <span className="text-xs font-mono uppercase text-slate-400">Explainability Sequence Chain (Click Node)</span>
            
            <div className="flex flex-wrap items-center justify-center gap-3 py-8">
              {graph.nodes && graph.nodes.map((node, i) => (
                <div key={node.id} className="flex items-center">
                  <div
                    onClick={() => setSelectedNode(node)}
                    className={`cursor-pointer border rounded-xl p-3 min-w-[140px] text-center shadow-lg transition transform hover:scale-105 ${getNodeColor(node.type)} ${
                      selectedNode?.id === node.id ? 'ring-2 ring-white scale-105' : ''
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{node.label}</div>
                    <div className="text-xs font-semibold truncate max-w-[160px]">{node.name}</div>
                  </div>
                  {i < graph.nodes.length - 1 && (
                    <span className="text-slate-600 font-mono px-2 text-sm font-bold">→</span>
                  )}
                </div>
              ))}
            </div>

            {/* Edge Inferences */}
            <div className="mt-auto border-t border-slate-800 pt-3">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Causal / Correlation Edges:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {graph.edges && graph.edges.map((e, idx) => (
                  <span key={idx} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-1 rounded font-mono">
                    {e.source.split(':')[0]} ➔ <span className="text-[var(--color-accent)]">{e.relationship}</span> ➔ {e.target.split(':')[0]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Node Detail Inspector */}
          <div className="p-4 bg-[var(--bg-card)] overflow-y-auto">
            <span className="text-xs font-mono uppercase text-slate-400">Node Evidence Inspector</span>
            {selectedNode ? (
              <div className="mt-4 space-y-3 font-mono text-xs">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">NODE TYPE</span>
                  <span className="text-[var(--color-accent)] font-bold">{selectedNode.label}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">IDENTIFIER / NAME</span>
                  <span className="text-white">{selectedNode.name}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">EVIDENCE DETAILS</span>
                  <pre className="text-[11px] text-slate-300 whitespace-pre-wrap mt-1">
                    {JSON.stringify(selectedNode.details, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-xs text-slate-500 p-6">
                Click any node in the explainability sequence to inspect exact timestamps, commands, or behavioral rules.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}