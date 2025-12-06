import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ProjectState } from '../types';
import { Video, Users, MapPin, PenTool, Printer, X, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from './UIComponents';

interface Props {
  data: ProjectState;
  onClose: () => void;
}

export const Step9_PitchDeck: React.FC<Props> = ({ data, onClose }) => {
    const [isPrinting, setIsPrinting] = useState(false);

    // 1. Setup Portal Container
    const [container] = useState(() => {
        const el = document.createElement('div');
        el.id = 'pitch-deck-portal-root';
        return el;
    });

    useEffect(() => {
        document.body.appendChild(container);
        document.body.style.overflow = 'auto'; // Force scrolling
        return () => {
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
            document.body.style.overflow = ''; // Restore
        };
    }, [container]);

    const handlePrint = () => {
        setIsPrinting(true);
        
        // Safety timeout: Reset state if print dialog blocks or fails
        const safetyTimeout = setTimeout(() => {
            setIsPrinting(false);
        }, 5000);

        // Small delay to ensure UI updates and browser render cycle completes
        setTimeout(() => {
            try {
                window.print();
            } catch (e) {
                console.error("Print failed:", e);
                alert("Failed to open print dialog. Please try browser menu.");
            } finally {
                clearTimeout(safetyTimeout);
                setIsPrinting(false);
            }
        }, 800);
    };

    const idea = data.ideas.find(i => i.id === data.selectedIdeaId);
    if (!idea) return <div className="p-10">No idea selected. Please generate an idea first.</div>;

    // 2. Render content into Portal
    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-white overflow-y-auto text-black font-['Poppins']">
            <style>{`
                /* Hides the main app so only the deck is visible */
                #root { display: none !important; }
                
                /* Print specific overrides */
                @media print {
                    @page { margin: 0; size: auto; }
                    body { margin: 0; padding: 0; background: white; }
                    #pitch-deck-portal-root { 
                        display: block !important; 
                        position: static !important; 
                        overflow: visible !important; 
                        width: 100% !important;
                        height: auto !important;
                    }
                    .no-print { display: none !important; }
                    .break-after-page { page-break-after: always; }
                    .break-inside-avoid { page-break-inside: avoid; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>

            {/* Toolbar - Hidden in Print */}
            <div className="fixed top-6 right-6 z-[100] flex gap-3 no-print">
                 <Button 
                    onClick={handlePrint} 
                    variant="accent" 
                    className="flex items-center gap-2 shadow-2xl transition-transform active:scale-95 bg-blue-600 hover:bg-blue-700 text-white border-none py-3 px-6 text-sm"
                    disabled={isPrinting}
                 >
                    {isPrinting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                    {isPrinting ? 'Preparing...' : 'Export PDF'}
                 </Button>

                 <Button 
                    onClick={onClose} 
                    variant="secondary" 
                    className="flex items-center gap-2 shadow-2xl transition-transform active:scale-95 bg-neutral-900 text-white hover:bg-black border-none py-3 px-6 text-sm"
                 >
                    <ArrowLeft size={18} /> Back to Editor
                 </Button>
            </div>

            <div className="max-w-[1200px] mx-auto min-h-screen bg-white shadow-2xl my-0 print:shadow-none print:w-full print:max-w-none">
                
                {/* 1. COVER PAGE */}
                <div className="h-screen relative flex flex-col justify-end p-20 break-after-page bg-black text-white print:h-[100vh]">
                    <div className="absolute inset-0 z-0">
                         {/* Dynamic Background Collage */}
                        <div className="grid grid-cols-2 h-full opacity-60">
                             {data.locations[0]?.image && <img src={data.locations[0].image.url} className="w-full h-full object-cover" />}
                             {data.subjects[0]?.image && <img src={data.subjects[0].image.url} className="w-full h-full object-cover grayscale" />}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                    </div>
                    
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-4 text-blue-500 mb-4">
                             <Video size={48} />
                             <span className="text-xl font-bold tracking-widest uppercase">Director's Treatment</span>
                        </div>
                        <h1 className="text-9xl font-black uppercase tracking-tighter leading-none">{data.productName}</h1>
                        <p className="text-4xl font-light text-neutral-300">{idea.title}</p>
                        
                        <div className="flex gap-12 mt-12 border-t border-neutral-700 pt-8 text-sm font-bold uppercase tracking-widest text-neutral-500">
                             <div>Duration: {data.duration}s</div>
                             <div>Tone: {data.tags.slice(0, 3).join(' / ')}</div>
                        </div>
                    </div>
                </div>

                {/* 2. SYNOPSIS & VISION */}
                <div className="min-h-screen grid grid-cols-12 break-after-page print:min-h-[100vh]">
                    <div className="col-span-4 bg-neutral-100 p-16 flex flex-col justify-center border-r border-neutral-200">
                        <h2 className="text-5xl font-black uppercase mb-12 text-black leading-tight">The<br/><span className="text-blue-600">Vision</span></h2>
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Logline</h3>
                                <p className="text-lg leading-relaxed text-black">{idea.synopsis}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Director's Approach</h3>
                                <p className="text-sm text-neutral-600 leading-relaxed font-mono border-l-2 border-blue-600 pl-4">{data.globalPrompt}</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-8 p-16 flex flex-col justify-center bg-white">
                         <div className="grid grid-cols-2 gap-4">
                             {data.lookSettings.styleReferences.slice(0, 4).map((ref, i) => (
                                 <div key={i} className="aspect-video bg-neutral-100 overflow-hidden">
                                     <img src={ref.url} className="w-full h-full object-cover" />
                                 </div>
                             ))}
                             {data.lookSettings.styleReferences.length === 0 && (
                                 <div className="col-span-2 h-64 flex items-center justify-center text-neutral-400 italic border border-neutral-200 bg-neutral-50">
                                     No Mood References Uploaded
                                 </div>
                             )}
                         </div>
                         <div className="mt-8 flex justify-between text-xs font-mono text-neutral-500 border-t border-neutral-200 pt-4">
                             <span>CAM: {data.lookSettings.camera}</span>
                             <span>LENS: {data.lookSettings.lens}</span>
                             <span>FILM: {data.lookSettings.film}</span>
                         </div>
                    </div>
                </div>

                {/* 3. VISUALS (Cast & Locs) */}
                <div className="min-h-screen p-16 bg-white break-after-page print:min-h-[100vh]">
                    <h2 className="text-6xl font-black uppercase mb-16 text-black"><span className="text-blue-600">World</span> Building</h2>
                    
                    <div className="grid grid-cols-2 gap-20">
                         {/* Cast */}
                         <div>
                             <div className="flex items-center gap-4 mb-8 border-b border-neutral-200 pb-4">
                                <Users size={32} className="text-blue-600"/>
                                <h3 className="text-2xl font-bold uppercase tracking-wider text-black">Key Talent</h3>
                             </div>
                             <div className="space-y-12">
                                 {data.subjects.filter(s => s.image).map(s => (
                                     <div key={s.id} className="flex gap-6 items-start break-inside-avoid">
                                         <div className="w-40 shrink-0 aspect-[3/4] overflow-hidden bg-neutral-100">
                                             <img src={s.image!.url} className="w-full h-full object-cover" />
                                         </div>
                                         <div>
                                             <h4 className="text-xl font-bold mb-2 text-black">{s.name}</h4>
                                             <p className="text-sm text-neutral-600 leading-relaxed mb-4">{s.description}</p>
                                             <div className="text-[10px] bg-neutral-100 text-neutral-500 p-2 rounded font-mono border border-neutral-200">
                                                 {s.visualDetails}
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>

                         {/* Locs */}
                         <div>
                             <div className="flex items-center gap-4 mb-8 border-b border-neutral-200 pb-4">
                                <MapPin size={32} className="text-green-600"/>
                                <h3 className="text-2xl font-bold uppercase tracking-wider text-black">Locations</h3>
                             </div>
                             <div className="space-y-12">
                                 {data.locations.filter(l => l.image).map(l => (
                                     <div key={l.id} className="space-y-4 break-inside-avoid">
                                         <div className="w-full aspect-video overflow-hidden bg-neutral-100">
                                             <img src={l.image!.url} className="w-full h-full object-cover" />
                                         </div>
                                         <div>
                                             <h4 className="text-xl font-bold mb-1 text-black">{l.name}</h4>
                                             <div className="flex gap-2 text-xs font-bold uppercase text-neutral-500 mb-2">
                                                 <span>{l.timeOfDay}</span>
                                                 <span>•</span>
                                                 <span>{l.weather}</span>
                                             </div>
                                             <p className="text-sm text-neutral-600 leading-relaxed">{l.description}</p>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                    </div>
                </div>

                {/* 4. STORYBOARD */}
                <div className="min-h-screen p-16 bg-white break-after-page print:min-h-0">
                    <h2 className="text-6xl font-black uppercase mb-16 text-black">The <span className="text-blue-600">Storyboard</span></h2>
                    
                    <div className="grid grid-cols-1 gap-12">
                         {data.shots.filter(s => s.image).map((shot) => (
                             <div key={shot.id} className="flex gap-8 border-b-2 border-neutral-100 pb-12 break-inside-avoid">
                                 <div className="w-16 shrink-0 text-4xl font-black text-neutral-300">
                                     {String(shot.number).padStart(2, '0')}
                                 </div>
                                 <div className="w-1/2">
                                     <div className="aspect-video bg-neutral-100 overflow-hidden shadow-lg border border-neutral-200">
                                         <img src={shot.image!.url} className="w-full h-full object-cover" />
                                     </div>
                                 </div>
                                 <div className="w-1/2 pt-2">
                                     <h4 className="text-xl font-bold uppercase mb-4 text-black">{shot.shotComposition}</h4>
                                     <p className="text-lg leading-relaxed mb-6 font-medium text-neutral-800">{shot.description}</p>
                                     <div className="grid grid-cols-2 gap-y-2 text-xs text-neutral-500 font-mono">
                                         <div><strong className="text-black">ACTION:</strong> {shot.action}</div>
                                         <div><strong className="text-black">MOVE:</strong> {shot.cameraMove}</div>
                                         <div><strong className="text-black">LENS:</strong> {shot.lens}</div>
                                     </div>
                                 </div>
                             </div>
                         ))}
                    </div>
                </div>

                 {/* 5. SKETCHES */}
                 {data.storyboardSketches.length > 0 && (
                    <div className="min-h-screen p-16 bg-neutral-50 text-black">
                        <div className="flex items-center gap-4 mb-16">
                            <PenTool size={48} className="text-neutral-400"/>
                            <h2 className="text-6xl font-black uppercase text-black">Rough Sketches</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8">
                             {data.storyboardSketches.map(sketch => (
                                 <div key={sketch.id} className="bg-white p-4 shadow-xl border border-neutral-200 break-inside-avoid">
                                     <img src={sketch.url} className="w-full" />
                                     <div className="text-center font-mono text-sm text-neutral-400 mt-4 uppercase tracking-widest">{sketch.shotRange}</div>
                                 </div>
                             ))}
                        </div>
                    </div>
                 )}
            </div>
        </div>,
        container
    );
};