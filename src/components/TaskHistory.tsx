import React, { useState } from "react";
import { Clock, CheckCircle, XCircle, Loader2, Info, ChevronDown, ChevronUp, Maximize2, Terminal, Shield, Fingerprint } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Task {
  id: string;
  type: string;
  status: string;
  created_at: string;
  updated_at?: string;
  assigned_node: string | null;
  result?: any;
  error?: string | null;
  attempts?: number;
  priority?: number;
  payload?: any;
}

export const TaskHistory: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [inspectingTask, setInspectingTask] = useState<Task | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  return (
    <div className="bg-[#11111a] border border-cyan-900/20 p-6 rounded-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Terminal className="w-32 h-32 text-cyan-400" />
      </div>
      
      <h2 className="text-lg font-bold text-cyan-400 mb-6 flex items-center gap-2 uppercase tracking-tighter relative z-10">
        <Clock className="w-4 h-4" />
        Swarm_Activity_Log
      </h2>

      <div className="space-y-3 relative z-10">
        {tasks.length === 0 ? (
          <p className="text-[10px] text-gray-600 italic">NO_ACTIVITY_RECORDED</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="border-b border-cyan-900/10 pb-2 group">
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-cyan-900/5 p-1 transition-colors"
                onClick={() => toggleExpand(task.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {task.status === "completed" && <CheckCircle className="w-3 h-3 text-green-400" />}
                    {task.status === "failed" && <XCircle className="w-3 h-3 text-red-400" />}
                    {task.status === "running" && <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />}
                    {task.status === "pending" && <Clock className="w-3 h-3 text-gray-400" />}
                    {task.status === "completed" && (
                      <motion.div 
                        layoutId={`glow-${task.id}`}
                        className="absolute inset-0 bg-green-400/20 blur-sm rounded-full"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-2">
                      {task.type}
                      {task.priority && task.priority > 7 && (
                        <span className="text-[7px] bg-red-900/30 text-red-400 px-1 border border-red-900/50 animate-pulse">CRITICAL_PRIORITY</span>
                      )}
                    </p>
                    <p className="text-[8px] text-gray-500 font-mono tracking-tighter">{task.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[8px] text-gray-500">{new Date(task.created_at).toLocaleTimeString()}</p>
                    <p className="text-[8px] text-cyan-900 uppercase font-bold">{task.assigned_node || "AWAITING_NODE"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectingTask(task);
                      }}
                      className="p-1 hover:text-cyan-400 text-cyan-900 transition-colors"
                      title="Deep Inspect"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                    {expandedTaskId === task.id ? <ChevronUp className="w-3 h-3 text-cyan-900" /> : <ChevronDown className="w-3 h-3 text-cyan-900" />}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedTaskId === task.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 p-4 bg-black/40 border border-cyan-900/10 text-[10px] space-y-3 font-mono">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-gray-600 uppercase mb-1 text-[8px]">Status</p>
                          <p className={`font-bold ${
                            task.status === "completed" ? "text-green-400" : 
                            task.status === "failed" ? "text-red-400" : 
                            task.status === "running" ? "text-yellow-400" : "text-gray-400"
                          }`}>{task.status.toUpperCase()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 uppercase mb-1 text-[8px]">Attempts</p>
                          <p className="text-cyan-400">{task.attempts || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 uppercase mb-1 text-[8px]">Priority</p>
                          <p className="text-cyan-400">{task.priority || 5}/10</p>
                        </div>
                      </div>

                      {task.result && (
                        <div className="space-y-1">
                          <p className="text-gray-600 uppercase text-[8px]">Result_Summary</p>
                          <div className="p-2 bg-green-900/5 border border-green-900/20 text-green-400/80 italic">
                            {typeof task.result === 'string' ? task.result : JSON.stringify(task.result).slice(0, 100) + '...'}
                          </div>
                        </div>
                      )}

                      {task.error && (
                        <div className="space-y-1">
                          <p className="text-gray-600 uppercase text-[8px]">Error_Log</p>
                          <div className="p-2 bg-red-900/5 border border-red-900/20 text-red-400">
                            {task.error}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-cyan-900/10 flex justify-between text-[7px] text-gray-600 uppercase tracking-widest">
                        <span>Created: {new Date(task.created_at).toLocaleString()}</span>
                        {task.updated_at && <span>Sync: {new Date(task.updated_at).toLocaleString()}</span>}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Deep Inspection Modal */}
      <AnimatePresence>
        {inspectingTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectingTask(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#0a0a0f] border border-cyan-400/30 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col relative z-10 shadow-[0_0_50px_rgba(34,211,238,0.1)]"
            >
              <div className="p-4 border-b border-cyan-400/20 flex justify-between items-center bg-cyan-400/5">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Task_Deep_Inspection</h3>
                    <p className="text-[10px] text-cyan-900 font-mono">{inspectingTask.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setInspectingTask(null)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <DetailItem label="Type" value={inspectingTask.type} />
                  <DetailItem label="Status" value={inspectingTask.status} color={
                    inspectingTask.status === "completed" ? "text-green-400" : 
                    inspectingTask.status === "failed" ? "text-red-400" : "text-yellow-400"
                  } />
                  <DetailItem label="Priority" value={`${inspectingTask.priority}/10`} />
                  <DetailItem label="Node" value={inspectingTask.assigned_node || "N/A"} />
                </div>

                <div className="space-y-4">
                  <div className="bg-black/60 border border-cyan-900/30 p-4 rounded-sm">
                    <div className="flex items-center gap-2 mb-3 text-cyan-400 text-[10px] uppercase font-bold">
                      <Fingerprint className="w-3 h-3" />
                      Input_Payload
                    </div>
                    <pre className="text-[10px] text-gray-400 font-mono overflow-x-auto p-2 bg-black/40">
                      {JSON.stringify(inspectingTask.payload || {}, null, 2)}
                    </pre>
                  </div>

                  <div className="bg-black/60 border border-cyan-900/30 p-4 rounded-sm">
                    <div className="flex items-center gap-2 mb-3 text-green-400 text-[10px] uppercase font-bold">
                      <CheckCircle className="w-3 h-3" />
                      Execution_Result
                    </div>
                    <pre className="text-[10px] text-green-400/80 font-mono overflow-x-auto p-2 bg-black/40">
                      {JSON.stringify(inspectingTask.result || "NO_RESULT_DATA", null, 2)}
                    </pre>
                  </div>

                  {inspectingTask.error && (
                    <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-sm">
                      <div className="flex items-center gap-2 mb-3 text-red-400 text-[10px] uppercase font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        Error_Trace
                      </div>
                      <pre className="text-[10px] text-red-400/80 font-mono overflow-x-auto p-2 bg-black/40">
                        {inspectingTask.error}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-cyan-400/10 bg-black/40 flex justify-between items-center text-[8px] text-cyan-900 uppercase tracking-[0.2em]">
                <span>Matrix_Swarm_Inspector_v1.0</span>
                <span>Security_Level: E2EE_ENCRYPTED</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailItem = ({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) => (
  <div className="bg-black/40 p-3 border border-cyan-900/10">
    <p className="text-[8px] text-gray-600 uppercase mb-1">{label}</p>
    <p className={`text-[10px] font-bold truncate ${color}`}>{value.toUpperCase()}</p>
  </div>
);

const AlertTriangle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);
