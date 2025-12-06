import React, { useState } from 'react';
import { ProjectState, Idea } from '../types';
import { Button, Card, Spinner, PromptModal } from './UIComponents';
import { generateIdeas, buildIdeasPrompt } from '../services/geminiService';
import { RefreshCw, ArrowRight } from 'lucide-react';

interface Props {
  data: ProjectState;
  update: (updates: Partial<ProjectState>) => void;
  onNext: () => void;
}

export const Step2_Ideas: React.FC<Props> = ({ data, update, onNext }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');

  const handleReview = () => {
      const p = buildIdeasPrompt(data);
      setPromptText(p);
      setShowPrompt(true);
  };

  const handleConfirm = async () => {
    setShowPrompt(false);
    setLoading(true);
    setError('');
    try {
      const ideas = await generateIdeas(data, promptText);
      update({ ideas });
    } catch (e) {
      setError('Failed to generate ideas. Please check permissions and try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectIdea = (id: string) => {
    update({ selectedIdeaId: id });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 p-10">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Select a Concept</h2>
        <Button onClick={handleReview} variant="secondary" disabled={loading}>
          {loading ? <Spinner /> : <><RefreshCw size={16} className="inline mr-2"/> Regenerate</>}
        </Button>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <div className="grid gap-4">
        {data.ideas.map((idea) => (
          <Card 
            key={idea.id} 
            active={data.selectedIdeaId === idea.id}
            onClick={() => selectIdea(idea.id)}
            className="hover:bg-neutral-800 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold">{idea.title}</h3>
              <div className="flex gap-2 text-xs text-neutral-400">
                <span>{idea.locationCount} Locs</span>
                <span>•</span>
                <span>{idea.subjectCount} Subjects</span>
              </div>
            </div>
            <p className="text-neutral-300 text-sm mb-3">{idea.synopsis}</p>
            <div className="flex gap-4 text-xs text-neutral-500">
               <div><span className="font-bold text-neutral-400">Locs:</span> {idea.locationNames?.join(', ')}</div>
               <div><span className="font-bold text-neutral-400">Subjects:</span> {idea.subjectBriefs?.join(', ')}</div>
            </div>
          </Card>
        ))}
        {data.ideas.length === 0 && !loading && (
             <div className="text-center py-20 text-neutral-500 border-2 border-dashed border-neutral-800 rounded-lg">
                 No ideas generated yet. Click Regenerate to start.
             </div>
        )}
      </div>

      <div className="pt-4 sticky bottom-4 z-10">
        <Button 
          onClick={onNext} 
          className="w-full shadow-lg" 
          disabled={!data.selectedIdeaId || loading}
        >
          GENERATE SCRIPT <ArrowRight size={16} className="inline ml-2"/>
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