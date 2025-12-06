import React, { useState, useEffect, useRef } from 'react';
import { ProjectState, PromptTemplates } from '../types';
import {
    Terminal, ChevronUp, ChevronDown, Settings,
    LayoutDashboard, Sparkles, FileText, Palette,
    Users, MapPin, ListVideo, LayoutGrid,
    ChevronLeft, ChevronRight, Key, Film, Video,
    LayoutTemplate, Presentation, AlertTriangle, X
} from 'lucide-react';
import { Spinner, Button, TextArea, Select } from './UIComponents';

interface Props {
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
  globalPrompt: string;
  setGlobalPrompt: (prompt: string) => void;
  promptTemplates: PromptTemplates;
  setPromptTemplates: (templates: PromptTemplates) => void;
  projectData?: ProjectState; // Added to access state for completion checks
}

const STEPS = [
  { label: "Setup", icon: LayoutDashboard },
  { label: "Ideas", icon: Sparkles },
  { label: "Script", icon: FileText },
  { label: "Look", icon: Palette },
  { label: "Subjects", icon: Users },
  { label: "Locations", icon: MapPin },
  { label: "Shot List", icon: ListVideo },
  { label: "Storyboard", icon: LayoutGrid },
  { label: "Pitch Deck", icon: Presentation }
];

// Helper to simulate live typing
const TypewriterText = ({ text }: { text: string }) => {
    const [displayed, setDisplayed] = useState('');
    
    useEffect(() => {
        let i = 0;
        const speed = 5; // ms per char
        const t = setInterval(() => {
            setDisplayed(text.substring(0, i));
            i += 4; // Batch chars for speed
            if (i > text.length) clearInterval(t);
        }, speed);
        return () => clearInterval(t);
    }, [text]);

    return <>{displayed}{displayed.length < text.length && <span className="animate-pulse">_</span>}</>;
};

const PromptLogger = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<{timestamp: Date, model: string, prompt: string}[]>([]);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleLog = (e: any) => {
            setLogs(prev => [...prev, e.detail]);
            setIsOpen(true); // Auto open on new log
        };
        window.addEventListener('gemini-api-log', handleLog);
        return () => window.removeEventListener('gemini-api-log', handleLog);
    }, []);

    useEffect(() => {
        if(isOpen && endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isOpen]);

    if (logs.length === 0) return null;

    return (
        <div className={`fixed bottom-0 right-0 z-[100] bg-black/95 border-t border-l border-green-900/30 transition-all duration-300 font-mono text-xs text-green-400 print:hidden ${isOpen ? 'w-[600px] h-64' : 'w-48 h-8 rounded-tl-lg'}`}>
            <div 
                className="h-8 bg-green-900/10 flex items-center justify-between px-4 cursor-pointer hover:bg-green-900/20"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                    <Terminal size={12} /> {isOpen ? 'Live LLM Logs' : `Logs (${logs.length})`}
                </div>
                {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </div>
            
            {isOpen && (
                <div className="h-56 overflow-y-auto p-4 space-y-6">
                    {logs.map((log, i) => (
                        <div key={i} className="pb-4 border-b border-green-900/10 last:border-0">
                            <div className="flex gap-4 mb-2 opacity-50 text-[10px]">
                                <span>[{log.timestamp.toLocaleTimeString()}]</span>
                                <span className="text-yellow-400 font-bold uppercase">{log.model}</span>
                            </div>
                            <pre className="whitespace-pre-wrap break-words opacity-90 pl-4 border-l-2 border-green-500/50 text-[11px] leading-relaxed">
                                <TypewriterText text={log.prompt} />
                            </pre>
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>
            )}
        </div>
    );
};

export const Layout: React.FC<Props> = ({ currentStep, onStepChange, children, globalPrompt, setGlobalPrompt, promptTemplates, setPromptTemplates, projectData }) => {
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'global' | 'templates'>('global');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [skippedApiKey, setSkippedApiKey] = useState(false);
  const [showLimitedBanner, setShowLimitedBanner] = useState(false);

  // Template Editing State
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<keyof PromptTemplates>('ideas');
  const [tempTemplateValue, setTempTemplateValue] = useState('');

  useEffect(() => {
    checkKey();
    const skipped = localStorage.getItem('mediariot_skipped_api_key') === 'true';
    if (skipped) {
      setSkippedApiKey(true);
      setShowLimitedBanner(true);
    }
    const handleAuthError = (e: any) => {
      setHasKey(false);
      setErrorMessage(e.detail);
    };
    window.addEventListener('gemini-auth-error', handleAuthError);
    return () => window.removeEventListener('gemini-auth-error', handleAuthError);
  }, []);

  useEffect(() => {
      if (promptTemplates) {
          setTempTemplateValue(promptTemplates[selectedTemplateKey]);
      }
  }, [selectedTemplateKey, promptTemplates]);

  const checkKey = async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const has = await aistudio.hasSelectedApiKey();
        setHasKey(has);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
        setErrorMessage('');
        await aistudio.openSelectKey();
        setHasKey(true);
        localStorage.removeItem('mediariot_skipped_api_key');
        setSkippedApiKey(false);
        setShowLimitedBanner(false);
    }
  };

  const handleSkipApiKey = () => {
    localStorage.setItem('mediariot_skipped_api_key', 'true');
    setSkippedApiKey(true);
    setShowLimitedBanner(true);
  };

  const handleSaveTemplate = () => {
      setPromptTemplates({
          ...promptTemplates,
          [selectedTemplateKey]: tempTemplateValue
      });
  };

  // Helper to determine if step is complete (Blue Icon)
  const isStepComplete = (index: number) => {
      if (!projectData) return false;
      const stepNum = index + 1;
      
      switch(stepNum) {
          case 1: return !!projectData.productName;
          case 2: return projectData.ideas.length > 0;
          case 3: return !!projectData.scriptText;
          case 4: return true; // Look is always "active" once visited really
          case 5: return projectData.subjects.some(s => s.image);
          case 6: return projectData.locations.some(l => l.image);
          case 7: return projectData.shots.length > 0;
          case 8: return projectData.shots.some(s => s.image);
          case 9: return false; // Pitch deck
          default: return false;
      }
  };

  if (checking) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center"><Spinner /></div>;
  }

  if (!hasKey && !skippedApiKey) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 font-['Poppins']">
        <div className="bg-neutral-900 p-12 rounded-2xl max-w-md w-full shadow-2xl text-center">
            <div className="inline-flex bg-white text-black p-4 rounded-xl mb-8 shadow-lg shadow-white/10">
                <Video size={40} />
            </div>
            <h1 className="text-3xl font-bold mb-3 tracking-tight">MediaRiot AI</h1>
            <p className="text-neutral-500 mb-8 leading-relaxed">Connect your Gemini API key to start creating commercial content.</p>
            {errorMessage && (
                <div className="bg-red-900/20 text-red-400 p-4 rounded-lg mb-6 text-sm">
                    {errorMessage}
                </div>
            )}
            <Button onClick={handleConnect} className="w-full py-4 text-lg shadow-xl shadow-blue-900/10 mb-3">
                <Key size={20} className="inline mr-2" /> Connect API Key
            </Button>
            <Button onClick={handleSkipApiKey} variant="secondary" className="w-full py-3 text-sm">
                Continue Without API Key
            </Button>
            <div className="bg-yellow-900/20 border border-yellow-900/30 text-yellow-400 p-3 rounded-lg mt-6 text-xs text-left">
                <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold mb-1">Limited Mode</p>
                        <p className="text-yellow-500/80">Without an API key, AI generation features will be disabled. You can manually input and organize your project data.</p>
                    </div>
                </div>
            </div>
             <p className="text-[10px] text-neutral-600 mt-6 uppercase tracking-wider">
                Powered by Google Gemini Pro & Veo Models
            </p>
        </div>
      </div>
    );
  }

  const TEMPLATE_OPTIONS = [
      { value: 'ideas', label: 'Ideas Generation' },
      { value: 'script', label: 'Script Writing' },
      { value: 'shotList', label: 'Shot List Breakdown' },
      { value: 'subject', label: 'Subject Image' },
      { value: 'location', label: 'Location Image' },
      { value: 'storyboard', label: 'Storyboard Shot' },
  ];

  const sidebarWidth = isSidebarCollapsed ? "w-[70px]" : "w-[200px]";

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-['Poppins'] overflow-hidden selection:bg-blue-500/30">
      
      {/* Sidebar Navigation - print:hidden */}
      <aside className={`${sidebarWidth} bg-neutral-900 border-r border-neutral-800 flex flex-col transition-all duration-300 ease-in-out z-50 print:hidden`}>
          {/* Header */}
          <div className="h-20 flex items-center px-4 justify-between border-b border-neutral-800/50">
              <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                  <div className="w-7 h-7 bg-white text-black rounded flex items-center justify-center shrink-0 shadow-lg shadow-white/5">
                      <Film size={14} fill="currentColor" />
                  </div>
                  <h1 className="text-base font-bold tracking-tight whitespace-nowrap">MediaRiot</h1>
              </div>
              
              {isSidebarCollapsed && (
                  <div className="w-full flex justify-center">
                    <div className="w-7 h-7 bg-white text-black rounded flex items-center justify-center shrink-0">
                        <Film size={14} fill="currentColor" />
                    </div>
                  </div>
              )}

              <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className={`p-1 rounded-full hover:bg-neutral-800 text-neutral-400 transition-colors ${isSidebarCollapsed ? 'hidden' : 'block'}`}
              >
                  <ChevronLeft size={16} />
              </button>
          </div>
          
          {isSidebarCollapsed && (
             <button 
                onClick={() => setIsSidebarCollapsed(false)}
                className="mx-auto mt-4 p-2 rounded-full hover:bg-neutral-800 text-neutral-400"
             >
                <ChevronRight size={16} />
             </button>
          )}

          {/* Menu List */}
          <ul className="flex-1 overflow-y-auto px-2 py-6 space-y-1 no-scrollbar">
              {STEPS.map((step, index) => {
                  const stepNum = index + 1;
                  const isActive = currentStep === stepNum;
                  const isComplete = isStepComplete(index);
                  const Icon = step.icon;

                  return (
                      <li key={step.label} className="relative group">
                          <button
                            onClick={() => onStepChange(stepNum)}
                            className={`w-full flex items-center h-10 rounded-md transition-all duration-200 group-hover:bg-neutral-800 ${
                                isActive 
                                ? 'bg-neutral-800 text-white shadow-sm' 
                                : isComplete 
                                    ? 'text-neutral-300 hover:text-white' 
                                    : 'text-neutral-500 hover:text-white'
                            } ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'}`}
                            title={isSidebarCollapsed ? step.label : undefined}
                          >
                              <Icon 
                                size={18} 
                                className={`shrink-0 transition-transform duration-200 ${isComplete && !isActive ? 'text-blue-400' : ''}`} 
                              />
                              
                              <span className={`font-medium text-xs whitespace-nowrap transition-all duration-200 ${isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                                  {step.label}
                              </span>
                          </button>
                          
                          {isSidebarCollapsed && (
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-white text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg whitespace-nowrap z-50">
                                  {step.label}
                              </div>
                          )}
                      </li>
                  )
              })}
          </ul>

          <div className="p-3 border-t border-neutral-800/50">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className={`w-full flex items-center h-10 rounded-md transition-all duration-200 hover:bg-neutral-800 text-neutral-400 hover:text-white ${isSidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-3'}`}
              >
                  <Settings size={18} />
                  <span className={`font-medium text-xs whitespace-nowrap transition-all duration-200 ${isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                      Settings
                  </span>
              </button>
          </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-neutral-950 relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

          {/* Limited Mode Banner */}
          {showLimitedBanner && !hasKey && (
              <div className="relative z-20 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-b border-yellow-900/50 print:hidden">
                  <div className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                          <AlertTriangle size={20} className="text-yellow-400 shrink-0" />
                          <div>
                              <p className="text-sm font-bold text-yellow-100">Limited Mode Active</p>
                              <p className="text-xs text-yellow-400/80">AI generation features are disabled. Connect an API key to unlock full functionality.</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <Button onClick={handleConnect} variant="accent" className="text-xs py-2 px-4">
                              <Key size={14} className="inline mr-1" /> Connect API Key
                          </Button>
                          <button
                              onClick={() => setShowLimitedBanner(false)}
                              className="p-1.5 hover:bg-yellow-900/20 rounded text-yellow-400 hover:text-yellow-300 transition-colors"
                              title="Hide banner"
                          >
                              <X size={16} />
                          </button>
                      </div>
                  </div>
              </div>
          )}

          <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth">
                {children}
          </div>
      </div>

      <PromptLogger />

      {/* Global Settings Modal - print:hidden */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 font-['Poppins'] print:hidden">
            <div className="bg-neutral-950 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[85vh] border border-neutral-800">
                <div className="flex px-4 pt-4 gap-2">
                    <button 
                        onClick={() => setActiveSettingsTab('global')}
                        className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 rounded-t-lg transition-colors ${activeSettingsTab === 'global' ? 'bg-neutral-900 text-white border-t border-x border-neutral-800' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        <Palette size={16} /> Global Style
                    </button>
                    <button 
                        onClick={() => setActiveSettingsTab('templates')}
                        className={`px-6 py-3 text-sm font-semibold flex items-center gap-2 rounded-t-lg transition-colors ${activeSettingsTab === 'templates' ? 'bg-neutral-900 text-white border-t border-x border-neutral-800' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        <LayoutTemplate size={16} /> Prompt Templates
                    </button>
                    <div className="flex-1 border-b border-neutral-800"></div>
                    <button onClick={() => setIsSettingsOpen(false)} className="px-4 text-neutral-500 hover:text-white border-b border-neutral-800">
                        <Settings size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden p-8 bg-neutral-900 rounded-b-2xl rounded-tr-2xl">
                    {activeSettingsTab === 'global' ? (
                        <div className="h-full flex flex-col">
                            <h3 className="font-bold text-lg mb-2 text-white">Director's Instructions</h3>
                            <p className="text-sm text-neutral-500 mb-6">
                                These instructions are appended to the prompts for Script, Shot List, and Asset generation, ensuring a consistent project voice.
                            </p>
                            <TextArea 
                                value={globalPrompt}
                                onChange={(e: any) => setGlobalPrompt(e.target.value)}
                                className="flex-1 font-mono text-sm leading-relaxed p-6 bg-neutral-950 rounded-xl"
                                placeholder="e.g. Visual Style: Cyberpunk..."
                            />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-lg text-white">Prompt Templates</h3>
                                    <p className="text-sm text-neutral-500">Edit the base templates used by the AI. Use <span className="font-mono text-blue-400">{'{{variable}}'}</span> for dynamic data.</p>
                                </div>
                                <div className="w-64">
                                    <Select 
                                        value={selectedTemplateKey}
                                        onChange={(e: any) => setSelectedTemplateKey(e.target.value)}
                                        options={TEMPLATE_OPTIONS}
                                        className="bg-neutral-950"
                                    />
                                </div>
                            </div>
                            
                            <TextArea 
                                value={tempTemplateValue}
                                onChange={(e: any) => setTempTemplateValue(e.target.value)}
                                className="flex-1 font-mono text-xs leading-relaxed p-6 bg-neutral-950 rounded-xl border-none"
                            />
                            
                            <div className="mt-6 flex justify-end">
                                <Button onClick={handleSaveTemplate} variant="primary" className="px-6">Save Template Changes</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};