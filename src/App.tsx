/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { SwarmMonitor } from "./components/SwarmMonitor";
import { MobileNodeClient } from "./components/MobileNodeClient";
import { Smartphone, Activity, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "./firebase";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("LOGIN_ERROR", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("LOGOUT_ERROR", err);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-cyan-400 font-mono">INITIALIZING_MATRIX_AUTH...</div>;
  }

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
          
          <div className="w-px h-6 bg-cyan-900/30" />

          {user ? (
            <button onClick={handleLogout} className="flex flex-col items-center gap-1 hover:text-red-400 transition-colors group">
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] uppercase tracking-widest">Logout</span>
            </button>
          ) : (
            <button onClick={handleLogin} className="flex flex-col items-center gap-1 hover:text-cyan-400 transition-colors group">
              <LogIn className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] uppercase tracking-widest">Login</span>
            </button>
          )}
        </nav>

        {user && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-[#11111a]/50 border border-cyan-900/20 px-3 py-1.5 rounded-full">
            <img src={user.photoURL || ""} alt="" className="w-6 h-6 rounded-full border border-cyan-400/30" />
            <span className="text-[10px] text-cyan-400 uppercase tracking-tighter">{user.displayName}</span>
          </div>
        )}

        <Routes>
          <Route path="/" element={<SwarmMonitor user={user} />} />
          <Route path="/client" element={<MobileNodeClient />} />
        </Routes>
      </div>
    </Router>
  );
}

