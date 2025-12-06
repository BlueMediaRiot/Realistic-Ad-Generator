import React, { useState, useEffect } from 'react';
import { ProjectState, Location, ImageSize, Subject, Shot, StyleReference } from '../types';
import { Button, Card, TextArea, Spinner, ImageUpload, Select, PromptModal } from './UIComponents';
import { generateImage, extractVisualDetails } from '../services/geminiService';
import { ArrowRight, Wand2, Eye, Settings, X, RefreshCw, Check, Download, Sun, CloudRain } from 'lucide-react';
import { TIME_OF_DAY_OPTIONS, WEATHER_OPTIONS, LOCATION_REF_OPTIONS } from '../constants';

interface Props {
  data: ProjectState;
  update: (updates: Partial<ProjectState>) => void;
  onNext: () => void;
}

export const Step5_Locations: React.FC<Props> = ({ data, update, onNext }) => {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingLoc, setPendingLoc] = useState<{loc: Location, prompt: string, assets: string[]} | null>(null);

  const buildDefaultPrompt = (loc: Location) => {
    const { lookSettings } = data;
    
    let template = data.promptTemplates?.location || "";

    const motivation = lookSettings.detailedLighting?.motivation?.join(', ') || 'Natural Light';
    const hardness = lookSettings.detailedLighting?.quality?.join(', ') || 'Soft';
    const visualKey = lookSettings.detailedLighting?.visualKey?.join(', ') || 'Mid-Key';
    const atmosphere = lookSettings.detailedLighting?.atmosphere?.join(', ') || 'Clean Air';
    const lighting = `${motivation}, ${hardness}, ${visualKey}, ${atmosphere}`;
    
    const colorGradeDNA = lookSettings.colorGrade?.analysis ? `\nCOLOR GRADING DNA (Strictly Enforce): ${lookSettings.colorGrade.analysis}` : '';

    const camera = lookSettings.camera || 'Cinema Camera';
    const film = lookSettings.film || 'Standard Film Stock';
    
    const lens = lookSettings.selectedFocalLengths?.[0] || '24mm'; 
    const weather = loc.weather || 'Clear';

    let refNotes = "";
    if (loc.referenceImage) {
        refNotes += `\n- Ref Image 1 (Uploaded): Use as primary visual basis.`;
    }
    
    if (loc.selectedAssetIds && loc.assetReferenceTypes) {
        loc.selectedAssetIds.forEach((id, idx) => {
            const types = loc.assetReferenceTypes?.[id] || ['General Reference'];
            const typeStr = types.join(', ');
            const imgIndex = (loc.referenceImage ? 2 : 1) + idx; 
            refNotes += `\n- Ref Image ${imgIndex}: Use for [${typeStr}].`;
        });
    }

    template = template.replace('{{name}}', loc.name);
    template = template.replace('{{description}}', loc.description);
    template = template.replace('{{time}}', loc.timeOfDay);
    template = template.replace('{{weather}}', weather);
    template = template.replace('{{visualDetails}}', loc.visualDetails || 'rich environmental details');
    template = template.replace('{{camera}}', camera);
    template = template.replace('{{lens}}', lens);
    template = template.replace('{{lighting}}', lighting);
    template = template.replace('{{colorGrade}}', colorGradeDNA);
    template = template.replace('{{film}}', film);
    template = template.replace('{{referenceNotes}}', refNotes);

    return template;
  };

  const getDefaultAssetIds = (loc: Location) => {
      return data.lookSettings.styleReferences?.map(r => r.id) || [];
  };

  const handleReview = (loc: Location, overridePrompt?: string, overrideAssetIds?: string[], timeOfDay?: string, weather?: string, overrideRefTypes?: Record<string, string[]>) => {
    const locToUse = (timeOfDay || weather || overrideRefTypes) ? { 
        ...loc, 
        timeOfDay: timeOfDay || loc.timeOfDay, 
        weather: weather || loc.weather,
        assetReferenceTypes: overrideRefTypes || loc.assetReferenceTypes 
    } : loc;
    
    const promptToUse = overridePrompt || loc.customPrompt || buildDefaultPrompt(locToUse);
    const assetIdsToUse = overrideAssetIds || loc.selectedAssetIds || getDefaultAssetIds(loc);

    let fullPrompt = promptToUse;
    
    setPendingLoc({ loc: locToUse, prompt: fullPrompt, assets: assetIdsToUse });
  };

  const handleConfirmGenerate = async () => {
    if (!pendingLoc) return;
    const { loc, prompt, assets } = pendingLoc;
    
    setPendingLoc(null); // Close modal immediately
    setGeneratingId(loc.id);

    const referenceImages: string[] = [];
    if (loc.referenceImage) referenceImages.push(loc.referenceImage);

    assets.forEach(id => {
        const c = data.subjects.find(x => x.id === id);
        if (c?.image?.url) referenceImages.push(c.image.url);
        const l = data.locations.find(x => x.id === id);
        if (l?.image?.url) referenceImages.push(l.image.url);
        const s = data.shots.find(x => x.id === id);
        if (s?.image?.url) referenceImages.push(s.image.url);
        const styleRef = data.lookSettings.styleReferences.find(r => r.id === id);
        if (styleRef?.url) referenceImages.push(styleRef.url);
    });

    try {
      const url = await generateImage(prompt, imageSize, referenceImages);
      
      const details = await extractVisualDetails(url, 'location');
      const filename = `Location_${loc.letter}_01.jpg`;

      const updatedLocs = data.locations.map(l => 
        l.id === loc.id ? { 
            ...l, 
            image: { url, prompt, filename }, 
            visualDetails: details,
            customPrompt: editingId ? prompt : l.customPrompt,
            selectedAssetIds: assets,
            timeOfDay: loc.timeOfDay,
            weather: loc.weather,
            assetReferenceTypes: loc.assetReferenceTypes 
        } : l
      );
      update({ locations: updatedLocs });
      setEditingId(null);
    } catch (e) {
      console.error(e);
      alert('Generation failed');
    } finally {
      setGeneratingId(null);
    }
  };

  const updateDescription = (id: string, text: string) => {
    const updated = data.locations.map(l => 
      l.id === id ? { ...l, description: text } : l
    );
    update({ locations: updated });
  };

  const updateReference = (id: string, base64: string) => {
    const updated = data.locations.map(l => 
      l.id === id ? { ...l, referenceImage: base64 } : l
    );
    update({ locations: updated });
  }

  const handleSaveSettings = (id: string, prompt: string, assets: string[], timeOfDay: string, weather: string, refTypes: Record<string, string[]>) => {
      const updated = data.locations.map(l => l.id === id ? { 
          ...l, 
          customPrompt: prompt, 
          selectedAssetIds: assets,
          timeOfDay,
          weather,
          assetReferenceTypes: refTypes 
      } : l);
      update({ locations: updated });
      setEditingId(null);
  };

  const handleDownload = (loc: Location) => {
    if (!loc.image) return;
    const link = document.createElement('a');
    link.href = loc.image.url;
    link.download = loc.image.filename || `Location_${loc.letter}_01.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 p-10">
       <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-lg border border-neutral-800 sticky top-0 z-20">
        <h2 className="text-xl font-bold">Locations</h2>
        <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400">Size:</span>
            <Select 
                value={imageSize} 
                onChange={(e: any) => setImageSize(e.target.value)} 
                options={[{value:'1K', label:'1K'}, {value:'2K', label:'2K'}, {value:'4K', label:'4K'}]}
                className="w-24 py-1"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.locations.map(loc => (
          <Card key={loc.id} className="space-y-3 relative">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
                 {loc.image && (
                     <button 
                        onClick={() => handleDownload(loc)}
                        className="p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors"
                        title={`Download as ${loc.image.filename}`}
                     >
                        <Download size={16} />
                     </button>
                 )}
                 <button 
                    onClick={() => setEditingId(loc.id)}
                    className="p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors"
                    title="Edit Prompt & References"
                 >
                    <Settings size={16} />
                 </button>
            </div>

            <div className="absolute top-2 left-2 z-10">
                 <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">Ref: {loc.letter}</span>
             </div>

            <div className="aspect-video bg-neutral-950 rounded-lg overflow-hidden flex items-center justify-center border border-neutral-800 relative group">
              {loc.image ? (
                <>
                    <img src={loc.image.url} alt={loc.name} className="w-full h-full object-cover" />
                    {loc.image.filename && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-neutral-300 text-[10px] px-2 py-1 rounded font-mono backdrop-blur-sm">
                            {loc.image.filename}
                        </div>
                    )}
                </>
              ) : (
                <div className="text-neutral-700 font-bold text-lg uppercase tracking-widest px-4 text-center">{loc.name}</div>
              )}
               {generatingId === loc.id && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Spinner />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
               <div className="flex justify-between items-center">
                   <h3 className="font-bold text-white">{loc.name}</h3>
                   <div className="flex gap-2">
                        <span className="text-xs bg-neutral-800 px-2 py-1 rounded text-neutral-400 border border-neutral-700">{loc.timeOfDay}</span>
                        {loc.weather && <span className="text-xs bg-neutral-800 px-2 py-1 rounded text-neutral-400 border border-neutral-700">{loc.weather}</span>}
                   </div>
               </div>
               
               <TextArea 
                 value={loc.description} 
                 onChange={(e: any) => updateDescription(loc.id, e.target.value)}
                 className="text-sm h-24"
               />

               {loc.visualDetails && (
                   <div className="bg-neutral-800 p-2 rounded text-xs border border-neutral-700">
                       <div className="flex items-center gap-1 text-green-400 font-bold mb-1">
                           <Eye size={12} /> Locked Visuals
                       </div>
                       <p className="text-neutral-300 line-clamp-3">{loc.visualDetails}</p>
                   </div>
               )}
               
               <ImageUpload 
                  onImageSelected={(b64) => updateReference(loc.id, b64)} 
                  currentImage={loc.referenceImage}
               />

               <Button 
                onClick={() => handleReview(loc)} 
                className="w-full mt-2"
                disabled={generatingId !== null}
               >
                 <Wand2 size={14} className="inline mr-2"/> GENERATE
               </Button>
            </div>
          </Card>
        ))}
      </div>

      {editingId && (
          <LocationSettingsModal 
            loc={data.locations.find(l => l.id === editingId)!}
            allSubjects={data.subjects}
            allLocations={data.locations}
            allShots={data.shots}
            styleReferences={data.lookSettings.styleReferences}
            onClose={() => setEditingId(null)}
            onSave={handleSaveSettings}
            onGenerate={(id, prompt, assets, time, weather, refTypes) => handleReview(data.locations.find(l => l.id === id)!, prompt, assets, time, weather, refTypes)}
            defaultPromptBuilder={buildDefaultPrompt}
          />
      )}

      <PromptModal 
        isOpen={!!pendingLoc} 
        prompt={pendingLoc?.prompt || ''} 
        onChange={(val) => setPendingLoc(prev => prev ? {...prev, prompt: val} : null)}
        onCancel={() => setPendingLoc(null)}
        onConfirm={handleConfirmGenerate}
        isGenerating={generatingId !== null}
      />

      <div className="fixed bottom-4 left-0 right-0 max-w-4xl mx-auto px-4 z-20">
        <Button onClick={onNext} className="w-full shadow-lg">
          CONFIRM LOCATIONS <ArrowRight size={16} className="inline ml-2"/>
        </Button>
      </div>
    </div>
  );
};

const LocationSettingsModal = ({ 
    loc, 
    allSubjects, 
    allLocations, 
    allShots,
    styleReferences,
    onClose, 
    onSave, 
    onGenerate,
    defaultPromptBuilder
}: {
    loc: Location,
    allSubjects: Subject[],
    allLocations: Location[],
    allShots: Shot[],
    styleReferences: StyleReference[],
    onClose: () => void,
    onSave: (id: string, prompt: string, assets: string[], timeOfDay: string, weather: string, refTypes: Record<string, string[]>) => void,
    onGenerate: (id: string, prompt: string, assets: string[], timeOfDay: string, weather: string, refTypes: Record<string, string[]>) => void,
    defaultPromptBuilder: (l: Location) => string,
}) => {
    const [prompt, setPrompt] = useState(loc.customPrompt || defaultPromptBuilder(loc));
    const [selectedAssets, setSelectedAssets] = useState<string[]>(loc.selectedAssetIds || []);
    const [timeOfDay, setTimeOfDay] = useState(loc.timeOfDay || 'Daylight');
    const [weather, setWeather] = useState(loc.weather || 'Clear');
    const [refTypes, setRefTypes] = useState<Record<string, string[]>>(loc.assetReferenceTypes || {});

    // Auto-update prompt when time/weather changes
    useEffect(() => {
        const tempLoc = { ...loc, timeOfDay, weather, assetReferenceTypes: refTypes };
        setPrompt(defaultPromptBuilder(tempLoc));
    }, [timeOfDay, weather, refTypes]); 

    const toggleRefType = (id: string, type: string) => {
        const current = refTypes[id] || [];
        const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
        setRefTypes(prev => ({ ...prev, [id]: updated }));
    };

    const renderAssetRow = (id: string, url: string, name: string, type: string, filename?: string) => {
        const isSelected = selectedAssets.includes(id);
        const currentTypes = refTypes[id] || [];

        return (
            <div 
                key={id} 
                className={`p-3 rounded border transition-all mb-3 ${
                    isSelected ? 'bg-blue-900/30 border-blue-500' : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800'
                }`}
            >
                <div 
                    onClick={() => {
                        if (isSelected) setSelectedAssets(prev => prev.filter(a => a !== id));
                        else setSelectedAssets(prev => [...prev, id]);
                    }}
                    className="flex items-center gap-4 cursor-pointer"
                >
                    <img src={url} alt={name} className="w-32 h-20 object-cover rounded bg-neutral-900 shrink-0 border border-neutral-700" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <div className="font-bold text-sm text-neutral-200 truncate pr-2">{name}</div>
                            <div className="text-[10px] text-neutral-500 uppercase tracking-wider bg-neutral-900 px-1.5 py-0.5 rounded">{type}</div>
                        </div>
                        {filename && <div className="text-[10px] text-neutral-400 font-mono truncate bg-black/30 p-1 rounded inline-block">{filename}</div>}
                    </div>
                    {isSelected && <Check size={20} className="text-blue-500 shrink-0" />}
                </div>

                {isSelected && (
                    <div className="mt-3 pl-36">
                        <label className="text-[10px] font-bold text-blue-400 uppercase mb-1 block">Reference Focus (Multi-Select)</label>
                         <div className="flex flex-wrap gap-1.5">
                            {LOCATION_REF_OPTIONS.map(opt => {
                                const active = currentTypes.includes(opt);
                                return (
                                    <button 
                                        key={opt}
                                        onClick={() => toggleRefType(id, opt)}
                                        className={`text-[9px] px-2 py-1 rounded border transition-all ${
                                            active 
                                            ? 'bg-blue-600 border-blue-400 text-white' 
                                            : 'bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-500'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const resetPrompt = () => {
        const tempLoc = { ...loc, timeOfDay, weather, assetReferenceTypes: refTypes };
        setPrompt(defaultPromptBuilder(tempLoc));
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col h-[90vh]">
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900 shrink-0">
                    <div>
                        <h3 className="font-bold text-lg">Location Configuration: {loc.name}</h3>
                        <p className="text-xs text-neutral-400">Customize prompt, lighting conditions and references.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Time and Weather Config */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Sun size={12}/> Time of Day
                            </label>
                            <Select 
                                value={timeOfDay} 
                                onChange={(e: any) => setTimeOfDay(e.target.value)} 
                                options={TIME_OF_DAY_OPTIONS.map(t => ({value: t, label: t}))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <CloudRain size={12}/> Weather
                            </label>
                            <Select 
                                value={weather} 
                                onChange={(e: any) => setWeather(e.target.value)} 
                                options={WEATHER_OPTIONS.map(w => ({value: w, label: w}))}
                            />
                        </div>
                    </div>

                    <div>
                         <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-neutral-300">Generation Prompt</label>
                            <button onClick={resetPrompt} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300"><RefreshCw size={10} /> Reset Default</button>
                        </div>
                        <TextArea 
                            value={prompt} 
                            onChange={(e: any) => setPrompt(e.target.value)} 
                            className="h-32 font-mono text-xs leading-relaxed"
                            placeholder="Enter prompt..."
                        />
                         <div className="mt-3">
                             <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Manual Reference Upload</h4>
                             <ImageUpload 
                                onImageSelected={() => {}} 
                                currentImage={loc.referenceImage}
                                label="Custom reference (Edit on main card)"
                             />
                        </div>
                    </div>

                    <div className="border-t border-neutral-800 pt-4">
                        <label className="block text-sm font-bold text-neutral-300 mb-2">Reference Assets ({selectedAssets.length})</label>
                        <p className="text-xs text-neutral-500 mb-4">Select generated images to use as visual references.</p>

                        <div className="space-y-1">
                            {styleReferences && styleReferences.length > 0 && (
                                <div className="mb-4">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase mb-2 pl-1">Style References (from Look)</div>
                                    {styleReferences.map((ref, idx) => renderAssetRow(ref.id, ref.url, `Style Ref #${idx+1}`, 'Style'))}
                                </div>
                            )}

                            {allLocations.filter(l => l.image && l.id !== loc.id).length > 0 && (
                                <div className="mb-4">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase mb-2 pl-1">Other Locations</div>
                                    {allLocations.filter(l => l.image && l.id !== loc.id).map(l => renderAssetRow(l.id, l.image!.url, l.name, 'Location', l.image?.filename))}
                                </div>
                            )}
                             {allSubjects.filter(c => c.image).length > 0 && (
                                <div className="mb-4">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase mb-2 pl-1">Subjects</div>
                                    {allSubjects.filter(c => c.image).map(c => renderAssetRow(c.id, c.image!.url, c.name, 'Subject', c.image?.filename))}
                                </div>
                            )}
                             {allShots.filter(s => s.image).length > 0 && (
                                <div>
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase mb-2 pl-1">Generated Shots</div>
                                    {allShots.filter(s => s.image).map(s => renderAssetRow(s.id, s.image!.url, `Shot #${s.number}`, 'Shot', s.image?.filename))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-900 shrink-0">
                    <Button onClick={() => onSave(loc.id, prompt, selectedAssets, timeOfDay, weather, refTypes)} variant="secondary">Save Changes</Button>
                    <Button onClick={() => onGenerate(loc.id, prompt, selectedAssets, timeOfDay, weather, refTypes)} variant="primary" className="flex items-center gap-2">
                        <Wand2 size={16} /> Generate Now
                    </Button>
                </div>
            </div>
        </div>
    );
};