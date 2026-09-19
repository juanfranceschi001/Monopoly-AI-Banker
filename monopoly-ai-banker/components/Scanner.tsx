
import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Check, X } from 'lucide-react';
import { analyzeMonopolyImage } from '../services/geminiService';
import { ScanResult } from '../types';

interface ScannerProps {
  onScanComplete: (result: ScanResult) => void;
  onClose: () => void;
}

// Camera photos can be 8-15MB at full resolution -- base64-encoding,
// uploading, and having Gemini process that is slow and unnecessary for
// reading bills/cards. Downscale to a reasonable size first.
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

const resizeImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > height && width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load photo for resizing'));
    };
    img.src = objectUrl;
  });
};

const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.warn("Scanner: no file returned from the picker/camera.");
      setError("No photo was selected. Please try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const base64String = await resizeImageToBase64(file);
      console.log("Scanner: resized image base64 length=" + base64String.length);
      const result = await analyzeMonopolyImage(base64String);
      console.log("Scanner: result=" + JSON.stringify(result));
      onScanComplete(result);
    } catch (e) {
      console.error("Scanner: analysis failed.", e);
      const message = e instanceof Error ? e.message : "";
      setError(
        message.includes("busy right now")
          ? message
          : "Failed to analyze image. Please try again with a clearer photo."
      );
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
