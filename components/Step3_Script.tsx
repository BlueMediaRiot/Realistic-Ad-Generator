import React, { useState } from 'react';
import { ProjectState, Subject, Location } from '../types';
import { Button, Card, Spinner, PromptModal, TextArea, Input } from './UIComponents';
import { generateScriptAndBreakdown, generateScriptAudio, buildScriptPrompt } from '../services/geminiService';
import { ArrowRight, FileText, Users, MapPin, PlayCircle, Volume2, Wand2, Plus, Trash2 } from 'lucide-react';

interface Props {
  data: ProjectState;
  update: (updates: Partial<ProjectState>) => void;
  onNext: () => void;
}

export const Step3_Script: React.FC<Props> = ({ data, update, onNext }) => {
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');

  const handleReview = () => {
    if (!data.selectedIdeaId) return;
    const idea = data.ideas.find(i => i.id === data.selectedIdeaId);
    if (!idea) return;

    const p = buildScriptPrompt(data, idea.id);
    setPromptText(p);
    setShowPrompt(true);
  };

  const handleConfirm = async () => {
    if (!data.selectedIdeaId) return;
    const idea = data.ideas.find(i => i.id === data.selectedIdeaId);
    if (!idea) return;

    setShowPrompt(false);
    setLoading(true);
    try {
        const res = await generateScriptAndBreakdown(idea, data.globalPrompt, promptText);
        update(res);
    } catch (e) {
        setError('Failed to generate script.');
    } finally {
        setLoading(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!data.scriptText) return;
    setAudioLoading(true);
    try {
        const url = await generateScriptAudio(data.scriptText);
        update({ scriptAudioUrl: url });
    } catch (e) {
        console.error(e);
        alert('Failed to generate audio');
    } finally {
        setAudioLoading(false);
    }
  };

  // --- Editing Functions ---

  const handleScriptChange = (text: string) => {
      update({ scriptText: text });
  };

  const addSubject = () => {
      const newSubject: Subject = {
          id: `manual-subj-${Date.now()}`,
          name: 'New Subject',
          letter: 'Z',
          description: 'Description here...',
          image: null
      };
      update({ subjects: [...data.subjects, newSubject] });
  };

  const removeSubject = (id: string) => {
      update({ subjects: data.subjects.filter(s => s.id !== id) });
  };

  const updateSubject = (id: string, field: keyof Subject, value: string) => {
      update({ subjects: data.subjects.map(s => s.id === id ? { ...s, [field]: value } : s) });
  };

  const addLocation = () => {
      const newLoc: Location = {
          id: `manual-loc-${Date.now()}`,
          name: 'New Location',
          letter: 'Z',
          description: 'Description here...',
          timeOfDay: 'Daylight',
          image: null
      };
      update({ locations: [...data.locations, newLoc] });
  };

  const removeLocation = (id: string) => {
      update({ locations: data.locations.filter(l => l.id !== id) });
  };

   const updateLocation = (id: string, field: keyof Location, value: string) => {
      update({ locations: data.locations.map(l => l.id === id ? { ...l, [field]: value } : l) });
  };


  if (!data.scriptText && !loading) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 p-10">
              <FileText size={64} className="text-neutral-700" />
              <h2 className="text-2xl font-bold text-neutral-300">Ready to Write</h2>
              <p className="text-neutral-400 max-w-md">The AI will now turn your selected concept into a full screenplay and break down the required characters and locations.</p>
              <Button onClick={handleReview} className="px-8 py-3 text-lg">
                  <Wand2 size={20} className="inline mr-2" /> Write Script
              </Button>
              <PromptModal 
                isOpen={showPrompt} 
                prompt={promptText} 
                onChange={(val) => setPromptText(val)}
                onCancel={() => setShowPrompt(false)} 
                onConfirm={handleConfirm} 
                isGenerating={loading} 
              />
          </div>
      )
  }

  if (loading && !data.scriptText) {
    return (
        <div className="flex flex-col items-center justify-center h-64 p-10">
            <Spinner />
            <p className="mt-4 text-neutral-400">Writing Script & Breakdown...</p>
        </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 pb-20 p-10">
      <div className="space-y-4">
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg h-[600px] flex flex-col shadow-lg">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-neutral-900 pb-2 border-b border-neutral-800">
             <div className="flex items-center gap-2">
                <FileText size={18} />
                <h3 className="font-bold">Script</h3>
             </div>
             <div className="flex gap-2">
                 <Button variant="secondary" onClick={handleReview} disabled={loading} className="text-xs py-1 px-2">Regenerate</Button>
                {!data.scriptAudioUrl && (
                    <Button 
                        onClick={handleGenerateAudio} 
                        disabled={audioLoading} 
                        variant="secondary" 
                        className="text-xs py-1 px-2 flex items-center gap-1"
                    >
                        {audioLoading ? <Spinner /> : <><Volume2 size={14} /> Table Read</>}
                    </Button>
                )}
             </div>
          </div>
          
          <TextArea 
            value={data.scriptText}
            onChange={(e: any) => handleScriptChange(e.target.value)}
            className="flex-1 font-mono text-sm bg-neutral-950/50 text-neutral-300 resize-none border-none focus:ring-0 p-4"
          />

          {data.scriptAudioUrl && (
              <div className="bg-neutral-800 p-3 rounded flex items-center gap-3 mt-4">
                 <PlayCircle size={24} className="text-blue-400" />
                 <audio controls src={data.scriptAudioUrl} className="w-full h-8" />
              </div>
          )}
        </div>
      </div>

      <div className="space-y-4 h-[600px] overflow-y-auto pr-2">
        <div className="bg-blue-900/20 border border-blue-900 p-4 rounded-lg mb-4">
            <h4 className="font-bold text-blue-200 mb-1">Breakdown Complete</h4>
            <p className="text-sm text-blue-300">Review and edit the identified subjects and locations below.</p>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-2 text-neutral-300">
            <div className="flex items-center gap-2"><Users size={16} /> <h4 className="font-bold">Subjects ({data.subjects.length})</h4></div>
            <button onClick={addSubject} className="text-xs bg-neutral-800 hover:bg-neutral-700 p-1 rounded"><Plus size={14}/></button>
          </div>
          <div className="space-y-2">
            {data.subjects.map(s => (
              <div key={s.id} className="text-sm bg-neutral-800 p-3 rounded space-y-2 group">
                <div className="flex justify-between items-center">
                    <div className="flex gap-2 w-full">
                        <input 
                            value={s.letter} 
                            onChange={(e) => updateSubject(s.id, 'letter', e.target.value)}
                            className="w-8 bg-neutral-900 text-center font-bold rounded text-xs border border-neutral-700" 
                        />
                        <input 
                            value={s.name} 
                            onChange={(e) => updateSubject(s.id, 'name', e.target.value)}
                            className="bg-transparent font-bold text-white w-full focus:outline-none" 
                        />
                    </div>
                    <button onClick={() => removeSubject(s.id)} className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                </div>
                <TextArea 
                    value={s.description} 
                    onChange={(e: any) => updateSubject(s.id, 'description', e.target.value)}
                    className="text-xs bg-neutral-900/50 min-h-[60px]"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2 text-neutral-300">
            <div className="flex items-center gap-2"><MapPin size={16} /> <h4 className="font-bold">Locations ({data.locations.length})</h4></div>
            <button onClick={addLocation} className="text-xs bg-neutral-800 hover:bg-neutral-700 p-1 rounded"><Plus size={14}/></button>
          </div>
          <div className="space-y-2">
            {data.locations.map(l => (
              <div key={l.id} className="text-sm bg-neutral-800 p-3 rounded space-y-2 group">
                 <div className="flex justify-between items-center">
                    <div className="flex gap-2 w-full">
                        <input 
                            value={l.letter} 
                            onChange={(e) => updateLocation(l.id, 'letter', e.target.value)}
                            className="w-8 bg-neutral-900 text-center font-bold rounded text-xs border border-neutral-700" 
                        />
                        <input 
                            value={l.name} 
                            onChange={(e) => updateLocation(l.id, 'name', e.target.value)}
                            className="bg-transparent font-bold text-white w-full focus:outline-none" 
                        />
                    </div>
                    <button onClick={() => removeLocation(l.id)} className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                </div>
                 <div className="flex gap-2">
                     <select 
                        value={l.timeOfDay} 
                        onChange={(e) => updateLocation(l.id, 'timeOfDay', e.target.value)}
                        className="bg-neutral-900 text-xs px-2 py-1 rounded border border-neutral-700"
                     >
                         <option>Morning</option>
                         <option>Daylight</option>
                         <option>Sunset</option>
                         <option>Night</option>
                     </select>
                 </div>
                 <TextArea 
                    value={l.description} 
                    onChange={(e: any) => updateLocation(l.id, 'description', e.target.value)}
                    className="text-xs bg-neutral-900/50 min-h-[60px]"
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="fixed bottom-4 left-0 right-0 max-w-5xl mx-auto px-4">
        <Button onClick={onNext} className="w-full shadow-lg">
          Confirm Script & Proceed <ArrowRight size={16} className="inline ml-2"/>
        </Button>
      </div>
      
      <PromptModal 
        isOpen={showPrompt} 
        prompt={promptText} 
        onChange={(val) => setPromptText(val)}
        onCancel={() => setShowPrompt(false)} 
        onConfirm={handleConfirm} 
        isGenerating={loading} 
      />
    </div>
  );
};