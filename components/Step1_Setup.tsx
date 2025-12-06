

import React, { useState } from 'react';
import { ProjectState, DEMO_STATE, INITIAL_STATE } from '../types';
import { Button, Input, TextArea, PromptModal, Spinner } from './UIComponents';
import { PROJECT_TAGS } from '../constants';
import { Plus, X, Database, Tag, Check, ArrowRight, Trash2, Clock, Sparkles } from 'lucide-react';
import { buildIdeasPrompt, generateIdeas } from '../services/geminiService';
import { saveProject, resetFullProject } from '../services/dbService';

interface Props {
  data: ProjectState;
  update: (updates: Partial<ProjectState>) => void;
  onNext: () => void;
}

const TagsSelector = ({ options, selected, onUpdate, customValue, setCustomValue }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
        onUpdate(selected.filter((t: string) => t !== tag));
    } else {
        onUpdate([...selected, tag]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setIsOpen(true)} variant="secondary" className="text-xs rounded-md px-3 h-8 flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium">
            <Plus size={14} /> Add Tone & Style
        </Button>
        {selected.map((tag: string) => (
          <span key={tag} className="bg-neutral-800 text-neutral-400 text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-2 animate-in fade-in zoom-in duration-200">
            {tag} 
            <button onClick={() => toggleTag(tag)} className="hover:text-white transition-colors"><X size={12} /></button>
          </span>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 font-['Poppins']">
            <div className="bg-neutral-950 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] border border-neutral-800">
                <div className="p-6 flex justify-between items-center bg-neutral-900/50">
                    <div>
                        <h3 className="font-bold text-xl text-white">Select Tone & Style</h3>
                        <p className="text-sm text-neutral-500">Define the emotional resonance.</p>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"><X size={24}/></button>
                </div>
                
                <div className="p-8 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                        {options.map((tag: string) => {
                            const isSelected = selected.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`px-4 py-3 rounded-lg text-xs font-medium transition-all flex items-center justify-between group ${
                                        isSelected 
                                        ? 'bg-neutral-200 text-black shadow-lg transform scale-105' 
                                        : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                    }`}
                                >
                                    {tag}
                                    {isSelected && <Check size={14} />}
                                </button>
                            )
                        })}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Custom Tag</label>
                        <div className="flex gap-2">
                            <Input 
                                value={customValue} 
                                onChange={(e: any) => setCustomValue(e.target.value)} 
                                placeholder="e.g. Avant-garde..." 
                                className="bg-neutral-900"
                            />
                            <Button 
                                onClick={() => { 
                                    if(customValue) {
                                        onUpdate([...selected, customValue]); 
                                        setCustomValue(''); 
                                    }
                                }} 
                                variant="secondary"
                                disabled={!customValue}
                                className="px-4"
                            >
                                <Plus size={20} />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-neutral-900/50 flex justify-end">
                    <Button onClick={() => setIsOpen(false)} className="px-8 py-3">Done</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export const Step1_Setup: React.FC<Props> = ({ data, update, onNext }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReview = () => {
    const p = buildIdeasPrompt(data);
    setPromptText(p);
    setShowPrompt(true);
  };

  const handleConfirm = async () => {
    setShowPrompt(false);
    setGenerating(true);
    try {
        const ideas = await generateIdeas(data, promptText);
        update({ ideas });
        onNext();
    } catch (e) {
        console.error(e);
        alert('Failed to generate ideas');
    } finally {
        setGenerating(false);
    }
  };

  const handleReset = async () => {
      if (window.confirm("Are you sure you want to delete all project data? This cannot be undone.")) {
          setResetting(true);
          try {
            // 1. Update React State to Empty FIRST. 
            // This triggers App.tsx to save "empty" data to IDB, overwriting any current data.
            // This prevents the 'old' state from overwriting our clear command later if autosave triggers.
            update(INITIAL_STATE);
            
            // 2. Wait a tick for the update/save to propagate
            await new Promise(r => setTimeout(r, 200));

            // 3. Now verify with a hard DB clear
            await resetFullProject();

            // 4. Reload to flush everything
            window.location.reload();
          } catch (e) {
            console.error("Failed to clear project:", e);
            alert("Failed to reset project.");
            setResetting(false);
          }
      }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20 p-10">
      
      {/* Header Actions */}
      <div className="flex justify-end gap-3 mb-12">
            <Button 
                onClick={handleReset} 
                disabled={resetting}
                variant="secondary" 
                className="text-xs flex items-center gap-2 text-red-400 bg-red-950/20 hover:bg-red-950/40 hover:text-red-300 border border-red-900/30"
            >
                {resetting ? <Spinner /> : <><Trash2 size={14} /> Clear Project</>}
            </Button>
            <Button onClick={() => update(DEMO_STATE)} variant="secondary" className="text-xs flex items-center gap-2">
                <Database size={14} /> Load Demo
            </Button>
      </div>

      <div className="space-y-12">
        {/* Section 1: Core Info */}
        <div className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Product / Brand</label>
                <input 
                    type="text"
                    value={data.productName} 
                    onChange={(e: any) => update({ productName: e.target.value })} 
                    placeholder="Enter Brand Name" 
                    className="w-full bg-transparent text-5xl font-black text-white placeholder-neutral-800 focus:outline-none focus:placeholder-neutral-800 transition-colors tracking-tight"
                />
            </div>
            
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Website URL</label>
                    <Input 
                        value={data.productWebsite} 
                        onChange={(e: any) => update({ productWebsite: e.target.value })} 
                        placeholder="www.example.com"
                        className="text-lg bg-neutral-900/50" 
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider flex items-center gap-2"><Clock size={12}/> Duration</label>
                    <div className="flex bg-neutral-900 rounded p-1">
                        {['15', '30', '60'].map((d) => (
                            <button
                                key={d}
                                onClick={() => update({ duration: d as any })}
                                className={`flex-1 py-2 text-sm font-bold rounded transition-all ${
                                    data.duration === d 
                                    ? 'bg-neutral-700 text-white shadow-sm' 
                                    : 'text-neutral-500 hover:text-neutral-300'
                                }`}
                            >
                                {d}s
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Section 2: Creative Direction */}
        <div>
            <label className="block text-xs font-bold text-neutral-500 mb-4 uppercase tracking-wider flex items-center gap-2"><Sparkles size={12}/> Vibe & Aesthetic</label>
            <TagsSelector 
                options={PROJECT_TAGS} 
                selected={data.tags} 
                onUpdate={(tags: string[]) => update({ tags })}
                customValue={data.customTag}
                setCustomValue={(v: string) => update({ customTag: v })}
            />
        </div>

        {/* Section 3: Constraints */}
        <div className="grid grid-cols-2 gap-8">
            <div>
                <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Mandatory Locations</label>
                <Input 
                    value={data.manualLocations}
                    onChange={(e: any) => update({ manualLocations: e.target.value })}
                    placeholder="e.g. Neon City, Desert..."
                    className="bg-neutral-900/50"
                />
                <p className="text-[10px] text-neutral-600 mt-2">Leave empty for AI creativity.</p>
            </div>
            <div>
                <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Key Subjects</label>
                <Input 
                    value={data.manualSubjects}
                    onChange={(e: any) => update({ manualSubjects: e.target.value })}
                    placeholder="e.g. Hero, Villain..."
                    className="bg-neutral-900/50"
                />
                 <p className="text-[10px] text-neutral-600 mt-2">Leave empty for AI creativity.</p>
            </div>
        </div>

        {/* Section 4: Notes */}
        <div>
            <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider">Additional Direction</label>
            <TextArea 
                value={data.notes}
                onChange={(e: any) => update({ notes: e.target.value })}
                placeholder="Specific story beats, requirements, or creative constraints..."
                className="bg-neutral-900/50 min-h-[120px]"
            />
        </div>
      </div>

      <div className="mt-16">
        <Button 
            onClick={handleReview} 
            className="w-full py-4 text-lg font-bold tracking-wide flex items-center justify-center gap-3 bg-white text-black hover:bg-neutral-200" 
            disabled={!data.productName || generating}
        >
            {generating ? <Spinner /> : <>GENERATE CONCEPTS <ArrowRight size={20} /></>}
        </Button>
      </div>

      <PromptModal 
        isOpen={showPrompt} 
        prompt={promptText} 
        onChange={(val) => setPromptText(val)}
        onCancel={() => setShowPrompt(false)}
        onConfirm={handleConfirm}
        isGenerating={generating}
      />
    </div>
  );
};