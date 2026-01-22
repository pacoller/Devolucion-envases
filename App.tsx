
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Loader2, LogOut, Settings, Package, CheckCircle2, ChevronRight, Boxes, Plus, Minus, X, ZoomIn, ShoppingCart, ArrowRight, Trash2, Image as ImageIcon
} from 'lucide-react';
import { Socio, Envase, AppStatus, ViewState } from './types';
import { gasService } from './services/gasService';

const ADMIN_CODE = "ADMIN99"; 

/**
 * Transforma enlaces de Google Drive en enlaces directos de previsualización (thumbnails).
 * Este método es mucho más fiable que el export=view para incrustación en web.
 */
const transformDriveUrl = (url: string): string => {
  if (!url) return '';
  // Si no es un enlace pero parece un ID de Drive
  if (url.length === 33 && !url.includes('http')) {
    return `https://drive.google.com/thumbnail?id=${url}&sz=w1000`;
  }
  if (!url.includes('drive.google.com')) return url;
  
  try {
    const match = url.match(/\/(?:d|file\/d|open\?id=)\/([a-zA-Z0-9_-]+)/);
    const fileId = match ? match[1] : null;
    // Usamos el endpoint de thumbnail que es mucho más robusto para visores web
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : url;
  } catch (e) {
    return url;
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [loading, setLoading] = useState(true);
  const [appStatus, setAppStatus] = useState<AppStatus>(AppStatus.ABIERTO);
  const [currentSocio, setCurrentSocio] = useState<Socio | null>(null);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [inventory, setInventory] = useState<Envase[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ [id: string]: number }>({});
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const initApp = useCallback(async () => {
    setLoading(true);
    try {
      const status = await gasService.getAppStatus();
      setAppStatus(status);
      
      const [allSocios, allItems] = await Promise.all([
        gasService.getSocios(),
        gasService.getInventario()
      ]);
      
      setSocios(allSocios);
      setInventory(allItems);
      
      if (status === AppStatus.CERRADO) {
        setView('MAINTENANCE');
      }
    } catch (err) {
      setError("Error de conexión. Verifica el ID de la hoja.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initApp();
  }, [initApp]);

  const handleLogin = (inputCode: string) => {
    setError(null);
    const code = String(inputCode || '').trim().toUpperCase();

    if (code === ADMIN_CODE) {
      setView('ADMIN');
      return;
    }

    const socio = socios.find(s => s.codigo.toUpperCase() === code);
    
    if (socio) {
      setCurrentSocio(socio);
      if (appStatus === AppStatus.CERRADO) {
        setView('MAINTENANCE');
      } else {
        setView('INVENTORY');
      }
    } else {
      setError(`Socio "${code}" no encontrado.`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const filteredInventoryByWarehouse = useMemo(() => {
    const socioWh = String(currentSocio?.poblacion || '').toUpperCase().trim();
    const exactMatch = inventory.filter(item => {
      const itemWh = String(item.almacen || '').toUpperCase().trim();
      return itemWh === socioWh;
    });
    const generalItems = inventory.filter(item => String(item.almacen || '').toUpperCase().trim() === 'GENERAL' || item.almacen === '');
    const combined = [...exactMatch, ...generalItems];
    return combined.length > 0 ? combined : inventory;
  }, [inventory, currentSocio]);

  const availableFamilies = useMemo(() => {
    const families = Array.from(new Set(filteredInventoryByWarehouse.map(item => (item.familia || 'GENERAL').toUpperCase())));
    return families.filter((f: string) => f && f.trim() !== '').sort();
  }, [filteredInventoryByWarehouse]);

  useEffect(() => {
    if (view === 'INVENTORY' && availableFamilies.length > 0 && !activeFamily) {
      setActiveFamily(availableFamilies[0]);
    }
  }, [view, availableFamilies, activeFamily]);

  const totalSelectedCount = useMemo(() => {
    return Object.values(selectedItems).reduce((a: number, b: number) => a + b, 0);
  }, [selectedItems]);

  const itemsToDisplay = useMemo(() => {
    if (!activeFamily) return [];
    if (activeFamily === 'DEV_REVIEW') {
      return inventory.filter(item => (selectedItems[item.codigo] || 0) > 0);
    }
    return filteredInventoryByWarehouse.filter(item => (item.familia || 'GENERAL').toUpperCase() === activeFamily);
  }, [filteredInventoryByWarehouse, inventory, activeFamily, selectedItems]);

  const getFamilyColor = (family: string | null) => {
    if (!family) return 'emerald';
    const f = family.toUpperCase();
    if (f.includes('CARNE')) return 'red';
    if (f.includes('FRUTA')) return 'green';
    if (f.includes('PALET')) return 'blue';
    if (family === 'DEV_REVIEW') return 'orange';
    return 'emerald';
  };

  const colorClasses = {
    red: { bg: 'bg-red-500', border: 'border-red-200', text: 'text-red-600', lightBg: 'bg-red-50', activeTab: 'bg-red-500 border-red-500 shadow-red-500/20' },
    green: { bg: 'bg-green-500', border: 'border-green-200', text: 'text-green-600', lightBg: 'bg-green-50', activeTab: 'bg-green-500 border-green-500 shadow-green-500/20' },
    blue: { bg: 'bg-blue-500', border: 'border-blue-200', text: 'text-blue-600', lightBg: 'bg-blue-50', activeTab: 'bg-blue-500 border-blue-500 shadow-blue-500/20' },
    emerald: { bg: 'bg-emerald-500', border: 'border-emerald-200', text: 'text-emerald-600', lightBg: 'bg-emerald-50', activeTab: 'bg-emerald-500 border-emerald-500 shadow-emerald-500/20' },
    orange: { bg: 'bg-orange-500', border: 'border-orange-200', text: 'text-orange-600', lightBg: 'bg-orange-50', activeTab: 'bg-orange-500 border-orange-500 shadow-orange-500/20' },
  };

  const currentColorSet = colorClasses[getFamilyColor(activeFamily)];

  const handleQuantityChange = (id: string, value: string) => {
    const num = parseInt(value) || 0;
    setSelectedItems(prev => ({ ...prev, [id]: Math.max(0, num) }));
  };

  const handleClearAll = () => {
    if (totalSelectedCount > 0 && confirm('¿Estás seguro de que quieres borrar toda la selección?')) {
      setSelectedItems({});
      if (activeFamily === 'DEV_REVIEW' && availableFamilies.length > 0) {
        setActiveFamily(availableFamilies[0]);
      }
    }
  };

  const removeItem = (id: string) => {
    setSelectedItems(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const handleSubmitReturn = async () => {
    if (!currentSocio) return;
    setLoading(true);
    try {
      const returnRows = Object.entries(selectedItems)
        .filter(([_, qty]) => (qty as number) > 0)
        .flatMap(([id, qty]) => {
          const q = qty as number;
          const item = inventory.find(i => i.codigo === id);
          return Array(q).fill({
            timestamp: new Date().toLocaleString(),
            socio: currentSocio.nombre,
            codigoSocio: currentSocio.codigo,
            envase: item?.nombre,
            codigoEnvase: item?.codigo,
            almacen: item?.almacen
          });
        });

      await gasService.registerReturn(returnRows);
      setSuccess(true);
      setSelectedItems({});
      setActiveFamily(availableFamilies[0]);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError("Error al registrar entrega.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && view === 'LOGIN') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Cargando...</p>
      </div>
    );
  }

  if (view === 'LOGIN') return <LoginView onLogin={handleLogin} error={error} />;
  if (view === 'MAINTENANCE') return <MaintenanceView onRetry={() => initApp()} />;
  if (view === 'ADMIN') return <AdminView appStatus={appStatus} onLogout={() => setView('LOGIN')} />;

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex flex-col text-slate-800 antialiased font-medium">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Boxes className="text-white" size={16} />
          </div>
          <h1 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">SISTEMA LOGÍSTICO</h1>
        </div>
        <button onClick={() => { setView('LOGIN'); setActiveFamily(null); setSelectedItems({}); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
          <LogOut size={18} />
        </button>
      </header>

      {/* Info Socio + Botón Total dev. */}
      <div className="bg-white px-4 py-4 border-b border-slate-100 shadow-sm relative z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                {currentSocio?.codigo}
              </span>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                {currentSocio?.nombre}
              </h2>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 opacity-70">
              {currentSocio?.poblacion || 'Socio Activo'}
            </p>
          </div>
          
          <button 
            onClick={() => setActiveFamily(activeFamily === 'DEV_REVIEW' ? availableFamilies[0] : 'DEV_REVIEW')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all shrink-0 ${
              activeFamily === 'DEV_REVIEW' 
              ? 'bg-orange-500 border-orange-400 text-white shadow-xl shadow-orange-500/20' 
              : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300 shadow-sm'
            }`}
          >
            <ShoppingCart size={14} className={activeFamily === 'DEV_REVIEW' ? 'text-white' : 'text-orange-500'} />
            <div className="flex flex-col items-start leading-none">
              <span className="text-[8px] font-black uppercase tracking-tighter opacity-80">Revisión</span>
              <span className="text-[13px] font-black tabular-nums">{totalSelectedCount}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Familias + Botón Borrar Todo */}
      <div className="bg-[#fcfdfe] border-b border-slate-100 sticky top-[138px] z-30 py-3 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {availableFamilies.map(fam => {
          const color = getFamilyColor(fam);
          const isActive = activeFamily === fam;
          return (
            <button
              key={fam}
              onClick={() => setActiveFamily(fam)}
              className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.1em] transition-all shrink-0 border ${
                isActive 
                ? `${colorClasses[color].activeTab} text-white shadow-lg` 
                : `bg-white border-slate-200 text-slate-500 hover:bg-slate-50`
              }`}
            >
              {fam}
            </button>
          );
        })}
        
        {/* Botón Borrar Todo */}
        <button
          onClick={handleClearAll}
          className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.1em] transition-all shrink-0 border flex items-center gap-2 ${
            totalSelectedCount > 0 
            ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100 shadow-sm' 
            : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          <Trash2 size={12} />
          BORRAR TODO
        </button>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-3 md:p-6 pb-28">
        {success && (
          <div className="mb-4 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="text-emerald-500" size={18} />
            <p className="text-emerald-900 font-black uppercase text-[10px] tracking-widest">Operación completada con éxito</p>
          </div>
        )}

        <div className={`bg-white rounded-3xl border ${currentColorSet.border} shadow-2xl shadow-slate-200/50 overflow-hidden`}>
          <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-4 bg-slate-50/30 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <div className="col-span-3">Código de Producto</div>
            <div className="col-span-6">{activeFamily === 'DEV_REVIEW' ? 'Resumen de Selección' : 'Descripción del Envase'}</div>
            <div className="col-span-3 text-center">Cantidad</div>
          </div>

          <div className="divide-y divide-slate-50">
            {itemsToDisplay.length > 0 ? itemsToDisplay.map(item => {
              const rawImg = (item.imagen || '').trim();
              const hasImage = rawImg.length > 5;
              const finalImgUrl = transformDriveUrl(rawImg);
              const isReviewMode = activeFamily === 'DEV_REVIEW';

              return (
                <div key={item.codigo} className={`grid grid-cols-12 gap-4 px-5 py-4 items-center transition-all ${ (selectedItems[item.codigo] || 0) > 0 ? `${currentColorSet.lightBg}/50` : 'hover:bg-slate-50/20' }`}>
                  
                  {/* Código + Producto Área Clicable */}
                  <div 
                    className="col-span-8 md:col-span-9 grid grid-cols-9 gap-2 items-center cursor-pointer group"
                    onClick={() => hasImage && setEnlargedImage(finalImgUrl)}
                  >
                    <div className="col-span-4 md:col-span-3">
                      <div className={`flex items-center gap-2 ${isReviewMode ? 'text-[9px]' : 'text-[12px]'} font-black ${currentColorSet.text} ${currentColorSet.lightBg} px-2 py-1.5 rounded-xl border ${currentColorSet.border} shadow-sm group-active:scale-95 transition-transform relative`}>
                        {hasImage ? (
                          <>
                            <ImageIcon size={isReviewMode ? 9 : 11} className="text-emerald-500 animate-pulse" />
                            <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-md"></div>
                          </>
                        ) : (
                          <ZoomIn size={9} className="opacity-20" />
                        )}
                        <span className="truncate">{item.codigo}</span>
                      </div>
                    </div>
                    
                    <div className="col-span-5 md:col-span-6">
                      <div className="flex flex-col gap-0.5">
                        <h3 className={`${isReviewMode ? 'text-[9px]' : 'text-[11px]'} font-black text-slate-800 uppercase leading-tight truncate group-hover:text-emerald-600 transition-colors`}>
                          {item.nombre}
                        </h3>
                        {!isReviewMode && (
                          <p className="text-[9px] text-slate-400 font-bold uppercase truncate leading-none mt-1.5 opacity-60">
                            {item.caracteristicas || 'Estándar'}
                          </p>
                        )}
                        {isReviewMode && hasImage && (
                          <span className="text-[7px] text-emerald-600 font-black uppercase tracking-tighter">Con imagen</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Controles de Cantidad */}
                  <div className="col-span-4 md:col-span-3 flex justify-end items-center gap-2">
                    <div className={`flex items-center bg-white rounded-2xl border ${currentColorSet.border} w-full max-w-[95px] shadow-sm overflow-hidden h-9`}>
                      <button 
                        onClick={() => setSelectedItems(prev => ({ ...prev, [item.codigo]: Math.max(0, ((prev[item.codigo] as number) || 0) - 1) }))} 
                        className={`w-8 h-full bg-slate-50 ${currentColorSet.text} flex items-center justify-center border-r ${currentColorSet.border} active:bg-slate-100 transition-colors`}
                      >
                        <Minus size={12} strokeWidth={4} />
                      </button>
                      
                      <input 
                        type="number"
                        value={selectedItems[item.codigo] || 0}
                        onChange={(e) => handleQuantityChange(item.codigo, e.target.value)}
                        className={`w-full bg-transparent text-center ${isReviewMode ? 'text-[11px]' : 'text-sm'} font-black text-slate-900 outline-none tabular-nums`}
                      />

                      <button 
                        onClick={() => setSelectedItems(prev => ({ ...prev, [item.codigo]: ((prev[item.codigo] as number) || 0) + 1 }))} 
                        className={`w-8 h-full bg-slate-50 ${currentColorSet.text} flex items-center justify-center border-l ${currentColorSet.border} active:bg-slate-100 transition-colors`}
                      >
                        <Plus size={12} strokeWidth={4} />
                      </button>
                    </div>
                    {isReviewMode && (
                      <button onClick={() => removeItem(item.codigo)} className="text-slate-300 hover:text-red-500 p-1.5 transition-colors">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="py-24 text-center">
                <Package className="mx-auto text-slate-200 mb-3" size={48} />
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest opacity-50">Lista vacía</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Fijo */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 py-5 shadow-[0_-15px_40px_rgba(0,0,0,0.04)] z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
             <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Unidades totales</p>
             <p className="text-3xl font-black text-slate-900 tabular-nums leading-none">
                {totalSelectedCount} 
                <span className="text-[11px] text-slate-400 font-black ml-2 uppercase">Uds.</span>
             </p>
          </div>
          
          {activeFamily === 'DEV_REVIEW' ? (
            <button 
              disabled={loading || totalSelectedCount === 0} 
              onClick={handleSubmitReturn} 
              className="px-10 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-100 disabled:text-slate-300 rounded-[1.25rem] text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-orange-500/30 transition-all flex items-center gap-3 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Registrar
            </button>
          ) : (
            <button 
              onClick={() => setActiveFamily('DEV_REVIEW')}
              disabled={totalSelectedCount === 0}
              className="px-8 py-4 bg-slate-900 hover:bg-black disabled:bg-slate-50 disabled:text-slate-200 rounded-[1.25rem] text-white font-black uppercase text-[11px] tracking-widest shadow-xl transition-all flex items-center gap-3 group active:scale-95"
            >
              Revisar <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </footer>

      {/* Modal de Imagen */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200"
          onClick={() => setEnlargedImage(null)}
        >
          <button className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 p-3 bg-white rounded-full shadow-xl border border-slate-100 transition-all hover:scale-110 active:scale-90">
            <X size={24} />
          </button>
          <div className="relative group max-w-full max-h-[80vh]">
            <img 
              src={enlargedImage} 
              alt="Imagen del envase" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Si falla el thumbnail por alguna razón de privacidad de Drive
                if (enlargedImage.includes('thumbnail')) {
                   // Reintentamos con el uc de emergencia por si acaso
                   const id = enlargedImage.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
                   if (id) target.src = `https://drive.google.com/uc?export=view&id=${id}`;
                } else {
                  target.src = 'https://placehold.co/600x400?text=Error+de+Carga';
                }
              }}
              className="max-w-full max-h-[80vh] object-contain rounded-[2.5rem] shadow-2xl border-8 border-white animate-in zoom-in-95 duration-300"
            />
            <div className="absolute -bottom-10 left-0 right-0 text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toque fuera para cerrar</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LoginView = ({ onLogin, error }: any) => {
  const [code, setCode] = useState('');
  return (
    <div className="min-h-screen bg-[#fcfdfe] flex items-center justify-center p-6">
      <div className="max-w-xs w-full space-y-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-8 transform rotate-3 hover:rotate-0 transition-transform">
            <Boxes className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none mb-3">ACCESO</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em] opacity-80">Logística de Envases</p>
        </div>
        <div className="bg-white border border-slate-100 p-10 rounded-[3rem] space-y-8 shadow-2xl shadow-slate-200/40">
          <div className="space-y-3 text-center">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código Identificador</label>
            <input 
              type="text" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && onLogin(code)} 
              placeholder="0000" 
              className="w-full px-4 py-5 bg-slate-50/50 border border-slate-100 rounded-3xl text-slate-900 font-black uppercase text-center text-2xl tracking-[0.2em] focus:border-emerald-400 focus:bg-white outline-none transition-all placeholder:text-slate-200" 
            />
          </div>
          {error && <div className="text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-50 py-4 rounded-2xl text-center border border-red-100 animate-shake">{error}</div>}
          <button onClick={() => onLogin(code)} className="w-full py-5 bg-emerald-500 text-white font-black uppercase text-[11px] tracking-widest rounded-3xl shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 group active:scale-95">
            Entrar al Sistema <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

const MaintenanceView = ({ onRetry }: any) => (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center p-12 text-center space-y-8">
    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
      <Settings className="text-emerald-500 animate-spin" size={40} />
    </div>
    <div className="space-y-3">
      <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Sincronizando</h1>
      <p className="text-slate-400 text-[12px] font-bold uppercase max-w-xs leading-relaxed tracking-wider">El sistema se está actualizando con el inventario central</p>
    </div>
    <button onClick={onRetry} className="px-12 py-4 bg-emerald-50 text-emerald-600 rounded-3xl font-black uppercase text-[11px] tracking-widest border border-emerald-100 transition-all hover:bg-emerald-100 active:scale-95 shadow-sm">Reconectar ahora</button>
  </div>
);

const AdminView = ({ appStatus, onLogout }: any) => (
  <div className="min-h-screen bg-[#fcfdfe] p-8 flex flex-col items-center justify-center">
    <div className="bg-white border border-slate-100 p-12 rounded-[3.5rem] w-full max-w-xs space-y-10 shadow-2xl shadow-slate-200/50 text-center">
      <div className="space-y-2">
        <h2 className="text-slate-900 font-black uppercase tracking-[0.2em] text-[11px]">ADMINISTRACIÓN</h2>
        <div className="w-8 h-1 bg-emerald-500 mx-auto rounded-full opacity-30"></div>
      </div>
      <div className="flex items-center justify-between bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicio</span>
        <div className="flex items-center gap-2">
           <div className={`w-2.5 h-2.5 rounded-full ${appStatus === AppStatus.ABIERTO ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'}`}></div>
           <span className="text-slate-800 font-black uppercase text-[12px]">{appStatus}</span>
        </div>
      </div>
      <button onClick={onLogout} className="w-full py-5 bg-slate-50 text-slate-500 rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-100 border border-slate-100 transition-all active:scale-95">Regresar</button>
    </div>
  </div>
);

export default App;
