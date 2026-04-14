import React, { useEffect, useState } from 'react';
import { Cpu, Play, CheckCircle2 } from 'lucide-react';

interface ClusterJob {
  id: string;
  name: string;
  type: string;
  totalRange: number;
  chunksCount: number;
  status: string;
  completed_chunks: number;
  final_result: number | null;
}

export const ClusterMonitor: React.FC = () => {
  const [jobs, setJobs] = useState<ClusterJob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch('/api/v1/cluster/jobs');
        if (res.ok) {
          setJobs(await res.json());
        }
      } catch (e) {
        console.error("Failed to fetch cluster jobs");
      }
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartJob = async () => {
    setIsSubmitting(true);
    try {
      await fetch('/api/v1/cluster/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: "Prime Search (0 - 2M)",
          type: "prime_search",
          totalRange: 2000000,
          chunksCount: 20
        })
      });
    } catch (e) {
      console.error("Failed to start job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-blue-500/30 p-5 rounded-sm">
      <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-blue-400 uppercase">
        <Cpu className="w-4 h-4" />
        Суперкомпьютер (PlayStation Cluster)
      </h2>
      
      <div className="space-y-4">
        <button 
          onClick={handleStartJob}
          disabled={isSubmitting}
          className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/50 text-blue-400 text-xs font-bold tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Play className="w-3 h-3" />
          ЗАПУСТИТЬ РАСПРЕДЕЛЕННУЮ ЗАДАЧУ
        </button>

        <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
          {jobs.length === 0 ? (
            <p className="text-[10px] text-blue-900 italic">Кластер простаивает...</p>
          ) : (
            jobs.map(job => {
              const progress = (job.completed_chunks / job.chunksCount) * 100;
              return (
                <div key={job.id} className="p-3 border border-blue-500/20 bg-blue-950/20 rounded-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-blue-300 font-bold">{job.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-sm ${job.status === 'completed' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="w-full bg-black h-1.5 rounded-full overflow-hidden border border-blue-900/50">
                    <div 
                      className={`h-full transition-all duration-500 ${job.status === 'completed' ? 'bg-cyan-500' : 'bg-blue-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-blue-500/70">{job.completed_chunks} / {job.chunksCount} Chunks</span>
                    {job.status === 'completed' && job.final_result !== null && (
                      <span className="text-cyan-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Result: {job.final_result}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
