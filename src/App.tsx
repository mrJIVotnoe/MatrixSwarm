/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { SwarmMonitor } from "./components/SwarmMonitor";
import { MobileNodeClient } from "./components/MobileNodeClient";
import { Smartphone, Activity } from "lucide-react";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a0a0f] text-gray-300 font-mono">
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#11111a]/80 backdrop-blur-md border border-cyan-900/30 rounded-full px-6 py-3 flex items-center gap-8 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <Link to="/" className="flex flex-col items-center gap-1 hover:text-cyan-400 transition-colors group">
            <Activity className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] uppercase tracking-widest">Monitor</span>
          </Link>
          <Link to="/client" className="flex flex-col items-center gap-1 hover:text-cyan-400 transition-colors group">
            <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] uppercase tracking-widest">Node_Client</span>
          </Link>
        </nav>

        <Routes>
          <Route path="/" element={<SwarmMonitor />} />
          <Route path="/client" element={<MobileNodeClient />} />
        </Routes>
      </div>
    </Router>
  );
}

