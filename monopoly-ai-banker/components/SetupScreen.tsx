
import React, { useState } from 'react';
import { Plus, User, Trash2, Play, Coins } from 'lucide-react';
import { Player } from '../types';
import { PLAYER_COLORS, INITIAL_BALANCE } from '../constants';

interface SetupScreenProps {
  onStartGame: (players: Player[]) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStartGame }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState('');

  const addPlayer = () => {
    if (!newName.trim() || players.length >= 8) return;
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      balance: INITIAL_BALANCE,
      properties: [],
      color: PLAYER_COLORS[players.length]
    };
    setPlayers([...players, newPlayer]);
    setNewName('');
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-lg mx-auto">
      <div className="text-center mb-10 transform -rotate-1">
        <div className="bg-[#E21B22] border-4 border-black px-8 py-4 inline-block shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-5xl font-black text-white tracking-tighter italic">MONOPOLY</h1>
        </div>
        <p className="text-black uppercase tracking-[0.3em] text-sm font-black mt-4 bg-white/80 inline-block px-4 py-1 border-2 border-black">AI BANKER</p>
      </div>

      <div className="w-full bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] p-6 mb-8">
        <h2 className="text-xl font-black mb-6 flex items-center gap-3 border-b-4 border-black pb-2">
          <Coins className="w-6 h-6 text-[#1FB25A]" />
          JOIN THE GAME ({players.length}/8)
        </h2>
        
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="PLAYER NAME"
            className="flex-1 px-4 py-4 bg-slate-100 border-2 border-black focus:outline-none focus:bg-white transition-all font-black text-lg placeholder:text-slate-400"
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          />
          <button
            onClick={addPlayer}
            className="bg-[#1FB25A] text-white p-4 btn-monopoly"
          >
            <Plus className="w-8 h-8 stroke-[3]" />
          </button>
        </div>

        <div className="space-y-4">
          {players.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-4 bg-white border-2 border-black transform transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 border-2 border-black ${player.color} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-white font-black text-xl`}>
                  {player.name[0].toUpperCase()}
                </div>
                <span className="font-black text-xl text-black tracking-tight">{player.name}</span>
              </div>
              <button 
                onClick={() => removePlayer(player.id)}
                className="text-slate-400 hover:text-red-600 p-2 transition-colors"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            </div>
          ))}
          {players.length === 0 && (
            <div className="text-center py-10">
              <User className="w-12 h-12 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest italic">Waiting for players...</p>
            </div>
          )}
        </div>
      </div>

      <button
        disabled={players.length < 2}
        onClick={() => onStartGame(players)}
        className={`w-full py-5 flex items-center justify-center gap-4 font-black text-2xl transition-all btn-monopoly
          ${players.length < 2 
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300' 
            : 'bg-[#FFEC00] text-black hover:bg-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'
          }`}
      >
        <Play className="w-8 h-8 fill-black" />
        START GAME
      </button>
    </div>
  );
};

export default SetupScreen;
