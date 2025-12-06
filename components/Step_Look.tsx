import React, { useEffect, useState } from 'react';
import { ProjectState, DetailedLighting, StyleReference, ColorGradeData } from '../types';
import { Button, Card, Select, ImageUpload, Spinner, PromptModal } from './UIComponents';
import { 
    CAMERA_BODY_OPTIONS, 
    LENS_OPTIONS, 
    LENS_KITS, 
    FILM_OPTIONS, 
    LIGHTING_MOTIVATION,
    LIGHTING_QUALITY,
    LIGHTING_KEY,
    LIGHTING_ATMOSPHERE,
    LOOK_STYLE_REF_OPTIONS
} from '../constants';
import { ArrowRight, Camera, Film, Lightbulb, Save, Image as ImageIcon, Aperture, Check, Trash2, Palette, Wand2 } from 'lucide-react';
import { analyzeColorGrade, generateLookLock, buildLookLockPrompt } from '../services/geminiService';

interface Props {
  data: ProjectState;
  update: (updates: Partial<ProjectState>) => void;
  onNext: () => void;
}

export const Step_Look: React.FC<Props> = ({ data, update, onNext }) => {
  const [analyzingColor, setAnalyzingColor] = useState(false);
  
  const updateSetting = (key: string, value: any) => {
    update({ 
        lookSettings: { 
            ...data.lookSettings, 
            [key]: value 
        } 
    });
  };

  const handleLensChange = (newLensSet: string) => {
      const allFocals = LENS_KITS[newLensSet] || [];
      const defaults = allFocals.filter(f => ['24mm','25mm','32mm','35mm','50mm','75mm','80mm','85mm'].includes(f)).slice(0, 5);
      
      update({ 
          lookSettings: { 
              ...data.lookSettings, 
              lens: newLensSet,
              selectedFocalLengths: defaults.length > 0 ? defaults : allFocals.slice(0, 4)
          } 
      });
  };

  const toggleFocalLength = (focal: string) => {
      const current = data.lookSettings.selectedFocalLengths || [];
      if (current.includes(focal)) {
          updateSetting('selectedFocalLengths', current.filter(f => f !== focal));
      } else {
          updateSetting('selectedFocalLengths', [...current, focal].sort((a,b) => parseInt(a) - parseInt(b)));
      }
  };

  const handleLightingTagToggle = (category: keyof DetailedLighting, tag: string) => {
      const currentDetailed = data.lookSettings.detailedLighting || {
          motivation: [], quality: [], visualKey: [], atmosphere: []
      };
      const currentTags = currentDetailed[category];
      
      let newTags;
      if (currentTags.includes(tag)) {
          newTags = currentTags.filter(t => t !== tag);
      } else {
          newTags = [...currentTags, tag];
      }
      
      const newDetailed = { ...currentDetailed, [category]: newTags };
      
      const lightingString = [
          newDetailed.motivation.length > 0 ? `Motivation: ${newDetailed.motivation.join(', ')}` : '',
          newDetailed.quality.length > 0 ? `Quality: ${newDetailed.quality.join(', ')}` : '',
          newDetailed.visualKey.length > 0 ? `Key: ${newDetailed.visualKey.join(', ')}` : '',
          newDetailed.atmosphere.length > 0 ? `Atmosphere: ${newDetailed.atmosphere.join(', ')}` : '',
      ].filter(Boolean).join('. ');

      update({ 
          lookSettings: { 
              ...data.lookSettings, 
              detailedLighting: newDetailed,
              lighting: lightingString 
          } 
      });
  };

  const handleUpdateGlobalPrompt = () => {
    const s = data.lookSettings;
    const lensKit = s.selectedFocalLengths && s.selectedFocalLengths.length > 0 ? s.selectedFocalLengths.join(', ') : 'Standard Kit';
    const newPrompt = `Visual Style: Shot on ${s.camera} using ${s.lens} (Kit: ${lensKit}). Film Stock: ${s.film}. Lighting: ${s.lighting}. Consistency: Maintain strict visual consistency for characters and locations based on these settings.`;
    update({ globalPrompt: newPrompt });
  };

  useEffect(() => {
    handleUpdateGlobalPrompt();
  }, [data.lookSettings]);

  const addStyleReference = (base64: string) => {
      const newRef: StyleReference = {
          id: `style-ref-${Date.now()}`,
          url: base64,
          types: []
      };
      updateSetting('styleReferences', [...(data.lookSettings.styleReferences || []), newRef]);
  };

  const removeStyleReference = (id: string) => {
      updateSetting('styleReferences', (data.lookSettings.styleReferences || []).filter(r => r.id !== id));
  };

  const toggleStyleReferenceType = (id: string, type: string) => {
      const updatedRefs = (data.lookSettings.styleReferences || []).map(r => {
          if (r.id === id) {
              const hasType = r.types.includes(type);
              const newTypes = hasType ? r.types.filter(t => t !== type) : [...r.types, type];
              return { ...r, types: newTypes };
          }
          return r;
      });
      updateSetting('styleReferences', updatedRefs);
  };

  const handleColorGradeUpload = async (base64: string) => {
      setAnalyzingColor(true);
      try {
          const analysis = await analyzeColorGrade(base64);
          const colorData: ColorGradeData = {
              image: base64,
              analysis: analysis
          };
          updateSetting('colorGrade', colorData);
      } catch (e) {
          console.error(e);
          alert("Failed to analyze color grade");
      } finally {
          setAnalyzingColor(false);
      }
  };

  const availableFocalLengths = LENS_KITS[data.lookSettings.lens] || [];
  const detailed = data.lookSettings.detailedLighting || {
    motivation: [], quality: [], visualKey: [], atmosphere: []
  };

  const renderTagGroup = (label: string, category: keyof DetailedLighting, options: string[]) => (
      <div className="mb-6 last:mb-0">
          <label className="block text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider">{label}</label>
          <div className="flex flex-wrap gap-2">
            {options.map(opt => {
                const isSelected = detailed[category].includes(opt);
                return (
                    <button
                        key={opt}
                        onClick={() => handleLightingTagToggle(category, opt)}
                        className={`text-xs px-3 py-2 rounded transition-all ${
                            isSelected 
                            ? 'bg-yellow-900/40 text-yellow-100' 
                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                    >
                        {opt}
                    </button>
                )
            })}
          </div>
      </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 p-10">
      <div className="flex justify-between items-center bg-neutral-900 p-6 rounded-lg sticky top-0 z-20 shadow-xl shadow-black/20">
        <div>
            <h2 className="text-xl font-bold">Visual Language</h2>
            <p className="text-xs text-neutral-500 mt-1">Define the camera, lenses, film stock, and lighting for your project.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 mb-4">
                <Camera size={24} />
                <h3 className="font-bold text-white">Camera Body</h3>
            </div>
            <p className="text-xs text-neutral-500">Select the camera system.</p>
            <Select 
                value={data.lookSettings.camera}
                onChange={(e: any) => updateSetting('camera', e.target.value)}
                options={CAMERA_BODY_OPTIONS}
            />
        </Card>

        <Card className="space-y-4 md:row-span-2">
            <div className="flex items-center gap-2 text-cyan-400 mb-4">
                <Aperture size={24} />
                <h3 className="font-bold text-white">Lens Kit</h3>
            </div>
            
            <div className="mb-6">
                <label className="block text-xs font-bold text-neutral-500 mb-2">LENS SET</label>
                <Select 
                    value={data.lookSettings.lens || LENS_OPTIONS[0].value}
                    onChange={(e: any) => handleLensChange(e.target.value)}
                    options={LENS_OPTIONS}
                />
            </div>

            {availableFocalLengths.length > 0 && (
                <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-3">PROJECT FOCAL LENGTHS</label>
                    <div className="grid grid-cols-3 gap-2">
                        {availableFocalLengths.map(focal => {
                            const isSelected = data.lookSettings.selectedFocalLengths?.includes(focal);
                            return (
                                <button
                                    key={focal}
                                    onClick={() => toggleFocalLength(focal)}
                                    className={`text-xs px-2 py-3 rounded transition-all font-medium ${
                                        isSelected 
                                        ? 'bg-cyan-900/40 text-cyan-100' 
                                        : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'
                                    }`}
                                >
                                    {focal}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </Card>

        <Card className="space-y-4">
            <div className="flex items-center gap-2 text-purple-400 mb-4">
                <Film size={24} />
                <h3 className="font-bold text-white">Film Stock</h3>
            </div>
            <p className="text-xs text-neutral-500">Choose the color grading and texture.</p>
            <Select 
                value={data.lookSettings.film}
                onChange={(e: any) => updateSetting('film', e.target.value)}
                options={FILM_OPTIONS}
            />
        </Card>

        <Card className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 text-yellow-400 mb-4">
                <Lightbulb size={24} />
                <h3 className="font-bold text-white">Lighting Configuration</h3>
            </div>
            <p className="text-xs text-neutral-500 pb-4 mb-4">Configure the scene's lighting structure. Select all tags that apply.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {renderTagGroup("Motivation (Source Origin)", "motivation", LIGHTING_MOTIVATION)}
                {renderTagGroup("Hardness (Quality)", "quality", LIGHTING_QUALITY)}
                {renderTagGroup("Visual Key", "visualKey", LIGHTING_KEY)}
                {renderTagGroup("Atmosphere", "atmosphere", LIGHTING_ATMOSPHERE)}
            </div>
            
            <div className="mt-6 bg-neutral-950 p-4 rounded-lg">
                <div className="text-[10px] font-bold text-neutral-500 uppercase mb-2">Generated Lighting Prompt</div>
                <div className="text-sm text-yellow-500/90 font-mono leading-relaxed">
                    {data.lookSettings.lighting || "Select options above to build your lighting profile..."}
                </div>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="md:col-span-1">
             <div className="flex items-center gap-2 mb-6 text-pink-400">
                <ImageIcon size={20} />
                <h3 className="font-bold text-white">Style Reference Images</h3>
             </div>
             
             <div className="grid grid-cols-2 gap-3 mb-4">
                {data.lookSettings.styleReferences?.map((ref) => (
                    <div key={ref.id} className="bg-neutral-950 rounded p-2 relative group">
                        <button 
                            onClick={() => removeStyleReference(ref.id)}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-red-900/80 p-1.5 rounded-full text-white transition-colors z-10"
                        >
                            <Trash2 size={12} />
                        </button>
                        <div className="aspect-video bg-black rounded mb-2 overflow-hidden">
                            <img src={ref.url} alt="Style Ref" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-wrap gap-1">
                                {LOOK_STYLE_REF_OPTIONS.slice(0, 3).map(opt => {
                                    const isActive = ref.types.includes(opt);
                                    return (
                                        <button 
                                            key={opt}
                                            onClick={() => toggleStyleReferenceType(ref.id, opt)}
                                            className={`text-[8px] px-1.5 py-0.5 rounded transition-all ${
                                                isActive 
                                                ? 'bg-blue-900/30 text-blue-200'
                                                : 'bg-neutral-800 text-neutral-500'
                                            }`}
                                        >
                                            {opt.split(' ')[0]}...
                                        </button>
                                    )
                                })}
                        </div>
                    </div>
                ))}
                
                <div className="flex flex-col items-center justify-center p-6 rounded bg-neutral-900/50 hover:bg-neutral-900 transition-colors h-40">
                     <ImageUpload 
                        onImageSelected={addStyleReference}
                        label="Add Reference"
                     />
                </div>
             </div>
          </Card>

          <Card className="md:col-span-1 bg-gradient-to-br from-neutral-900 to-pink-900/5">
              <div className="flex items-center gap-2 mb-6 text-pink-500">
                <Palette size={20} />
                <h3 className="font-bold text-white">Color Grade DNA</h3>
              </div>

              {!data.lookSettings.colorGrade ? (
                  <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-pink-900/5 hover:bg-pink-900/10 transition-colors">
                      {analyzingColor ? <Spinner /> : (
                        <div className="text-center">
                            <ImageUpload onImageSelected={handleColorGradeUpload} label="Upload Grading Reference" />
                        </div>
                      )}
                  </div>
              ) : (
                  <div className="space-y-4">
                      <div className="relative group">
                          <img src={data.lookSettings.colorGrade.image} className="w-full h-40 object-cover rounded" alt="Grade Ref" />
                          <button 
                            onClick={() => updateSetting('colorGrade', undefined)}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-red-600 p-2 rounded-full text-white"
                          >
                              <Trash2 size={14} />
                          </button>
                      </div>
                      <div className="bg-neutral-950 p-4 rounded">
                          <div className="text-[10px] font-bold text-pink-500 uppercase mb-2 flex items-center gap-2"><Wand2 size={10}/> Extracted Grade DNA</div>
                          <p className="text-xs font-mono text-pink-200/80 leading-relaxed">
                              {data.lookSettings.colorGrade.analysis}
                          </p>
                      </div>
                  </div>
              )}
          </Card>

          <Card className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Save size={20} className="text-green-400" />
                <h3 className="font-bold">Generated Global Instructions</h3>
              </div>
              <p className="text-xs text-neutral-500 mb-3">These instructions are automatically constructed from your choices and will guide the AI.</p>
              <div className="bg-neutral-950 p-4 rounded text-sm font-mono text-green-400/80 leading-relaxed">
                  {data.globalPrompt}
              </div>
          </Card>
      </div>

      <div className="fixed bottom-4 left-0 right-0 max-w-4xl mx-auto px-4 z-20">
        <Button onClick={onNext} className="w-full shadow-2xl py-4 text-lg">
          CONFIRM LOOK & PROCEED <ArrowRight size={20} className="inline ml-2"/>
        </Button>
      </div>
    </div>
  );
};