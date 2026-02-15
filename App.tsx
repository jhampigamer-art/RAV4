
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Onboarding from './components/Onboarding';
import Scanner from './components/Scanner';
import ManualEntry from './components/ManualEntry';
import { Package, Stop, GPSProvider } from './types';
import { runAntiLagGC } from './components/MemoryManager';
import { optimizeRoute } from './services/geminiService';

const App: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [gpsProvider, setGpsProvider] = useState<GPSProvider>('google');
  const [lastDeliveredId, setLastDeliveredId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('rav4_packages_v4');
    if (saved) {
      const parsed = JSON.parse(saved);
      const now = Date.now();
      const cleaned = parsed.filter((p: Package) => 
        p.status === 'pending' || (now - p.timestamp < 43200000) // Solo guardamos entregados por 12h
      );
      setPackages(cleaned);
    }
    const onboardingDone = localStorage.getItem('rav4_onboarding_v4');
    if (onboardingDone) setShowOnboarding(false);
  }, []);

  useEffect(() => {
    localStorage.setItem('rav4_packages_v4', JSON.stringify(packages));
  }, [packages]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('rav4_onboarding_v4', 'true');
  };

  const triggerOptimization = async (currentPackages: Package[]) => {
    const pending = currentPackages.filter(p => p.status === 'pending');
    if (pending.length < 2) return;
    
    setIsOptimizing(true);
    try {
      const optimized = await optimizeRoute(pending);
      const delivered = currentPackages.filter(p => p.status === 'delivered');
      setPackages([...optimized, ...delivered]);
    } catch (e) {
      console.error("AI Error", e);
    } finally {
      setIsOptimizing(false);
      runAntiLagGC();
    }
  };

  const addPackage = useCallback((pkg: Package) => {
    setPackages(prev => {
      const isDuplicate = prev.some(p => p.address === pkg.address && p.recipient === pkg.recipient);
      if (isDuplicate) {
        alert("Paquete ya registrado para esta dirección.");
        return prev;
      }
      const newBatch = [pkg, ...prev];
      if (autoOptimize) {
        setTimeout(() => triggerOptimization(newBatch), 800);
      }
      return newBatch;
    });
    if ('vibrate' in navigator) navigator.vibrate(50);
  }, [autoOptimize]);

  const removeStop = (address: string) => {
    if (confirm(`¿Eliminar parada en ${address}?`)) {
      setPackages(prev => prev.filter(p => p.address.toUpperCase() !== address.toUpperCase()));
      runAntiLagGC();
    }
  };

  const handleDeliver = (id: string) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, status: 'delivered', timestamp: Date.now() } : p));
    setLastDeliveredId(id);
    runAntiLagGC();
  };

  const openNavigation = (address: string) => {
    const encoded = encodeURIComponent(address);
    let url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    if (gpsProvider === 'waze') url = `waze://?q=${encoded}&navigate=yes`;
    window.open(url, '_blank');
  };

  const groupedStops = useMemo(() => {
    const stops: Record<string, Stop> = {};
    packages.filter(p => p.status === 'pending').forEach(p => {
      const cleanAddress = p.address.trim().toUpperCase();
      if (!stops[cleanAddress]) stops[cleanAddress] = { address: cleanAddress, packages: [] };
      stops[cleanAddress].packages.push(p);
    });
    return Object.values(stops);
  }, [packages]);

  const stats = useMemo(() => {
    const total = packages.length;
    const pending = packages.filter(p => p.status === 'pending').length;
    const delivered = total - pending;
    const progress = total > 0 ? (delivered / total) * 100 : 0;
    return { total, pending, delivered, progress };
  }, [packages]);

  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div className="min-h-screen bg-black flex flex-col pb-36 safe-bottom">
      {/* Progress Bar Top */}
      <div className="fixed top-0 inset-x-0 h-1 bg-zinc-900 z-[100]">
        <div 
          className="h-full bg-blue-500 transition-all duration-700 ease-out shadow-[0_0_10px_#3b82f6]" 
          style={{ width: `${stats.progress}%` }}
        />
      </div>

      {/* Modern Header */}
      <header className="p-5 bg-zinc-900/90 backdrop-blur-3xl border-b border-white/5 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center font-rugged font-black text-xs shadow-xl">
             R4
          </div>
          <div>
            <h1 className="text-lg font-black text-white italic tracking-tighter uppercase leading-none font-rugged">DELIVERY PRO</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[8px] font-bold text-blue-500 tracking-[0.2em] uppercase">{stats.delivered}/{stats.total} COMPLETADOS</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
            <select 
              value={gpsProvider} 
              onChange={(e) => setGpsProvider(e.target.value as GPSProvider)}
              className="bg-zinc-800 text-zinc-300 text-[9px] font-black py-1.5 px-3 rounded-md border border-zinc-700 outline-none uppercase appearance-none"
            >
              <option value="google">GOOGLE</option>
              <option value="waze">WAZE</option>
            </select>
            <div className="flex items-center gap-1">
              <div className={`w-1 h-1 rounded-full ${isOptimizing ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`} />
              <span className="text-[7px] text-zinc-600 font-bold uppercase">{isOptimizing ? 'Calculando...' : 'IA Ready'}</span>
            </div>
        </div>
      </header>

      {/* Route List */}
      <main className="flex-1 p-4 space-y-4">
        {groupedStops.length === 0 && !isScanning && (
          <div className="flex flex-col items-center justify-center py-40 text-zinc-800 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-zinc-800/50">
                <span className="text-4xl grayscale opacity-50">🚚</span>
            </div>
            <h2 className="text-xl font-black text-zinc-500 uppercase italic">Sin ruta activa</h2>
            <p className="text-[10px] text-zinc-700 mt-2 font-black tracking-widest uppercase">Escanea paquetes para optimizar millaje</p>
          </div>
        )}

        <div className="space-y-4">
          {groupedStops.map((stop, index) => {
            // Analizar si es una calle repetida para visual grouping
            const streetName = stop.address.replace(/[0-9]/g, '').trim();
            const prevStop = groupedStops[index - 1];
            const isSameStreet = prevStop && prevStop.address.replace(/[0-9]/g, '').trim() === streetName;

            return (
              <div key={stop.address} className="relative group">
                {isSameStreet && (
                  <div className="absolute -top-4 left-6 w-[2px] h-4 bg-blue-500/20 z-0" />
                )}
                
                <div className="bg-zinc-900 rounded-[1.8rem] p-5 border border-white/5 shadow-2xl transition-all active:scale-[0.98] relative z-10 overflow-hidden">
                  {isSameStreet && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/30" />}
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${isSameStreet ? 'bg-blue-900/30 text-blue-400' : 'bg-zinc-800 text-zinc-500'} uppercase`}>
                          PARADA {index + 1}
                        </span>
                        {stop.packages.length > 1 && (
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter">
                            + {stop.packages.length} PAQUETES
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-black text-white leading-none tracking-tighter uppercase font-rugged italic">{stop.address}</h2>
                    </div>
                    
                    <button 
                      onClick={() => removeStop(stop.address)}
                      className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-1 mb-5">
                    {stop.packages.map(pkg => (
                      <div key={pkg.id} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                        <p className="text-[11px] font-bold text-zinc-400 uppercase truncate">{pkg.recipient}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openNavigation(stop.address)}
                      className="bg-white text-black py-4 rounded-2xl font-black text-sm active:bg-zinc-200 transition-all uppercase italic"
                    >
                      MAPA
                    </button>
                    <button
                      onClick={() => handleDeliver(stop.packages[0].id)}
                      className="bg-blue-600 text-white py-4 rounded-2xl font-black text-sm active:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 uppercase italic"
                    >
                      LISTO
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Ergonomic Floating Controls */}
      <nav className="fixed bottom-0 inset-x-0 p-6 flex justify-between items-center z-40 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
        <div className="flex flex-col gap-3 pointer-events-auto">
            <button
                onClick={() => setIsManualEntryOpen(true)}
                className="w-14 h-14 bg-zinc-900 text-zinc-400 rounded-2xl flex items-center justify-center border border-white/5 active:scale-90 transition-all shadow-xl"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6">
                    <path d="M12 5v14M5 12h14" />
                </svg>
            </button>
            <button
                onClick={() => confirm("¿Limpiar toda la ruta?") && setPackages([])}
                className="w-14 h-14 bg-zinc-900 text-zinc-600 rounded-2xl flex items-center justify-center border border-white/5 active:scale-90 transition-all"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>

        <button
          onClick={() => setIsScanning(true)}
          className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.4)] active:scale-90 transition-all border-[4px] border-black glow-blue pointer-events-auto"
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-12 h-12">
              <path d="M4 4h7V2H4c-1.1 0-2 .9-2 2v7h2V4zm6 9l-4 4 4 4V13zm3-11v2h7v7h2V4c0-1.1-.9-2-2-2h-7zm7 18h-7v2h7c1.1 0 2-.9 2-2v-7h-2v7zM4 13H2v7c0 1.1.9 2 2 2h7v-2H4v-7zm9 1l4-4-4-4v8z"/>
          </svg>
        </button>
        
        <div className="flex flex-col gap-3 pointer-events-auto">
             <button
                onClick={() => triggerOptimization(packages)}
                disabled={isOptimizing || groupedStops.length < 2}
                className={`w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 active:scale-90 transition-all shadow-xl ${isOptimizing ? 'animate-spin' : ''} disabled:opacity-20`}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 text-blue-500">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </button>
            <div className="w-14 h-14" />
        </div>
      </nav>

      {/* Overlays */}
      {isScanning && <Scanner onScan={addPackage} onClose={() => setIsScanning(false)} />}
      {isManualEntryOpen && <ManualEntry onAdd={addPackage} onClose={() => setIsManualEntryOpen(false)} />}

      {lastDeliveredId && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-[100]">
          <div className="bg-green-500 text-white px-10 py-5 rounded-[2rem] font-black text-xl shadow-2xl uppercase italic animate-in zoom-in fade-out duration-700">
            ENTREGA EXITOSA ✓
          </div>
          {setTimeout(() => setLastDeliveredId(null), 800) && null}
        </div>
      )}
    </div>
  );
};

export default App;
