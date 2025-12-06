import React, { useState } from 'react';
import { ProjectState, ImageSize } from '../types';
import { Button, Card, Spinner, Select, PromptModal } from './UIComponents';
import { generateLookLock, buildLookLockPrompt } from '../services/geminiService';
import { ArrowRight, Wand2, AlertTriangle } from 'lucide-react';

interface Props {
  data: ProjectState;
  update: (updates: Partial<ProjectState>) => void;
  onNext: () => void;
}

export const Step6_LookLock: React.FC<Props> = ({ data, update, onNext }) => {
  const [generating, setGenerating] = useState(false);
  const [imageSize, setImageSize] = useState<ImageSize>('1K'); 
  const [results, setResults] = useState<Record<string, string>>({});
  
  const [pending, setPending] = useState<{subjId: string, prompt: string} | null>(null);

  const defaultLocation = data.locations[0];

  const handleReview = (subjId: string) => {
      const p = buildLookLockPrompt(data.globalPrompt);
      setPending({ subjId, prompt: p });
  };

  const handleConfirm = async () => {
    if (!pending) return;
    if (!defaultLocation || !defaultLocation.image) return;
    
    const subj = data.subjects.find(c => c.id === pending.subjId);
    if (!subj || !subj.image) return;

    setPending(null);
    setGenerating(true);
    try {
      const url = await generateLookLock(
          subj.image.url, 
          defaultLocation.image.url, 
          imageSize, 
          data.globalPrompt, 
          pending.prompt
      );
      setResults(prev => ({ ...prev, [pending.subjId]: url }));
    } catch (e) {
      console.error(e);
      alert('Failed to generate composite');
    } finally {
      setGenerating(false);
    }
  };

  if (!defaultLocation?.image) {
      return (
          <div className="text-center py-20">
              <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
              <h2 className="text-xl font-bold">Missing Location Assets</h2>
              <p className="text-neutral-400">Please go back and generate at least one location image to create Look Locks.</p>
          </div>
      )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-lg border border-neutral-800 sticky top-0 z-20">
        <div>
            <h2 className="text-xl font-bold">Look Lock</h2>
            <p className="text-xs text-neutral-400">Compositing Subjects into {defaultLocation.name}</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400">Size:</span>
            <Select 
                value={imageSize} 
                onChange={(e: any) => setImageSize(e.target.value)} 
                options={[{value:'1K', label:'1K (HD)'}, {value:'2K', label:'2K'}, {value:'4K', label:'4K'}]}
                className="w-24 py-1"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {data.subjects.map(subj => (
          <Card key={subj.id} className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">{subj.name} in Context</h3>
             </div>

             <div className="grid grid-cols-3 gap-2 mb-4">
                 {/* Source Images Preview */}
                 <div className="relative group">
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1 rounded">Subject Source</div>
                    {subj.image ? <img src={subj.image.url} className="w-full h-24 object-cover rounded border border-neutral-700 opacity-70" alt="char source"/> : <div className="h-24 bg-neutral-800 rounded"></div>}
                 </div>
                 <div className="relative group">
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1 rounded">Loc Source</div>
                    {defaultLocation.image ? <img src={defaultLocation.image.url} className="w-full h-24 object-cover rounded border border-neutral-700 opacity-70" alt="loc source"/> : <div className="h-24 bg-neutral-800 rounded"></div>}
                 </div>
                 <div className="flex items-center justify-center">
                    <Button 
                        onClick={() => handleReview(subj.id)}
                        disabled={generating || !subj.image}
                        className="w-full h-full flex flex-col items-center justify-center gap-2"
                        variant="secondary"
                    >
                        {generating ? <Spinner /> : <><Wand2 size={24} /> <span>FUSE</span></>}
                    </Button>
                 </div>
             </div>

             <div className="aspect-video bg-neutral-950 rounded-lg overflow-hidden flex items-center justify-center border border-neutral-800">
                {results[subj.id] ? (
                    <img src={results[subj.id]} alt="Composite" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-neutral-700 italic">Generate to see {subj.name} in location</div>
                )}
             </div>
          </Card>
        ))}
      </div>

      <PromptModal 
        isOpen={!!pending} 
        prompt={pending?.prompt || ''} 
        onChange={(val) => setPending(prev => prev ? {...prev, prompt: val} : null)}
        onCancel={() => setPending(null)}
        onConfirm={handleConfirm}
        isGenerating={generating}
      />

      <div className="fixed bottom-4 left-0 right-0 max-w-4xl mx-auto px-4 z-20">
        <Button onClick={onNext} className="w-full shadow-lg">
          GENERATE STORYBOARD <ArrowRight size={16} className="inline ml-2"/>
        </Button>
      </div>
    </div>
  );
};