import React, { useState } from 'react';
import { ProjectState, Shot } from '../types';
import { Button, Card, Spinner, PromptModal, TextArea, Input } from './UIComponents';
import { generateShotList, buildShotListPrompt, parseRawShotList } from '../services/geminiService';
import { ArrowRight, Film, Video, RefreshCw, Plus, Trash2, Import, X } from 'lucide-react';

interface Props {
  data: ProjectState;
  update: (updates: Partial<ProjectState>) => void;
  onNext: () => void;
}

export const Step_ShotList: React.FC<Props> = ({ data, update, onNext }) => {
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  
  // Import State
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  const handleReview = () => {
    const p = buildShotListPrompt(data);
    setPromptText(p);
    setShowPrompt(true);
  };

  const handleConfirm = async () => {
    setShowPrompt(false);
    setLoading(true);
    try {
      const shots = await generateShotList(
          data.scriptText, 
          data.lookSettings, 
          data.subjects, 
          data.locations, 
          data.globalPrompt,
          promptText
      );
      update({ shots });
    } catch (e) {
      console.error(e);
      alert('Failed to generate shot list');
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD Operations ---

  const updateShot = (id: string, field: keyof Shot, value: any) => {
      update({ shots: data.shots.map(s => s.id === id ? { ...s, [field]: value } : s) });
  };

  const addShot = () => {
      const lastNum = data.shots.length > 0 ? data.shots[data.shots.length - 1].number : 0;
      const newShot: Shot = {
          id: `manual-shot-${Date.now()}`,
          number: lastNum + 1,
          description: 'New shot description...',
          locationId: data.locations[0]?.id || '',
          subjectIds: [],
          image: null,
          lens: '50mm',
          cameraMove: 'Static',
          shotComposition: 'Medium Shot',
          sceneDescription: 'Scene details...',
          action: 'Action details...'
      };
      update({ shots: [...data.shots, newShot] });
  };

  const deleteShot = (e: React.MouseEvent | React.TouchEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      const newShots = data.shots.filter(s => s.id !== id);
      update({ shots: newShots });
  };

  const handleImport = async () => {
      setImporting(true);
      try {
          const newShots = await parseRawShotList(importText, data);
          // Assign IDs and merge
          const processedShots = newShots.map((s, i) => ({
              ...s,
              id: `imported-shot-${Date.now()}-${i}`,
              image: null
          }));
          
          update({ shots: [...data.shots, ...processedShots] });
          setShowImport(false);
          setImportText('');
      } catch (e) {
          alert('Failed to parse shot list');
      } finally {
          setImporting(false);
      }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 p-10">
        
        {/* Header and Action */}
        <div className="flex justify-between items-center bg-neutral-900 p-8 rounded-xl mb-8 shadow-xl shadow-black/10">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Film className="text-cyan-400"/> Technical Shot List
                </h2>
                <p className="text-sm text-neutral-500 mt-2">
                    Generate from Script or manually create your blocking.
                </p>
            </div>
            <div className="flex gap-3">
                 <Button onClick={() => setShowImport(true)} variant="secondary" className="px-4 py-4 text-sm flex items-center gap-2">
                    <Import size={18} /> Import List
                 </Button>
                <Button onClick={handleReview} disabled={loading} variant={data.shots.length > 0 ? "secondary" : "primary"} className="px-8 py-4 text-sm">
                    {loading ? <Spinner /> : (data.shots.length > 0 ? <><RefreshCw size={18} className="inline mr-2"/> Regenerate AI</> : <><Video size={18} className="inline mr-2"/> Generate AI Shots</>)}
                </Button>
            </div>
        </div>

        {/* Shot List Content */}
        <div className="space-y-4">
            {data.shots.length === 0 ? (
                <div className="text-center py-24 rounded-xl text-neutral-600 bg-neutral-900/30">
                    <Film size={64} className="mx-auto mb-6 opacity-20" />
                    <p className="text-lg font-bold mb-2 text-neutral-500">No Shot List Created</p>
                    <p className="max-w-md mx-auto text-sm">Confirm that your Locations and Subjects are generated before creating the shot list for maximum visual accuracy.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {data.shots.map(s => {
                        const loc = data.locations.find(l => l.id === s.locationId);
                        return (
                            <Card key={s.id} className="flex gap-8 items-stretch hover:bg-neutral-800/80 transition-colors border-none p-6 group relative">
                                {/* Shot Number & Delete */}
                                <div className="flex flex-col items-center justify-between w-20 bg-neutral-950 rounded-lg shrink-0 py-6 relative">
                                    <span className="text-3xl font-black text-neutral-700">#{s.number}</span>
                                    
                                    {/* Updated Delete Button: Force Z-Index and explicit handling */}
                                    <button 
                                        type="button"
                                        onClick={(e) => deleteShot(e, s.id)}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="mt-4 p-3 bg-neutral-900 hover:bg-red-950 text-neutral-600 hover:text-red-500 rounded-full transition-colors z-[100] cursor-pointer shadow-lg border border-neutral-800"
                                        title="Delete Shot"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                
                                {/* Details - Editable */}
                                <div className="flex-1 py-1 space-y-4">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <TextArea 
                                                value={s.description}
                                                onChange={(e: any) => updateShot(s.id, 'description', e.target.value)}
                                                className="font-bold text-neutral-100 text-lg leading-snug bg-transparent border-none p-0 focus:ring-0 min-h-[60px]"
                                                placeholder="Shot description..."
                                            />
                                            <span className="text-xs bg-neutral-950 px-4 py-1.5 rounded-full text-neutral-400 font-bold tracking-wider shrink-0 ml-4 h-8 flex items-center">{loc?.name || 'Unknown Loc'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-xs text-neutral-500 font-bold uppercase">ACTION:</span>
                                            <Input 
                                                value={s.action || ''}
                                                onChange={(e: any) => updateShot(s.id, 'action', e.target.value)}
                                                className="text-sm text-neutral-400 italic bg-transparent border-none p-0 h-auto focus:ring-0 w-full"
                                                placeholder="Action details..."
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-neutral-950/50 p-3 rounded-lg">
                                            <span className="text-cyan-600 font-bold block text-[9px] uppercase mb-1 tracking-wider">Lens / Aperture</span>
                                            <div className="flex gap-2">
                                                <input value={s.lens} onChange={(e) => updateShot(s.id, 'lens', e.target.value)} className="w-full bg-transparent text-xs font-mono focus:outline-none" />
                                                <input value={s.aperture || 'f/2.8'} onChange={(e) => updateShot(s.id, 'aperture', e.target.value)} className="w-12 bg-transparent text-xs font-mono focus:outline-none text-right" />
                                            </div>
                                        </div>
                                        <div className="bg-neutral-950/50 p-3 rounded-lg">
                                            <span className="text-purple-600 font-bold block text-[9px] uppercase mb-1 tracking-wider">Movement</span>
                                            <input value={s.cameraMove || 'Static'} onChange={(e) => updateShot(s.id, 'cameraMove', e.target.value)} className="w-full bg-transparent text-xs focus:outline-none" />
                                        </div>
                                        <div className="bg-neutral-950/50 p-3 rounded-lg col-span-2 md:col-span-1">
                                            <span className="text-blue-600 font-bold block text-[9px] uppercase mb-1 tracking-wider">Focus Point</span>
                                            <input value={s.focus || 'Subject'} onChange={(e) => updateShot(s.id, 'focus', e.target.value)} className="w-full bg-transparent text-xs focus:outline-none" />
                                        </div>
                                        <div className="bg-neutral-950/50 p-3 rounded-lg col-span-2 md:col-span-1">
                                            <span className="text-green-600 font-bold block text-[9px] uppercase mb-1 tracking-wider">Composition</span>
                                            <input value={s.shotComposition || 'Cinematic'} onChange={(e) => updateShot(s.id, 'shotComposition', e.target.value)} className="w-full bg-transparent text-xs focus:outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
            
            <button 
                onClick={addShot}
                className="w-full py-6 border-2 border-dashed border-neutral-800 rounded-xl flex items-center justify-center text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-neutral-900 transition-all"
            >
                <Plus size={24} />
            </button>
        </div>

        <PromptModal 
            isOpen={showPrompt} 
            prompt={promptText} 
            onChange={(val) => setPromptText(val)}
            onCancel={() => setShowPrompt(false)} 
            onConfirm={handleConfirm} 
            isGenerating={loading} 
        />

        {/* Import Modal */}
        {showImport && (
            <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
                <div className="bg-neutral-900 rounded-xl w-full max-w-2xl border border-neutral-800 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Import Shot List</h3>
                        <button onClick={() => setShowImport(false)}><X size={20} /></button>
                    </div>
                    <p className="text-sm text-neutral-500 mb-4">Paste your raw shot list text below. The AI will parse it and auto-fill metadata based on your project settings.</p>
                    <TextArea 
                        value={importText} 
                        onChange={(e: any) => setImportText(e.target.value)} 
                        className="h-64 font-mono text-xs mb-4"
                        placeholder="1. Wide shot of the desert...&#10;2. Close up of hero..."
                    />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setShowImport(false)}>Cancel</Button>
                        <Button onClick={handleImport} disabled={!importText || importing}>
                            {importing ? <Spinner /> : 'Parse & Import'}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        <div className="fixed bottom-4 left-64 right-0 px-8 z-20 pointer-events-none">
            <div className="max-w-4xl mx-auto pointer-events-auto">
                <Button onClick={onNext} className="w-full shadow-2xl py-4 text-lg" disabled={data.shots.length === 0}>
                    CONFIRM SHOT LIST & PROCEED <ArrowRight size={20} className="inline ml-2"/>
                </Button>
            </div>
        </div>
    </div>
  );
};