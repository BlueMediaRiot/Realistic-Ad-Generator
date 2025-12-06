

import React, { useState } from 'react';
import { ProjectState, Subject, ImageSize, Location, Shot } from '../types';
import { Button, Card, TextArea, Spinner, ImageUpload, Select } from './UIComponents';
import { generateImage, extractVisualDetails } from '../services/geminiService';
import { ArrowRight, Wand2, ScanFace, Settings, X, RefreshCw, Check } from 'lucide-react';

interface Props {
  data: ProjectState;
  update: (updates: Partial<ProjectState>) => void;
  onNext: () => void;
}

export const Step4_Characters: React.FC<Props> = ({ data, update, onNext }) => {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [editingId, setEditingId] = useState<string | null>(null);

  const buildDefaultPrompt = (char: Subject) => {
      const { lookSettings } = data;
      const camera = lookSettings.camera || 'Cinema Camera';
      const film = lookSettings.film || 'Standard Film Stock';
      const lighting = lookSettings.lighting || 'Cinematic Lighting';

      let promptBase = `Character Sheet: [${char.description}]. 
      Shot on ${camera} with ${film}. Lighting style: ${lighting}.
      Strong emphasis on consistent facial structure, identical hairstyle, and fixed body proportions. Full-body rotation sequence (front, 3/4, profile, back), neutral pose, clean grey background for clarity, cinematic details preserved, realistic, 16:9.`;
      
      if (char.referenceImage) {
        promptBase = `Character Sheet: Subject from img 1. 
        Shot on ${camera} with ${film}. Lighting style: ${lighting}.
        Strong emphasis on consistent facial structure, identical hairstyle, and fixed body proportions. Full-body rotation sequence (front, 3/4, profile, back), neutral pose, clean grey background for clarity, cinematic details preserved, realistic, 16:9. Include the uploaded image as reference.`;
      }
      return promptBase;
  };

  const getDefaultAssetIds = (char: Subject) => {
      // Default to just manual reference if it exists, or nothing from other generated assets initially
      return []; 
  };

  const handleGenerate = async (char: Subject, overridePrompt?: string, overrideAssetIds?: string[]) => {
    setGeneratingId(char.id);
    
    // 1. Determine Prompt
    const promptToUse = overridePrompt || char.customPrompt || buildDefaultPrompt(char);

    // 2. Determine Reference Assets
    const assetIdsToUse = overrideAssetIds || char.selectedAssetIds || getDefaultAssetIds(char);

    // 3. Gather References
    const referenceImages: string[] = [];
    if (char.referenceImage) referenceImages.push(char.referenceImage);

    // Generated Asset References
    assetIdsToUse.forEach(id => {
        const c = data.subjects.find(x => x.id === id);
        if (c?.image?.url) referenceImages.push(c.image.url);
        
        const l = data.locations.find(x => x.id === id);
        if (l?.image?.url) referenceImages.push(l.image.url);

        const s = data.shots.find(x => x.id === id);
        if (s?.image?.url) referenceImages.push(s.image.url);
    });

    try {
      // 1. Generate Image
      const url = await generateImage(promptToUse, imageSize, referenceImages, data.globalPrompt);
      
      // 2. Extract Visual Details
      const details = await extractVisualDetails(url, 'subject');

      const updatedChars = data.subjects.map(c => 
        c.id === char.id ? { 
            ...c, 
            image: { url, prompt: promptToUse }, 
            visualDetails: details,
            customPrompt: overridePrompt || c.customPrompt,
            selectedAssetIds: overrideAssetIds || c.selectedAssetIds
        } : c
      );
      update({ subjects: updatedChars });
      setEditingId(null);
    } catch (e) {
      console.error(e);
      alert('Generation failed');
    } finally {
      setGeneratingId(null);
    }
  };

  const updateDescription = (id: string, text: string) => {
    const updatedChars = data.subjects.map(c => 
      c.id === id ? { ...c, description: text } : c
    );
    update({ subjects: updatedChars });
  };

  const updateReference = (id: string, base64: string) => {
     const updatedChars = data.subjects.map(c => 
      c.id === id ? { ...c, referenceImage: base64 } : c
    );
    update({ subjects: updatedChars });
  }

  const handleSaveSettings = (id: string, prompt: string, assets: string[]) => {
      const updated = data.subjects.map(c => c.id === id ? { ...c, customPrompt: prompt, selectedAssetIds: assets } : c);
      update({ subjects: updated });
      setEditingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-lg border border-neutral-800 sticky top-0 z-20">
        <h2 className="text-xl font-bold">Characters</h2>
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
        {data.subjects.map(char => (
          <Card key={char.id} className="space-y-3 relative">
             <div className="absolute top-2 right-2 z-10">
                 <button 
                    onClick={() => setEditingId(char.id)}
                    className="p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors"
                    title="Edit Prompt & References"
                 >
                    <Settings size={16} />
                 </button>
             </div>

            <div className="aspect-video bg-neutral-950 rounded-lg overflow-hidden flex items-center justify-center border border-neutral-800 relative">
              {char.image ? (
                <img src={char.image.url} alt={char.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-neutral-700 font-bold text-2xl uppercase tracking-widest">{char.name}</div>
              )}
               {generatingId === char.id && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Spinner />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
               <div className="flex justify-between items-center">
                   <h3 className="font-bold text-white">{char.name}</h3>
               </div>
               
               <TextArea 
                 value={char.description} 
                 onChange={(e: any) => updateDescription(char.id, e.target.value)}
                 className="text-sm h-24"
               />

               {char.visualDetails && (
                   <div className="bg-neutral-800 p-2 rounded text-xs border border-neutral-700">
                       <div className="flex items-center gap-1 text-blue-400 font-bold mb-1">
                           <ScanFace size={12} /> Locked Visuals
                       </div>
                       <p className="text-neutral-300 line-clamp-3">{char.visualDetails}</p>
                   </div>
               )}

               <ImageUpload 
                  onImageSelected={(b64) => updateReference(char.id, b64)} 
                  currentImage={char.referenceImage}
               />

               <Button 
                onClick={() => handleGenerate(char)} 
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
          <CharacterSettingsModal 
            char={data.subjects.find(c => c.id === editingId)!}
            allCharacters={data.subjects}
            allLocations={data.locations}
            allShots={data.shots}
            onClose={() => setEditingId(null)}
            onSave={handleSaveSettings}
            onGenerate={(id, prompt, assets) => handleGenerate(data.subjects.find(c => c.id === id)!, prompt, assets)}
            defaultPromptBuilder={buildDefaultPrompt}
          />
      )}

      <div className="fixed bottom-4 left-0 right-0 max-w-4xl mx-auto px-4 z-20">
        <Button onClick={onNext} className="w-full shadow-lg">
          GENERATE LOCATIONS <ArrowRight size={16} className="inline ml-2"/>
        </Button>
      </div>
    </div>
  );
};

const CharacterSettingsModal = ({ 
    char, 
    allCharacters, 
    allLocations, 
    allShots,
    onClose, 
    onSave, 
    onGenerate,
    defaultPromptBuilder
}: {
    char: Subject,
    allCharacters: Subject[],
    allLocations: Location[],
    allShots: Shot[],
    onClose: () => void,
    onSave: (id: string, prompt: string, assets: string[]) => void,
    onGenerate: (id: string, prompt: string, assets: string[]) => void,
    defaultPromptBuilder: (c: Subject) => string,
}) => {
    const [prompt, setPrompt] = useState(char.customPrompt || defaultPromptBuilder(char));
    const [selectedAssets, setSelectedAssets] = useState<string[]>(char.selectedAssetIds || []);

    const availableChars = allCharacters.filter(c => c.image && c.id !== char.id);
    const availableLocs = allLocations.filter(l => l.image);
    const availableShots = allShots.filter(s => s.image);

    const toggleAsset = (id: string) => {
        if (selectedAssets.includes(id)) {
            setSelectedAssets(prev => prev.filter(a => a !== id));
        } else {
            setSelectedAssets(prev => [...prev, id]);
        }
    };

    const resetPrompt = () => {
        setPrompt(defaultPromptBuilder(char));
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">Character Configuration: {char.name}</h3>
                        <p className="text-xs text-neutral-400">Customize prompt and reference assets.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    <div className="w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r border-neutral-800 overflow-y-auto space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-bold text-neutral-300">Prompt</label>
                                <button onClick={resetPrompt} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300"><RefreshCw size={10} /> Reset Default</button>
                            </div>
                            <TextArea 
                                value={prompt} 
                                onChange={(e: any) => setPrompt(e.target.value)} 
                                className="h-[200px] font-mono text-sm leading-relaxed"
                                placeholder="Enter prompt..."
                            />
                        </div>

                        <div>
                             <h4 className="text-sm font-bold text-neutral-300 mb-2">Manual Reference</h4>
                             <ImageUpload 
                                onImageSelected={() => {}} // Read-only view here, edit on card
                                currentImage={char.referenceImage}
                                label="Custom reference (Edit on main card)"
                             />
                        </div>
                    </div>

                    <div className="w-full md:w-1/2 p-4 bg-neutral-900 overflow-y-auto">
                        <label className="block text-sm font-bold text-neutral-300 mb-2">Select Reference Images ({selectedAssets.length})</label>
                        <p className="text-xs text-neutral-500 mb-4">Select generated assets to use as visual references.</p>
                        
                        {availableLocs.length > 0 && (
                            <div className="mb-4">
                                <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Locations</h5>
                                <div className="grid grid-cols-3 gap-2">
                                    {availableLocs.map(loc => (
                                        <div 
                                            key={loc.id} 
                                            onClick={() => toggleAsset(loc.id)}
                                            className={`relative aspect-video rounded cursor-pointer overflow-hidden border-2 transition-all ${selectedAssets.includes(loc.id) ? 'border-blue-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
                                        >
                                            <img src={loc.image!.url} alt={loc.name} className="w-full h-full object-cover" />
                                            {selectedAssets.includes(loc.id) && (
                                                <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                                                    <Check size={10} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {availableChars.length > 0 && (
                            <div className="mb-4">
                                <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Other Characters</h5>
                                <div className="grid grid-cols-3 gap-2">
                                    {availableChars.map(c => (
                                        <div 
                                            key={c.id} 
                                            onClick={() => toggleAsset(c.id)}
                                            className={`relative aspect-square rounded cursor-pointer overflow-hidden border-2 transition-all ${selectedAssets.includes(c.id) ? 'border-blue-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
                                        >
                                            <img src={c.image!.url} alt={c.name} className="w-full h-full object-cover" />
                                            {selectedAssets.includes(c.id) && (
                                                <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                                                    <Check size={10} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                         {availableShots.length > 0 && (
                            <div className="mb-4">
                                <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Generated Shots</h5>
                                <div className="grid grid-cols-3 gap-2">
                                    {availableShots.map(s => (
                                        <div 
                                            key={s.id} 
                                            onClick={() => toggleAsset(s.id)}
                                            className={`relative aspect-video rounded cursor-pointer overflow-hidden border-2 transition-all ${selectedAssets.includes(s.id) ? 'border-blue-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
                                        >
                                            <img src={s.image!.url} alt={`Shot ${s.number}`} className="w-full h-full object-cover" />
                                            {selectedAssets.includes(s.id) && (
                                                <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                                                    <Check size={10} className="text-white" />
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] px-1 truncate">Shot #{s.number}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-900">
                    <Button onClick={() => onSave(char.id, prompt, selectedAssets)} variant="secondary">Save Changes</Button>
                    <Button onClick={() => onGenerate(char.id, prompt, selectedAssets)} variant="primary" className="flex items-center gap-2">
                        <Wand2 size={16} /> Generate Now
                    </Button>
                </div>
            </div>
        </div>
    );
};
