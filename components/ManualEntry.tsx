
import React, { useState } from 'react';
import { Package } from '../types';

interface ManualEntryProps {
  onAdd: (pkg: Package) => void;
  onClose: () => void;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ onAdd, onClose }) => {
  const [address, setAddress] = useState('');
  const [recipient, setRecipient] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    const newPkg: Package = {
      id: `man-${Date.now()}`,
      address: address.trim(),
      recipient: recipient.trim() || 'S/N',
      status: 'pending',
      timestamp: Date.now()
    };

    onAdd(newPkg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="bg-zinc-900 w-full max-w-lg rounded-[3rem] p-8 border border-zinc-800 slide-up shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black italic font-rugged text-white">MANUAL LOAD</h3>
          <button onClick={onClose} className="text-zinc-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6">
                <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block">Dirección de Entrega</label>
            <input 
              autoFocus
              required
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="CALLE, NUMERO, CIUDAD..."
              className="w-full bg-zinc-800 border-2 border-zinc-700 text-white px-6 py-5 rounded-2xl font-bold focus:border-blue-500 transition-colors uppercase placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block">Nombre del Cliente (Opcional)</label>
            <input 
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="JUAN PEREZ..."
              className="w-full bg-zinc-800 border-2 border-zinc-700 text-white px-6 py-5 rounded-2xl font-bold focus:border-blue-500 transition-colors uppercase placeholder:text-zinc-600"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-white text-black py-6 rounded-[2rem] font-black text-xl uppercase italic shadow-xl shadow-white/10 active:scale-95 transition-all mt-4"
          >
            AÑADIR A LA RUTA
          </button>
        </form>
      </div>
    </div>
  );
};

export default ManualEntry;
