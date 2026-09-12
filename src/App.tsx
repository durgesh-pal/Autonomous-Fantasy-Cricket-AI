/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { Play, Activity, Users, AlertTriangle, CloudRain, Sun, RefreshCw, CheckCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Player {
  id: string;
  name: string;
  role: string;
  price: number;
  form: number;
  isAvailable: boolean;
  averageScore: number;
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [team, setTeam] = useState<Player[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [context, setContext] = useState<any>({});
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [scoringInfo, setScoringInfo] = useState<any>(null);
  const [preference, setPreference] = useState('Balanced');
  const [showPlayerPool, setShowPlayerPool] = useState(false);

  const fetchState = async () => {
    try {
      const [playersRes, stateRes] = await Promise.all([
        fetch('/api/players').then(res => res.json()),
        fetch('/api/state').then(res => res.json())
      ]);
      setPlayers(playersRes);
      setTeam(stateRes.team);
      setLogs(stateRes.logs);
      setContext(stateRes.context);

      if (stateRes.team && stateRes.team.length > 0) {
        const simRes = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamIds: stateRes.team.map((p: any) => p.id) })
        });
        setScoringInfo(await simRes.json());
      }
    } catch (e) {
      console.error("Failed to fetch state:", e);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const runAgent = async () => {
    setIsAgentRunning(true);
    try {
      await fetch('/api/agent/run', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preference })
      });
      await fetchState();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const clearState = async () => {
    await fetch('/api/admin/clear', { method: 'POST' });
    setScoringInfo(null);
    await fetchState();
  };

  const triggerEvent = async (type: string) => {
    let payload = {};
    if (type === 'rain') payload = { weather: 'Raining. Toss delayed. Pitch might get sticky.', pitch: 'Bowling friendly' };
    if (type === 'sunny') payload = { weather: 'Clear and sunny. Good for batting.', pitch: 'Batting friendly' };
    if (type === 'injury_virat') payload = { news: 'Virat Kohli pulled his hamstring and is OUT of the match.', playerUpdate: { id: "1", isAvailable: false } };
    if (type === 'recovery_hardik') payload = { news: 'Hardik Pandya has passed the fitness test and is playing!', playerUpdate: { id: "5", isAvailable: true } };

    await fetch('/api/admin/update-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    await fetchState(); // Show intermediate state
    
    // Auto-run the agent in response to context change
    await runAgent();
  };

  const togglePlayerInTeam = async (playerId: string) => {
    const isCurrentlyInTeam = team.some(p => p.id === playerId);
    let newTeamIds = team.map(p => p.id);
    if (isCurrentlyInTeam) {
      newTeamIds = newTeamIds.filter(id => id !== playerId);
    } else {
      if (newTeamIds.length >= 11) return; // Optional max limit on client, though backend allows constraints violation
      newTeamIds.push(playerId);
    }
    
    await fetch('/api/admin/set-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamIds: newTeamIds })
    });
    await fetchState();
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-neutral-200 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">AutoManager</h1>
            <p className="text-neutral-500 mt-1">Autonomous Fantasy Cricket AI</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <select 
              value={preference}
              onChange={e => setPreference(e.target.value)}
              className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg text-neutral-700 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Balanced">Balanced Strategy</option>
              <option value="Maximize Batting">Maximize Batting</option>
              <option value="Maximize Bowling">Maximize Bowling</option>
            </select>
            
            <button 
              onClick={clearState}
              className="px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors w-full sm:w-auto"
            >
              Reset
            </button>
            <button 
              onClick={runAgent}
              disabled={isAgentRunning}
              className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full sm:w-auto min-w-[200px]"
            >
              {isAgentRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isAgentRunning ? 'Agent Optimizing...' : 'Run Manager'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Dashboard - Left Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Current Team Section */}
            <section className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Active Squad ({team.length}/11)
                </h2>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowPlayerPool(!showPlayerPool)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {showPlayerPool ? "Hide Player Pool" : "Browse Players"}
                  </button>
                  {scoringInfo && (
                    <div className="flex items-center gap-4 text-sm bg-neutral-50 px-3 py-1.5 rounded-md border border-neutral-200">
                      <span className="font-medium text-neutral-600">Cost: <span className={scoringInfo.totalCost > 100 ? 'text-red-500' : 'text-neutral-900'}>{scoringInfo.totalCost}/100</span></span>
                      <span className="font-medium text-neutral-600">Proj. Pts: <span className="text-indigo-600 font-bold">{scoringInfo.projectedScore.toFixed(1)}</span></span>
                    </div>
                  )}
                </div>
              </div>

              {showPlayerPool && (
                <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3">Available Players</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {players.map(player => {
                      const inTeam = team.some(p => p.id === player.id);
                      return (
                        <div key={player.id} className={`p-3 rounded-lg border text-sm flex justify-between items-center ${player.isAvailable ? 'bg-white border-neutral-200' : 'bg-red-50 border-red-200 opacity-70'}`}>
                          <div>
                            <p className="font-semibold text-neutral-900">{player.name} <span className="text-xs text-neutral-500">({player.role})</span></p>
                            <p className="text-xs text-neutral-600">Cr: {player.price} | F: {player.form}</p>
                          </div>
                          <button 
                            onClick={() => togglePlayerInTeam(player.id)}
                            className={`px-3 py-1 rounded text-xs font-medium border ${inTeam ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'}`}
                          >
                            {inTeam ? 'Remove' : 'Add'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {team.length === 0 ? (
                <div className="text-center py-12 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                  <p className="text-neutral-500">No team currently selected.</p>
                  <p className="text-sm text-neutral-400 mt-1">Run the autonomous manager to draft the optimal squad.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {team.map(player => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={player.id} 
                        className={`p-4 rounded-lg border ${player.isAvailable ? 'bg-white border-neutral-200' : 'bg-red-50 border-red-200'} shadow-sm`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-neutral-900">{player.name}</p>
                            <p className="text-xs font-medium text-neutral-500 mt-0.5">{player.role}</p>
                          </div>
                          {!player.isAvailable && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        </div>
                        <div className="mt-3 flex justify-between text-sm">
                          <span className="text-neutral-600">Cr: {player.price}</span>
                          <span className="text-indigo-600 font-medium">F: {player.form}</span>
                          <button onClick={() => togglePlayerInTeam(player.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Drop</button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {scoringInfo && scoringInfo.constraintsViolated?.length > 0 && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" /> Constraints Violated
                  </h3>
                  <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                    {scoringInfo.constraintsViolated.map((v: string, i: number) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Sandbox Controls */}
            <section className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-emerald-500" />
                Environment Simulator
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <button onClick={() => triggerEvent('sunny')} className="p-3 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 flex flex-col items-center gap-2">
                   <Sun className="w-5 h-5 text-amber-500" />
                   Clear Weather
                 </button>
                 <button onClick={() => triggerEvent('rain')} className="p-3 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 flex flex-col items-center gap-2">
                   <CloudRain className="w-5 h-5 text-blue-500" />
                   Rain Delay
                 </button>
                 <button onClick={() => triggerEvent('injury_virat')} className="p-3 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 flex flex-col items-center gap-2 text-center">
                   <AlertTriangle className="w-5 h-5 text-red-500" />
                   Injure Kohli
                 </button>
                 <button onClick={() => triggerEvent('recovery_hardik')} className="p-3 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 flex flex-col items-center gap-2 text-center">
                   <CheckCircle className="w-5 h-5 text-emerald-500" />
                   Hardik Recovers
                 </button>
              </div>
              
              <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-100 text-sm">
                <p className="font-medium text-neutral-700 mb-1">Current Match Context:</p>
                <ul className="space-y-1 text-neutral-600">
                  <li><span className="font-medium">Weather:</span> {context.weather}</li>
                  <li><span className="font-medium">Pitch:</span> {context.pitch}</li>
                  <li><span className="font-medium">News:</span> {context.news}</li>
                </ul>
              </div>
            </section>

          </div>

          {/* Right Column - Agent Logs */}
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 flex flex-col h-full max-h-[800px]">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-500" />
                Agent Thoughts
              </h2>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {logs.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-8">Agent is waiting for instructions.</p>
                ) : (
                  [...logs].reverse().map((log, i) => (
                    <div key={i} className="bg-neutral-50 rounded-lg p-3 border border-neutral-100 text-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-neutral-700">{log.action}</span>
                        <span className="text-xs text-neutral-400">{new Date(log.time).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">{log.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
