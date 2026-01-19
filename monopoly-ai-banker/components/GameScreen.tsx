
import React, { useState } from 'react';
import { DollarSign, Scan, Settings, History, ChevronRight, ArrowRightLeft, X, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import { Player, ScanResult } from '../types';
import Scanner from './Scanner';

interface GameScreenProps {
  players: Player[];
  updatePlayers: (players: Player[]) => void;
  onExit: () => void;
}

interface TransferState {
  fromId: string;
  toId: string;
  amount: number;
}

const GameScreen: React.FC<GameScreenProps> = ({ players, updatePlayers, onExit }) => {
  const [activeScannerFor, setActiveScannerFor] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<{playerId: string, result: ScanResult} | null>(null);
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transfer, setTransfer] = useState<TransferState>({ fromId: '', toId: '', amount: 0 });
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const handleScanComplete = (result: ScanResult) => {
    if (activeScannerFor) {
      setShowConfirmation({ playerId: activeScannerFor, result });
      setActiveScannerFor(null);
    }
  };

  const applyScanResult = () => {
    if (!showConfirmation) return;
    const { playerId, result } = showConfirmation;
    
    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        const newProperties = result.detectedProperties.map(name => ({
          name,
          cost: 0 
        }));
        
        return {
          ...p,
          balance: p.balance + result.totalValue,
          properties: [...p.properties, ...newProperties]
        };
      }
      return p;
    });

    updatePlayers(updatedPlayers);
    setShowConfirmation(null);
  };

  const handleTransferInit = () => {
    setTransfer({ fromId: players[0]?.id || '', toId: players[1]?.id || '', amount: 0 });
    setTransferError(null);
    setShowTransferModal(true);
  };

  const executeTransfer = () => {
    const sender = players.find(p => p.id === transfer.fromId);
    if (!sender) return;

    if (transfer.amount <= 0) {
      setTransferError("Amount must be greater than zero.");
      return;
    }

    if (sender.balance < transfer.amount) {
      setTransferError(`${sender.name} has insufficient funds.`);
      return;
    }

    if (transfer.fromId === transfer.toId) {
      setTransferError("Sender and receiver cannot be the same.");
      return;
    }

    const updatedPlayers = players.map(p => {
      if (p.id === transfer.fromId) return { ...p, balance: p.balance - transfer.amount };
      if (p.id === transfer.toId) return { ...p, balance: p.balance + transfer.amount };
      return p;
    });

    updatePlayers(updatedPlayers);
    setShowTransferModal(false);
    setConfirmTransfer(false);
  };

  return (
    <div className="min-h-screen flex flex-col pb-32">
      {/* Header with Safe Area Top Padding */}
      <header className="bg-white border-b-4 border-black px-6 py-6 sticky top-0 z-30 shadow-[0px_4px_0px_0px_rgba(0,0,0,0.1)] safe-pt">
        <div className="flex items-center justify-between max-w-lg mx-auto w-full">
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight italic">AI BANKER</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] text-black font-black uppercase tracking-widest">LIVE SESSION</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="p-2 border-2 border-black bg-slate-50 hover:bg-slate-100 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
              <History className="w-6 h-6" />
            </button>
            <button onClick={onExit} className="p-2 border-2 border-black bg-slate-50 hover:bg-slate-100 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Player Grid */}
      <main className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full">
        {players.map((player) => (
          <div key={player.id} className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] overflow-hidden transform transition-transform">
            <div className={`h-6 w-full ${player.color} border-b-4 border-black`}></div>
            
            <div className="p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 border-4 border-black ${player.color} flex items-center justify-center text-white font-black text-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]`}>
                    {player.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-black text-2xl uppercase tracking-tighter leading-none">{player.name}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Building2 className="w-4 h-4 text-[#1FB25A]" />
                      <p className="text-xs text-slate-500 font-black uppercase tracking-widest">
                        {player.properties.length} ASSETS
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 block tracking-widest mb-1">BALANCE</span>
                  <span className="text-3xl font-black text-black flex items-center justify-end tracking-tighter">
                    <span className="text-green-600 mr-0.5">$</span>
                    {player.balance.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveScannerFor(player.id)}
                  className="flex items-center justify-center gap-2 py-4 bg-[#E21B22] text-white btn-monopoly font-black uppercase tracking-tighter"
                >
                  <Scan className="w-5 h-5 stroke-[3]" />
                  AI SCAN
                </button>
                <button className="flex items-center justify-center gap-2 py-4 bg-white text-black btn-monopoly font-black uppercase tracking-tighter">
                  MANAGE
                  <ChevronRight className="w-5 h-5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Floating Bottom Action Bar with Safe Area Bottom Padding */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#D4E9D4] via-[#D4E9D4]/95 to-transparent pointer-events-none safe-pb">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button 
            onClick={handleTransferInit}
            className="w-full bg-[#FFEC00] text-black py-5 border-4 border-black rounded-none font-black text-2xl flex items-center justify-center gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <ArrowRightLeft className="w-8 h-8 stroke-[3]" />
            TRANSFER MONEY
          </button>
        </div>
      </div>

      {/* Modals */}
      {activeScannerFor && (
        <Scanner 
          onScanComplete={handleScanComplete} 
          onClose={() => setActiveScannerFor(null)} 
        />
      )}

      {/* Transfer Money Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.5)] w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b-4 border-black bg-slate-50 flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tighter italic">MONEY TRANSFER</h2>
              <button onClick={() => setShowTransferModal(false)} className="text-black p-1">
                <X className="w-8 h-8 stroke-[3]" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="text-[10px] font-black text-black uppercase mb-2 block tracking-widest">SENDER (DEBIT)</label>
                <select 
                  className="w-full bg-white border-4 border-black p-4 font-black text-lg text-black outline-none appearance-none"
                  value={transfer.fromId}
                  onChange={(e) => {
                    setTransfer({...transfer, fromId: e.target.value});
                    setTransferError(null);
                  }}
                >
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name.toUpperCase()} (${p.balance})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-black uppercase mb-2 block tracking-widest">RECEIVER (CREDIT)</label>
                <select 
                  className="w-full bg-white border-4 border-black p-4 font-black text-lg text-black outline-none appearance-none"
                  value={transfer.toId}
                  onChange={(e) => {
                    setTransfer({...transfer, toId: e.target.value});
                    setTransferError(null);
                  }}
                >
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-black uppercase mb-2 block tracking-widest">AMOUNT TO SEND</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-green-600 font-black text-2xl">$</span>
                  <input 
                    type="number"
                    inputMode="numeric"
                    className="w-full bg-white border-4 border-black p-5 pl-12 font-black text-3xl text-black outline-none placeholder:text-slate-200"
                    placeholder="0"
                    value={transfer.amount || ''}
                    onChange={(e) => {
                      setTransfer({...transfer, amount: parseInt(e.target.value) || 0});
                      setTransferError(null);
                    }}
                  />
                </div>
              </div>

              {transferError && (
                <div className="p-4 bg-red-100 border-2 border-red-600 text-red-700 rounded-none text-sm flex items-start gap-3 font-black uppercase italic">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  {transferError}
                </div>
              )}
            </div>

            <div className="p-6 bg-[#D4E9D4] border-t-4 border-black">
              <button 
                onClick={() => setConfirmTransfer(true)}
                className="w-full bg-[#1FB25A] text-white py-5 border-4 border-black font-black text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                PROCEED TO PAY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Step for Transfer */}
      {confirmTransfer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6 backdrop-blur-md">
          <div className="bg-white border-4 border-black w-full max-w-sm p-8 text-center shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-24 h-24 bg-yellow-100 border-4 border-black text-black flex items-center justify-center mx-auto mb-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
              <ArrowRightLeft className="w-12 h-12 stroke-[3]" />
            </div>
            <h3 className="text-3xl font-black mb-2 tracking-tighter">CONFIRM?</h3>
            <p className="text-black mb-8 font-bold leading-tight">
              SENDING <span className="text-green-600 font-black text-xl">${transfer.amount}</span> FROM <br/>
              <span className="bg-[#E21B22] text-white px-2 py-0.5 inline-block mt-2">{players.find(p => p.id === transfer.fromId)?.name.toUpperCase()}</span> TO <br/>
              <span className="bg-[#00A2D9] text-white px-2 py-0.5 inline-block mt-2">{players.find(p => p.id === transfer.toId)?.name.toUpperCase()}</span>
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={executeTransfer}
                className="w-full bg-[#1FB25A] text-white py-5 border-4 border-black font-black text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                YES, AUTHORIZE
              </button>
              <button 
                onClick={() => setConfirmTransfer(false)}
                className="w-full bg-white text-black py-4 border-2 border-black font-black uppercase text-sm"
              >
                GO BACK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan Results Confirmation */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.5)] w-full max-w-sm p-8">
            <div className="flex items-center justify-center w-20 h-20 bg-blue-100 border-4 border-black text-blue-600 mx-auto mb-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
              <Scan className="w-10 h-10 stroke-[3]" />
            </div>
            <h2 className="text-3xl font-black text-center mb-2 tracking-tighter italic">AI SCAN DETECTED</h2>
            <p className="text-slate-500 text-center font-bold text-xs uppercase tracking-widest mb-8">Asset Analysis Complete</p>
            
            <div className="space-y-4 mb-10">
              <div className="bg-slate-50 border-4 border-black p-5 flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
                <span className="font-black text-black text-xs tracking-widest">TOTAL CURRENCY</span>
                <span className="font-black text-green-600 text-3xl tracking-tighter">${showConfirmation.result.totalValue}</span>
              </div>
              
              <div className="bg-slate-50 border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
                <span className="font-black text-black text-[10px] tracking-[0.2em] block mb-3 opacity-50 uppercase">PROPERTIES IDENTIFIED</span>
                {showConfirmation.result.detectedProperties.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {showConfirmation.result.detectedProperties.map((prop, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white border-2 border-black text-[10px] font-black text-black uppercase tracking-tight">
                        {prop}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 font-black uppercase italic">No cards found in frame</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={applyScanResult}
                className="w-full bg-[#1FB25A] text-white py-5 border-4 border-black font-black text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-3"
              >
                <CheckCircle2 className="w-6 h-6" />
                CONFIRM & UPDATE
              </button>
              <button 
                onClick={() => setShowConfirmation(null)}
                className="w-full bg-white text-slate-400 py-4 border-2 border-black font-black uppercase text-xs"
              >
                DISCARD SCAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;
