
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Loader2, LogOut, Settings, Package, CheckCircle2, ChevronRight, Boxes, Plus, Minus, X, ZoomIn, ShoppingCart, ArrowRight, Trash2, Image as ImageIcon, PenTool, Share2, AlertTriangle, Info
} from 'lucide-react';
import { Socio, Envase, AppStatus, ViewState } from './types';
import { gasService } from './services/gasService';
import { jsPDF } from 'jspdf';

const ADMIN_CODE = "ADMIN99"; 
const MAX_QTY = 60;
const WARNING_QTY = 20;

const transformDriveUrl = (url: string): string => {
  if (!url) return '';
  if (url.length === 33 && !url.includes('http')) {
    return `https://drive.google.com/thumbnail?id=${url}&sz=w1000`;
  }
  if (!url.includes('drive.google.com')) return url;
  try {
    const match = url.match(/\/(?:d|file\/d|open\?id=)\/([a-zA-Z0-9_-]+)/);
    const fileId = match ? match[1] : null;
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : url;
  } catch (e) { return url; }
};

// Componente de Firma Digital
const SignaturePad: React.FC<{ label: string; onSave: (data: string) => void; onClear: () => void }> = ({ label, onSave, onClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL());
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onClear();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        {!isEmpty && (
          <button onClick={clear} className="text-[10px] font-black text-red-500 uppercase tracking-tighter hover:text-red-700 transition-colors">Borrar Firma</button>
        )}
      </div>
      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-[2.5rem] overflow-hidden relative group">
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[220px] cursor-crosshair"
        />
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
            <PenTool size={40} className="text-slate-400 mb-2" />
            <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Firma obligatoria</span>
          </div>
        )}
      </div>
    </div>
  );
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

  const [carrierName, setCarrierName] = useState('');
  const [socioSignature, setSocioSignature] = useState('');
  const [carrierSignature, setCarrierSignature] = useState('');

  const initApp = useCallback(async () => {
    setLoading(true);
    try {
      const status = await gasService.getAppStatus();
      setAppStatus(status);
      const [allSocios, allItems] = await Promise.all([gasService.getSocios(), gasService.getInventario()]);
      setSocios(allSocios);
      setInventory(allItems);
      if (status === AppStatus.CERRADO) setView('MAINTENANCE');
    } catch (err) { setError("Error de conexión."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { initApp(); }, [initApp]);

  const handleLogin = (inputCode: string) => {
    setError(null);
    const code = String(inputCode || '').trim().toUpperCase();
    if (code === ADMIN_CODE) { setView('ADMIN'); return; }
    const socio = socios.find(s => s.codigo.toUpperCase() === code);
    if (socio) {
      setCurrentSocio(socio);
      appStatus === AppStatus.CERRADO ? setView('MAINTENANCE') : setView('INVENTORY');
    } else {
      setError(`Socio "${code}" no encontrado.`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const filteredInventoryByWarehouse = useMemo(() => {
    const socioWh = String(currentSocio?.poblacion || '').toUpperCase().trim();
    const exactMatch = inventory.filter(item => (item.almacen || '').toUpperCase().trim() === socioWh);
    const generalItems = inventory.filter(item => (item.almacen || '').toUpperCase().trim() === 'GENERAL' || !item.almacen);
    return exactMatch.length > 0 ? [...exactMatch, ...generalItems] : inventory;
  }, [inventory, currentSocio]);

  const availableFamilies = useMemo(() => {
    const families = Array.from(new Set(filteredInventoryByWarehouse.map(item => (item.familia || 'GENERAL').toUpperCase())));
    return (families as string[]).filter(f => f && f.trim() !== '').sort();
  }, [filteredInventoryByWarehouse]);

  useEffect(() => {
    if (view === 'INVENTORY' && availableFamilies.length > 0 && !activeFamily) setActiveFamily(availableFamilies[0]);
  }, [view, availableFamilies, activeFamily]);

  const totalSelectedCount = useMemo(() => Object.values(selectedItems).reduce((a: number, b: number) => a + b, 0), [selectedItems]);

  const itemsToDisplay = useMemo(() => {
    if (!activeFamily) return [];
    if (activeFamily === 'DEV_REVIEW') return inventory.filter(item => (selectedItems[item.codigo] || 0) > 0);
    return filteredInventoryByWarehouse.filter(item => (item.familia || 'GENERAL').toUpperCase() === activeFamily);
  }, [filteredInventoryByWarehouse, inventory, activeFamily, selectedItems]);

  const handleQuantityChange = (id: string, value: string) => {
    let num = parseInt(value) || 0;
    if (num > MAX_QTY) {
      setError(`El límite máximo es de ${MAX_QTY} unidades por producto.`);
      setTimeout(() => setError(null), 3000);
      num = MAX_QTY;
    }
    setSelectedItems(prev => ({ ...prev, [id]: Math.max(0, Math.floor(num)) }));
  };

  const removeItem = (id: string) => {
    setSelectedItems(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const generateAndSharePDF = async () => {
    if (!currentSocio) return;
    const doc = new jsPDF();
    const now = new Date();
    
    // Formateo exacto solicitado para el nombre del archivo
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    const formattedDateTime = `${day}_${month}_${year} ${hours}:${minutes}`;
    const fileName = `Env. ${formattedDateTime} socio ${currentSocio.codigo} ${currentSocio.nombre}.pdf`.replace(/[/\\?%*:|"<>]/g, '-');

    // Construcción del PDF
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text("ALBARÁN DE DEVOLUCIÓN", 20, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha: ${now.toLocaleDateString()} - ${now.toLocaleTimeString()}`, 20, 40);
    doc.line(20, 45, 190, 45);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL SOCIO", 20, 55);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Nombre: ${currentSocio.nombre}`, 20, 62);
    doc.text(`Código: ${currentSocio.codigo}`, 20, 67);
    doc.text(`Población: ${currentSocio.poblacion || 'No especificada'}`, 20, 72);

    doc.setFont("helvetica", "bold");
    doc.text("TRANSPORTISTA", 120, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${carrierName}`, 120, 62);

    doc.setFont("helvetica", "bold");
    doc.text("DETALLE DE ENVASES", 20, 85);
    doc.line(20, 87, 190, 87);
    
    let y = 95;
    doc.text("CÓDIGO", 20, y);
    doc.text("DESCRIPCIÓN", 50, y);
    doc.text("CANTIDAD", 160, y);
    y += 5;
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    const reviewItems = inventory.filter(item => (selectedItems[item.codigo] || 0) > 0);
    reviewItems.forEach(item => {
      doc.text(item.codigo, 20, y);
      doc.text(item.nombre.substring(0, 45), 50, y);
      doc.text(selectedItems[item.codigo].toString(), 165, y);
      y += 8;
    });

    doc.line(20, y, 190, y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL UNIDADES:", 130, y);
    doc.text(totalSelectedCount.toString(), 165, y);

    y = 210;
    doc.setFontSize(10);
    doc.text("Firma del Socio", 20, y);
    doc.text("Firma del Transportista", 120, y);
    
    if (socioSignature) doc.addImage(socioSignature, 'PNG', 20, y + 5, 60, 30);
    if (carrierSignature) doc.addImage(carrierSignature, 'PNG', 120, y + 5, 60, 30);

    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: 'Albarán Devolución de Envases',
          text: `Documento de devolución para ${currentSocio.nombre}`
        });
      } catch (err) { console.error("Error compartiendo:", err); }
    } else {
      doc.save(fileName);
    }
  };

  const handleSubmitReturn = async () => {
    if (!currentSocio || !carrierName || !socioSignature || !carrierSignature) {
      setError("Faltan firmas o nombre del transportista.");
      return;
    }
    setLoading(true);
    try {
      const returnRows = (Object.entries(selectedItems) as [string, number][])
        .filter(([_, qty]) => qty > 0)
        .flatMap(([id, qty]) => {
          const item = inventory.find(i => i.codigo === id);
          return Array(qty).fill({
            timestamp: new Date().toLocaleString(),
            socio: currentSocio.nombre,
            codigoSocio: currentSocio.codigo,
            envase: item?.nombre,
            codigoEnvase: item?.codigo,
            almacen: item?.almacen,
            transportista: carrierName
          });
        });

      await gasService.registerReturn(returnRows);
      await generateAndSharePDF();
      setSuccess(true);
      setSelectedItems({});
      setCarrierName('');
      setSocioSignature('');
      setCarrierSignature('');
      setActiveFamily(availableFamilies[0]);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) { setError("Error al registrar."); }
    finally { setLoading(false); }
  };

  if (loading && view === 'LOGIN') return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
      <p className="text-slate-400 font-black uppercase tracking-widest text-[9px]">Cargando...</p>
    </div>
  );

  if (view === 'LOGIN') return <LoginView onLogin={handleLogin} error={error} />;
  if (view === 'MAINTENANCE') return <MaintenanceView onRetry={() => initApp()} />;
  if (view === 'ADMIN') return <AdminView appStatus={appStatus} onLogout={() => setView('LOGIN')} />;

  const isReviewMode = activeFamily === 'DEV_REVIEW';

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex flex-col text-slate-800 antialiased font-medium">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/10"><Boxes className="text-white" size={16} /></div>
          <h1 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">SISTEMA LOGÍSTICO</h1>
        </div>
        <button onClick={() => setView('LOGIN')} className="p-2 text-slate-400 hover:text-red-500"><LogOut size={18} /></button>
      </header>

      <div className="bg-white px-4 py-4 border-b border-slate-100 shadow-sm relative z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">{currentSocio?.codigo}</span>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{currentSocio?.nombre}</h2>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 opacity-70">{currentSocio?.poblacion || 'Socio Activo'}</p>
          </div>
          <button onClick={() => setActiveFamily(isReviewMode ? availableFamilies[0] : 'DEV_REVIEW')} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all ${isReviewMode ? 'bg-orange-500 text-white shadow-orange-500/20' : 'bg-white text-slate-600 shadow-sm'}`}>
            <ShoppingCart size={14} />
            <div className="flex flex-col items-start leading-none">
              <span className="text-[8px] font-black uppercase opacity-80">Revisión</span>
              <span className="text-[13px] font-black tabular-nums">{totalSelectedCount}</span>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-[#fcfdfe] border-b border-slate-100 sticky top-[125px] z-30 py-3 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {availableFamilies.map(fam => (
          <button key={fam} onClick={() => setActiveFamily(fam)} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase transition-all shrink-0 border ${activeFamily === fam ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{fam}</button>
        ))}
        <button onClick={() => totalSelectedCount > 0 && confirm('¿Borrar selección?') && setSelectedItems({})} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase shrink-0 border flex items-center gap-2 ${totalSelectedCount > 0 ? 'bg-red-50 text-red-500 border-red-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}><Trash2 size={12} /> BORRAR</button>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-3 md:p-6 pb-28">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="text-red-500 shrink-0" size={18} />
            <p className="text-red-900 font-black uppercase text-[10px] tracking-widest">{error}</p>
          </div>
        )}
        
        {success && <div className="mb-4 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3"><CheckCircle2 className="text-emerald-500 shrink-0" /> <p className="text-emerald-900 font-black uppercase text-[10px]">Operación completada y PDF generado</p></div>}
        
        {/* Aviso de Reglas de Cantidad */}
        <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-2xl p-3 flex items-start gap-3">
          <Info className="text-blue-500 shrink-0 mt-0.5" size={14} />
          <p className="text-[10px] font-bold text-blue-700 uppercase leading-relaxed tracking-wider">
            Límite de <span className="font-black underline">60 unidades</span> por producto. 
            Aviso de verificación automático si supera las <span className="font-black underline">20 unidades</span>.
          </p>
        </div>

        {isReviewMode && (
          <div className="mb-6 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl space-y-10">
             <div className="space-y-6">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><PenTool size={14} /> Validación y Firmas</h3>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre del Transportista</label>
                  <input 
                    type="text" 
                    value={carrierName} 
                    onChange={(e) => setCarrierName(e.target.value)} 
                    placeholder="Introduzca nombre del chofer"
                    className="w-full px-5 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-[14px] font-black outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all placeholder:text-slate-300"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <SignaturePad label="Firma del Socio" onSave={setSocioSignature} onClear={() => setSocioSignature('')} />
                  <SignaturePad label="Firma del Transportista" onSave={setCarrierSignature} onClear={() => setCarrierSignature('')} />
                </div>
             </div>
          </div>
        )}

        <div className={`bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden`}>
          <div className="divide-y divide-slate-50">
            {itemsToDisplay.length > 0 ? itemsToDisplay.map(item => {
              const hasImage = (item.imagen || '').trim().length > 5;
              const finalImgUrl = transformDriveUrl(item.imagen || '');
              const currentQty = selectedItems[item.codigo] || 0;
              
              return (
                <div key={item.codigo} className={`grid grid-cols-12 gap-4 px-5 py-4 items-center transition-all ${ currentQty > 0 ? `bg-emerald-50/50` : '' }`}>
                  <div className="col-span-8 md:col-span-9 grid grid-cols-9 gap-2 items-center cursor-pointer group" onClick={() => hasImage && setEnlargedImage(finalImgUrl)}>
                    <div className="col-span-4 md:col-span-3">
                      <div className={`flex items-center gap-2 ${isReviewMode ? 'text-[9px]' : 'text-[12px]'} font-black text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-xl border border-emerald-100 relative shadow-sm`}>
                        {hasImage ? <ImageIcon size={isReviewMode ? 9 : 11} className="animate-pulse" /> : <ZoomIn size={9} className="opacity-20" />}
                        <span className="truncate">{item.codigo}</span>
                      </div>
                    </div>
                    <div className="col-span-5 md:col-span-6">
                      <h3 className={`${isReviewMode ? 'text-[9px]' : 'text-[11px]'} font-black text-slate-800 uppercase leading-tight truncate`}>{item.nombre}</h3>
                      {!isReviewMode && <p className="text-[9px] text-slate-400 font-bold uppercase truncate mt-1 opacity-60">{item.caracteristicas || 'Estándar'}</p>}
                    </div>
                  </div>
                  <div className="col-span-4 md:col-span-3 flex justify-end items-center gap-2">
                    <div className="flex flex-col items-center gap-1.5 w-full max-w-[95px]">
                      <div className={`flex items-center bg-white rounded-2xl border transition-colors ${currentQty > WARNING_QTY ? 'border-orange-300 ring-2 ring-orange-50' : 'border-slate-200'} w-full h-9 overflow-hidden shadow-sm`}>
                        <button onClick={() => handleQuantityChange(item.codigo, (currentQty - 1).toString())} className="w-8 h-full bg-slate-50 text-emerald-600 flex items-center justify-center border-r border-slate-200 active:bg-slate-100"><Minus size={12} strokeWidth={4} /></button>
                        <input 
                          type="number" 
                          step="1"
                          pattern="\d*"
                          value={currentQty || 0} 
                          onChange={(e) => handleQuantityChange(item.codigo, e.target.value)} 
                          className={`w-full bg-transparent text-center ${isReviewMode ? 'text-[11px]' : 'text-sm'} font-black outline-none tabular-nums`} 
                        />
                        <button onClick={() => handleQuantityChange(item.codigo, (currentQty + 1).toString())} className="w-8 h-full bg-slate-50 text-emerald-600 flex items-center justify-center border-l border-slate-200 active:bg-slate-100"><Plus size={12} strokeWidth={4} /></button>
                      </div>
                      {currentQty > WARNING_QTY && (
                        <div className="flex items-center gap-1 animate-pulse">
                          <AlertTriangle size={8} className="text-orange-500" />
                          <span className="text-[7px] font-black text-orange-600 uppercase tracking-tighter">¿CANTIDAD OK?</span>
                        </div>
                      )}
                    </div>
                    {isReviewMode && <button onClick={() => removeItem(item.codigo)} className="text-slate-300 hover:text-red-500 p-1.5 transition-colors"><X size={18} /></button>}
                  </div>
                </div>
              );
            }) : <div className="py-24 text-center"><Package className="mx-auto text-slate-200 mb-3" size={48} /><p className="text-slate-400 font-black uppercase text-[10px]">Lista vacía</p></div>}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 py-5 shadow-2xl z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
             <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Unidades totales</p>
             <p className="text-3xl font-black text-slate-900 tabular-nums leading-none">{totalSelectedCount} <span className="text-[11px] text-slate-400 font-black ml-1 uppercase">Uds.</span></p>
          </div>
          {isReviewMode ? (
            <button 
              disabled={loading || totalSelectedCount === 0 || !carrierName || !socioSignature || !carrierSignature} 
              onClick={handleSubmitReturn} 
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-300 rounded-[1.25rem] text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/30 flex items-center gap-3 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Share2 size={18} />}
              Registrar y Compartir PDF
            </button>
          ) : (
            <button onClick={() => setActiveFamily('DEV_REVIEW')} disabled={totalSelectedCount === 0} className="px-10 py-4 bg-slate-900 text-white rounded-[1.25rem] font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all">Revisar <ArrowRight size={16} /></button>
          )}
        </div>
      </footer>

      {enlargedImage && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setEnlargedImage(null)}>
          <button className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 p-3 bg-white rounded-full shadow-xl"><X size={24} /></button>
          <img src={enlargedImage} alt="Imagen" className="max-w-full max-h-[80vh] object-contain rounded-[2.5rem] shadow-2xl border-8 border-white" />
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
          <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-8"><Boxes className="text-white" size={40} /></div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none mb-3">ACCESO</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em]">Logística de Envases</p>
        </div>
        <div className="bg-white border border-slate-100 p-10 rounded-[3rem] space-y-8 shadow-2xl shadow-slate-200/40">
          <div className="space-y-3 text-center">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código Identificador</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onLogin(code)} placeholder="0000" className="w-full px-4 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-slate-900 font-black uppercase text-center text-2xl tracking-[0.2em] focus:border-emerald-400 focus:bg-white outline-none" />
          </div>
          {error && <div className="text-red-500 text-[10px] font-black uppercase tracking-widest bg-red-50 py-4 rounded-2xl text-center border border-red-100">{error}</div>}
          <button onClick={() => onLogin(code)} className="w-full py-5 bg-emerald-500 text-white font-black uppercase text-[11px] tracking-widest rounded-3xl shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3">Entrar al Sistema <ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  );
};

const MaintenanceView = ({ onRetry }: any) => (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center p-12 text-center space-y-8">
    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100"><Settings className="text-emerald-500 animate-spin" size={40} /></div>
    <div className="space-y-3"><h1 className="text-3xl font-black text-slate-900 uppercase">Sincronizando</h1><p className="text-slate-400 text-[12px] font-bold uppercase max-w-xs leading-relaxed">El sistema se está actualizando con el inventario central</p></div>
    <button onClick={onRetry} className="px-12 py-4 bg-emerald-50 text-emerald-600 rounded-3xl font-black uppercase text-[11px] tracking-widest border border-emerald-100">Reconectar ahora</button>
  </div>
);

const AdminView = ({ appStatus, onLogout }: any) => (
  <div className="min-h-screen bg-[#fcfdfe] p-8 flex flex-col items-center justify-center">
    <div className="bg-white border border-slate-100 p-12 rounded-[3.5rem] w-full max-w-xs space-y-10 shadow-2xl text-center">
      <h2 className="text-slate-900 font-black uppercase tracking-[0.2em] text-[11px]">ADMINISTRACIÓN</h2>
      <div className="flex items-center justify-between bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicio</span>
        <div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${appStatus === AppStatus.ABIERTO ? 'bg-emerald-500' : 'bg-red-500'}`}></div><span className="text-slate-800 font-black uppercase text-[12px]">{appStatus}</span></div>
      </div>
      <button onClick={onLogout} className="w-full py-5 bg-slate-50 text-slate-500 rounded-[2rem] font-black uppercase text-[11px] border border-slate-100">Regresar</button>
    </div>
  </div>
);

export default App;
