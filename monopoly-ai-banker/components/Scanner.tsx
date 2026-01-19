
import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Check, X } from 'lucide-react';
import { analyzeMonopolyImage } from '../services/geminiService';
import { ScanResult } from '../types';

interface ScannerProps {
  onScanComplete: (result: ScanResult) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        try {
          const result = await analyzeMonopolyImage(base64String);
          onScanComplete(result);
        } catch (e) {
          setError("Failed to analyze image. Please try again with a clearer photo.");
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setError("Error reading file.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">AI Asset Scanner</h2>
          <p className="text-slate-500 mb-6">Take a photo of your money or properties to automatically update your balance.</p>

          {loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="font-medium animate-pulse">Analyzing image with Gemini AI...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <Camera className="w-8 h-8 mb-2 text-slate-400 group-hover:text-blue-500" />
                <span className="text-sm font-semibold">Camera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-blue-500" />
                <span className="text-sm font-semibold">Gallery</span>
              </button>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}

          {!loading && (
            <button
              onClick={onClose}
              className="mt-8 text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;
