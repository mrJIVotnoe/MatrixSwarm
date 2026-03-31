import React, { useState } from "react";
import { createTask } from "../services/swarmService";
import { Send, Loader2, Database } from "lucide-react";

export const TaskForm: React.FC<{ onTaskCreated: () => void; authToken?: string }> = ({ onTaskCreated, authToken }) => {
  const [type, setType] = useState("generic");
  const [priority, setPriority] = useState(5);
  const [payload, setPayload] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      let parsedPayload: any = { timestamp: Date.now() };
      if (payload.trim()) {
        try {
          parsedPayload = { ...parsedPayload, ...JSON.parse(payload) };
        } catch (err) {
          parsedPayload = { ...parsedPayload, raw_data: payload };
        }
      }
      
      await createTask(type, parsedPayload, priority, authToken);
      setMessage("TASK_QUEUED_SUCCESSFULLY");
      setPayload("");
      onTaskCreated();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage("ERROR_QUEUING_TASK");
    } finally {
      setLoading(false);
    }
  };

  const taskTypes = [
    { id: "generic", label: "GENERIC_PROCESS" },
    { id: "text_classification", label: "TEXT_ANALYSIS" },
    { id: "llm_1.5b", label: "AI_INFERENCE_1.5B" },
    { id: "llm_3b", label: "AI_INFERENCE_3B" },
    { id: "llm_7b", label: "AI_INFERENCE_7B" },
    { id: "image_processing", label: "IMAGE_TRANSCODE" },
  ];

  return (
    <div className="bg-[#11111a] border border-cyan-900/20 p-6 rounded-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Database className="w-24 h-24 text-cyan-400" />
      </div>

      <h2 className="text-lg font-bold text-cyan-400 mb-6 flex items-center gap-2 uppercase tracking-tighter relative z-10">
        <Send className="w-4 h-4" />
        Dispatch_New_Task
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase mb-2">Operation_Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-black border border-cyan-900/30 text-cyan-400 p-2 text-xs focus:outline-none focus:border-cyan-400"
            >
              {taskTypes.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 uppercase mb-2">Priority_Level ({priority})</label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value))}
              className="w-full accent-cyan-400 bg-cyan-900/20"
            />
            <div className="flex justify-between text-[8px] text-cyan-900 mt-1">
              <span>LOW</span>
              <span>CRITICAL</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-gray-500 uppercase mb-2">Data_Payload (JSON or Text)</label>
          <textarea 
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder='{"key": "value"} or raw text...'
            className="w-full bg-black border border-cyan-900/30 text-cyan-400 p-3 text-xs focus:outline-none focus:border-cyan-400 h-24 font-mono resize-none"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-cyan-400/10 border border-cyan-400/50 text-cyan-400 py-3 text-xs font-bold hover:bg-cyan-400 hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "EXECUTE_DISPATCH"}
        </button>

        {message && (
          <div className={`text-[10px] text-center mt-2 font-bold ${message.includes("ERROR") ? "text-red-400" : "text-green-400"}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
};
