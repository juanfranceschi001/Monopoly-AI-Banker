
import React, { useState, useEffect } from 'react';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import { Player, AppScreen } from './types';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('setup');
  const [players, setPlayers] = useState<Player[]>([]);

  // Load state from local storage on mount (optional persistent state for long games)
  useEffect(() => {
    const saved = localStorage.getItem('monopoly_ai_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.players && parsed.players.length > 0) {
          setPlayers(parsed.players);
          setScreen('game');
        }
      } catch (e) {
        console.error("Failed to restore game state");
      }
    }
  }, []);

  // Persist players to local storage whenever they change
  useEffect(() => {
    if (players.length > 0) {
      localStorage.setItem('monopoly_ai_state', JSON.stringify({ players }));
    } else {
      localStorage.removeItem('monopoly_ai_state');
    }
  }, [players]);

  const startGame = (initialPlayers: Player[]) => {
    setPlayers(initialPlayers);
    setScreen('game');
  };

  const updatePlayers = (updatedPlayers: Player[]) => {
    setPlayers(updatedPlayers);
  };

  const exitGame = () => {
    if (window.confirm("Are you sure you want to end the current session?")) {
      setPlayers([]);
      setScreen('setup');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      {screen === 'setup' && (
        <SetupScreen onStartGame={startGame} />
      )}
      
      {screen === 'game' && (
        <GameScreen 
          players={players} 
          updatePlayers={updatePlayers} 
          onExit={exitGame}
        />
      )}
      
      {/* Footer Branding */}
      <footer className="fixed bottom-0 w-full text-center py-4 pointer-events-none opacity-20 hidden md:block">
        <p className="text-[10px] font-black tracking-tighter text-slate-900">GEMINI AI POWERED MONOPOLY SYSTEM v1.0</p>
      </footer>
    </div>
  );
};

export default App;
