
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { performOCR } from '../services/geminiService';
import { Package } from '../types';

interface ScannerProps {
  onScan: (pkg: Package) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    
    setIsProcessing(true);
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { alpha: false });
    if (context && videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      const result = await performOCR(base64);
      
      if (result && result.address) {
        const newPkg: Package = {
          id: `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          address: result.address,
          recipient: result.recipient || 'CLIENTE',
          status: 'pending',
          timestamp: Date.now()
        };
        onScan(newPkg);
        if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
      }
    }
    setIsProcessing(false);
  }, [isProcessing, onScan]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 20 } } 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setError("Sin permiso de cámara");
      }
    };
    startCamera();

    // Auto-capture every 3.5 seconds to save battery compared to constant processing
    const interval = setInterval(captureAndProcess, 3500);

    return () => {
      clearInterval(interval);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [captureAndProcess]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="w-full h-full object-cover grayscale opacity-60"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Scanner Target Area */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-64 h-48 border-[1.5px] border-white/20 rounded-3xl relative">
             <div className="absolute inset-0 overflow-hidden rounded-3xl">
                <div className="w-full h-[1px] bg-blue-500 shadow-[0_0_15px_#3b82f6] absolute top-0 animate-[scan_2.5s_linear_infinite]"></div>
             </div>
             {/* Corners */}
             <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
             <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
             <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
             <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
          </div>
          <p className="mt-8 text-blue-500 font-rugged text-[10px] font-black tracking-[0.4em] uppercase opacity-70 animate-pulse">Apunta a la etiqueta</p>
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center border border-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
                <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          
          {isProcessing && (
            <div className="bg-blue-600/90 text-white px-4 py-2 rounded-full font-black text-[9px] uppercase tracking-widest animate-pulse">
              Analizando...
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0% }
          100% { top: 100% }
        }
      `}</style>
    </div>
  );
};

export default Scanner;
