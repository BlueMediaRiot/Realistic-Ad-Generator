import React, { useState, useEffect, useRef } from 'react';
import { ProjectState, Shot, ImageSize, Subject, Location, StyleReference, SketchSheet } from '../types';
import { Button, Card, TextArea, Spinner, ImageUpload, Select, PromptModal } from './UIComponents';
import { generateImage, generateShotVideo, generateStoryboardSketch } from '../services/geminiService';
import { Wand2, Video, Settings, X, RefreshCw, Check, Image as ImageIcon, Film, Aperture, Video as VideoIcon, Download, PenTool, Play, StopCircle } from 'lucide-react';
import { CAMERA_MOVES, SHOT_REF_OPTIONS } from '../constants';

interface Props {
  data: ProjectState;
  update: (updates: Partial<ProjectState>) => void;
}

export const Step7_Storyboard: React.FC<Props> = ({ data, update }) => {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [videoGeneratingId, setVideoGeneratingId] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [editingShotId, setEditingShotId] = useState<string | null>(null);
  const [generatingSketch, setGeneratingSketch] = useState(false);
  
  // Sequencing State
  const [isSequencing, setIsSequencing] = useState(false);
  const stopSequenceRef = useRef(false);
  
  // Prompt Modal States
  const [pendingImage, setPendingImage] = useState<{shot: Shot, prompt: string, assets: string[], lens: string} | null>(null);
  const [pendingVideo, setPendingVideo] = useState<{shot: Shot, prompt: string} | null>(null);

  // --- Perspective Helper Logic ---
  const getPerspectiveLogic = (lens: string, aperture: string) => {
      let focalLength = 35; // default to standard
      const lensNum = parseInt(lens.replace(/\D/g, ''));
      if (!isNaN(lensNum)) focalLength = lensNum;

      let perspectiveNote = "";
      if (focalLength <= 24) {
          perspectiveNote = "LENS LOGIC: Wide Angle Lens. Expansive background, distinct barrel distortion, deep depth of field. Show MORE of the environment than reference images.";
      } else if (focalLength >= 85) {
          perspectiveNote = "LENS LOGIC: Telephoto Compression. Narrow field of view, significant background compression. Background must appear closer and larger relative to subject. CROP HEAVILY into the environment reference. Do NOT show the full room.";
      } else {
          perspectiveNote = "LENS LOGIC: Standard Lens. Natural perspective and compression.";
      }

      // Aperture / Bokeh Logic
      let apertureNum = 4.0;
      const fNum = parseFloat(aperture.replace(/[f/]/g, ''));
      if(!isNaN(fNum)) apertureNum = fNum;

      if (apertureNum <= 2.8) {
          perspectiveNote += " BOKEH: High. Background must be significantly blurred/out-of-focus to isolate subject.";
      } else if (apertureNum >= 8.0) {
          perspectiveNote += " FOCUS: Deep. Background should be relatively sharp.";
      }

      return perspectiveNote;
  }

  // --- Helper to build default prompt (DoP Template) ---
  const buildDefaultPrompt = (shot: Shot) => {
    const loc = data.locations.find(l => l.id === shot.locationId);
    const relevantSubjs = data.subjects.filter(c => shot.subjectIds.includes(c.id));
    const look = data.lookSettings;

    let template = data.promptTemplates?.storyboard || "";

    const locVisuals = loc?.visualDetails || "Standard location details";
    const locName = loc ? `Location_${loc.letter}` : "Location";
    const locFile = loc?.image?.filename || `${locName}_01.jpg`;
    const locWeather = loc?.weather || 'Clear';
    const locTime = loc?.timeOfDay || 'Daylight';

    const motivation = look.detailedLighting?.motivation?.join(', ') || 'Motivated';
    const hardness = look.detailedLighting?.quality?.join(', ') || 'Soft';
    const visualKey = look.detailedLighting?.visualKey?.join(', ') || 'Mid-Key';
    const atmosphere = look.detailedLighting?.atmosphere?.join(', ') || 'Clean Air';
    const lighting = `${motivation}, ${hardness}, ${visualKey}, ${atmosphere}`;

    const colorGradeDNA = look.colorGrade?.analysis ? `\nCOLOR GRADING DNA (Strictly Enforce): ${look.colorGrade.analysis}` : '';

    const perspectiveInstructions = getPerspectiveLogic(shot.lens || '50mm', shot.aperture || 'f/2.8');

    // Subject Description Construction
    let subjectSection = "No human subjects.";
    if (relevantSubjs.length > 0) {
        subjectSection = relevantSubjs.map(s => {
            const subjName = `Subject_${s.letter}`;
            const subjFile = s.image?.filename || `${subjName}_01.jpg`;
            return `Subject: ${subjName} (${s.name}).
Identity: Keep attire and facial features consistent with ${subjFile}.
Visual Details: ${s.visualDetails || 'Standard look'}.
Action: ${shot.action || 'Neutral action'}.`;
        }).join('\n');
    }

    // Reference logic
    let refNotes = "";
    if (shot.referenceImage) refNotes += `\n- Ref Image 1 (Uploaded): Primary visual reference.`;
    
    if (shot.selectedAssetIds && shot.assetReferenceTypes) {
        shot.selectedAssetIds.forEach((id, idx) => {
            const types = shot.assetReferenceTypes?.[id] || ['General Reference'];
            const typeStr = types.join(', ');
            // Image index offset by 1 if there's an uploaded ref
            const imgIndex = (shot.referenceImage ? 2 : 1) + idx; 
            refNotes += `\n- Ref Image ${imgIndex}: Use for [${typeStr}].`;
        });
    }

    // Variable Replacement
    template = template.replace('{{subjectSection}}', subjectSection);
    template = template.replace('{{location}}', `${locName} (${loc?.name})`);
    template = template.replace('{{sceneDescription}}', shot.sceneDescription);
    template = template.replace('{{time}}', locTime);
    template = template.replace('{{weather}}', locWeather);
    template = template.replace('{{visualDetails}}', locVisuals);
    template = template.replace('{{camera}}', look.camera);
    template = template.replace('{{lens}}', shot.lens || 'Standard');
    template = template.replace('{{aperture}}', shot.aperture || 'f/2.8');
    template = template.replace('{{focus}}', shot.focus || 'Subject');
    template = template.replace('{{movement}}', shot.cameraMove || 'Static');
    template = template.replace('{{cameraSpot}}', shot.cameraSpot || 'Optimal');
    template = template.replace('{{cameraRelation}}', shot.cameraRelation || 'N/A');
    template = template.replace('{{composition}}', shot.shotComposition || 'Cinematic composition');
    template = template.replace('{{perspective}}', perspectiveInstructions);
    template = template.replace('{{compositing}}', `1. RELIGHTING: The subject(s) MUST take on the lighting from the *scene* (Location Ref), not their reference image. If the location is 'Night/Rain', the subject must be lit by moonlight/neon. If 'Sunset', subject must be backlit. Ignore subject source lighting.\n2. SCALE & PROPORTION: The subject scale must be perfectly proportional to the location environment based on the Focal Length (${shot.lens}). Do not make them float or look pasted in.`);
    template = template.replace('{{lighting}}', lighting);
    template = template.replace('{{colorGrade}}', colorGradeDNA);
    template = template.replace('{{film}}', look.film);
    template = template.replace('{{referenceNotes}}', refNotes);

    return template;
  };

  // --- Helper to get default relevant asset IDs ---
  const getDefaultAssetIds = (shot: Shot) => {
    const ids: string[] = [];
    if (shot.locationId) ids.push(shot.locationId);
    shot.subjectIds.forEach(id => ids.push(id));
    
    // Auto-include Look Style References
    if (data.lookSettings.styleReferences) {
        data.lookSettings.styleReferences.forEach(r => ids.push(r.id));
    }

    // Auto-include Previous Shot for Continuity
    const prevShot = data.shots.find(s => s.number === shot.number - 1);
    if (prevShot) {
        ids.push(prevShot.id);
    }

    return ids;
  };

  // --- Sequential Generation Logic ---
  const handleGenerateSequence = async () => {
      if (isSequencing) {
          stopSequenceRef.current = true;
          return;
      }
      
      setIsSequencing(true);
      stopSequenceRef.current = false;
      
      // Use a local copy of shots to track updates immediately
      let currentShots = [...data.shots];
      
      for (let i = 0; i < currentShots.length; i++) {
          if (stopSequenceRef.current) break;
          
          const shot = currentShots[i];
          setGeneratingId(shot.id); // Update UI spinner

          // 1. Build Prompt (Auto)
          const prompt = shot.customPrompt || buildDefaultPrompt(shot);
          
          // 2. Gather Assets
          // We must use the 'currentShots' array to find the previous shot, 
          // because 'data.shots' might not be updated yet if we are fast.
          const assetIds = shot.selectedAssetIds || getDefaultAssetIds(shot);
          const referenceImages: string[] = [];
          
          if (shot.referenceImage) referenceImages.push(shot.referenceImage);
          
          assetIds.forEach(id => {
             // Check subjects
             const sub = data.subjects.find(s => s.id === id);
             if (sub?.image?.url) referenceImages.push(sub.image.url);
             
             // Check locations
             const loc = data.locations.find(l => l.id === id);
             if (loc?.image?.url) referenceImages.push(loc.image.url);
             
             // Check style refs
             const style = data.lookSettings.styleReferences.find(r => r.id === id);
             if (style?.url) referenceImages.push(style.url);
             
             // Check SHOTS (Critical: Check our local currentShots first)
             const prevShotLocal = currentShots.find(s => s.id === id);
             if (prevShotLocal?.image?.url) {
                 referenceImages.push(prevShotLocal.image.url);
             } else {
                 // Fallback to data if not in local (should cover non-sequential refs)
                 const s = data.shots.find(x => x.id === id);
                 if (s?.image?.url) referenceImages.push(s.image.url);
             }
          });

          // 3. Generate
          try {
             // Deduplicate images
             const uniqueRefs = Array.from(new Set(referenceImages));
             const url = await generateImage(prompt, imageSize, uniqueRefs);
             const filename = `Shot_${String(shot.number).padStart(2, '0')}.jpg`;
             
             // Update Local State
             currentShots[i] = {
                 ...shot,
                 image: { url, prompt, filename },
                 selectedAssetIds: assetIds
             };
             
             // Update Global State incrementally to show progress
             update({ shots: [...currentShots] });

          } catch (e) {
              console.error(`Failed to generate shot ${shot.number}`, e);
          }
      }
      
      setIsSequencing(false);
      setGeneratingId(null);
  };

  const handleReviewImage = (shot: Shot, overridePrompt?: string, overrideAssetIds?: string[], overrideLens?: string, overrideRefTypes?: Record<string, string[]>) => {
      // Logic from handleGenerate to prepare prompt
      let currentShot = shot;
      if (overrideLens && overrideLens !== shot.lens) {
          currentShot = { ...shot, lens: overrideLens };
          // If we changed lens, and didn't provide a custom prompt, rebuild prompt to capture new perspective logic
          if (!overridePrompt && !shot.customPrompt) overridePrompt = buildDefaultPrompt(currentShot);
      }
      
      // Update ref types in temp object for prompt building
      if (overrideRefTypes) currentShot = { ...currentShot, assetReferenceTypes: overrideRefTypes, selectedAssetIds: overrideAssetIds };

      const promptToUse = overridePrompt || currentShot.customPrompt || buildDefaultPrompt(currentShot);
      const rawAssetIds = overrideAssetIds || currentShot.selectedAssetIds || getDefaultAssetIds(currentShot);
      
      // Force injection of previous shot if exists and not already selected
      const prevShot = data.shots.find(s => s.number === shot.number - 1);
      if (prevShot && prevShot.image && !rawAssetIds.includes(prevShot.id)) {
          rawAssetIds.push(prevShot.id);
      }

      const assetIdsToUse = Array.from(new Set(rawAssetIds));

      let fullPrompt = promptToUse;

      setPendingImage({ 
          shot: currentShot, 
          prompt: fullPrompt, 
          assets: assetIdsToUse, 
          lens: overrideLens || shot.lens || '' 
      });
  };

  const handleConfirmImage = async () => {
    if (!pendingImage) return;
    const { shot, prompt, assets, lens } = pendingImage;
    
    // Close modal IMMEDIATELY before starting generation
    setPendingImage(null);
    setGeneratingId(shot.id);
    
    // 3. Gather Reference Images (Base64)
    const referenceImages: string[] = [];
    if (shot.referenceImage) referenceImages.push(shot.referenceImage);
    
    assets.forEach(id => {
        const subj = data.subjects.find(c => c.id === id);
        if (subj?.image?.url) referenceImages.push(subj.image.url);
        
        const loc = data.locations.find(l => l.id === id);
        if (loc?.image?.url) referenceImages.push(loc.image.url);
        
        const shotRef = data.shots.find(s => s.id === id);
        if (shotRef?.image?.url) referenceImages.push(shotRef.image.url);

        const styleRef = data.lookSettings.styleReferences.find(r => r.id === id);
        if (styleRef?.url) referenceImages.push(styleRef.url);
    });

    try {
      const uniqueRefs = Array.from(new Set(referenceImages));
      const url = await generateImage(prompt, imageSize, uniqueRefs);
      
      const filename = `Shot_${String(shot.number).padStart(2, '0')}.jpg`;

      const updatedShots = data.shots.map(s => 
        s.id === shot.id ? { 
            ...s, 
            image: { url, prompt, filename },
            customPrompt: editingShotId ? prompt : s.customPrompt,
            selectedAssetIds: assets,
            lens: lens,
            assetReferenceTypes: shot.assetReferenceTypes // Preserved from temp object
        } : s
      );
      update({ shots: updatedShots });
      setEditingShotId(null);
    } catch (e) {
      console.error(e);
      alert('Generation failed');
    } finally {
      setGeneratingId(null);
    }
  };


  const handleReviewVideo = (shot: Shot) => {
    if (!shot.image) return;
    
    const loc = data.locations.find(l => l.id === shot.locationId);
    const relevantSubjs = data.subjects.filter(c => shot.subjectIds.includes(c.id));
    
    let consistencyContext = "";
    if (loc?.visualDetails) consistencyContext += ` Location Style: ${loc.visualDetails}.`;
    relevantSubjs.forEach(c => {
            if (c.visualDetails) consistencyContext += ` ${c.name} Appearance: ${c.visualDetails}.`;
    });

    let fullPrompt = `${shot.description}. Action: ${shot.action || 'Cinematic movement'}. Camera Movement: ${shot.cameraMove || 'Cinematic, Smooth'}. ${consistencyContext}`;
    
    setPendingVideo({ shot, prompt: fullPrompt });
  };

  const handleConfirmVideo = async () => {
    if (!pendingVideo) return;
    const { shot, prompt } = pendingVideo;
    if (!shot.image) return;
    
    // Close modal immediately
    setPendingVideo(null);
    setVideoGeneratingId(shot.id);

    try {
        const videoUrl = await generateShotVideo(prompt, shot.image.url);
        const updatedShots = data.shots.map(s => 
            s.id === shot.id ? { ...s, videoUrl } : s
        );
        update({ shots: updatedShots });
    } catch (e) {
        console.error(e);
        alert('Video generation failed');
    } finally {
        setVideoGeneratingId(null);
    }
  };

  const handleSaveSettings = (shotId: string, prompt: string, assets: string[], lens: string, refTypes: Record<string, string[]>) => {
      const updated = data.shots.map(s => s.id === shotId ? { 
          ...s, 
          customPrompt: prompt, 
          selectedAssetIds: assets, 
          lens: lens,
          assetReferenceTypes: refTypes
      } : s);
      update({ shots: updated });
      setEditingShotId(null);
  };

  const handleDownload = (shot: Shot) => {
    if (!shot.image) return;
    const link = document.createElement('a');
    link.href = shot.image.url;
    link.download = shot.image.filename || `Shot_${shot.number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateSketches = async () => {
      setGeneratingSketch(true);
      const BATCH_SIZE = 6;
      const newSketches: SketchSheet[] = [];
      const shotsToProcess = data.shots.filter(s => s.image);

      // Process in chunks of 6
      for (let i = 0; i < shotsToProcess.length; i += BATCH_SIZE) {
          const chunk = shotsToProcess.slice(i, i + BATCH_SIZE);
          const prompt = `Create a storyboard sketch for these images attached then number and write their shot description below each frame. ${chunk.length} shots, evenly spaced with descriptions for each. 9:16 resolution`;
          
          try {
              const url = await generateStoryboardSketch(chunk, prompt);
              if (url) {
                  newSketches.push({
                      id: `sketch-${Date.now()}-${i}`,
                      url,
                      shotRange: `Shots ${chunk[0].number}-${chunk[chunk.length-1].number}`
                  });
              }
          } catch (e) {
              console.error(`Failed to generate sketch for chunk ${i}`, e);
          }
      }

      update({ storyboardSketches: [...(data.storyboardSketches || []), ...newSketches] });
      setGeneratingSketch(false);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Top Bar - Sticky & Attached */}
      <div className="flex justify-between items-center bg-neutral-900/95 backdrop-blur-md px-6 py-4 border-b border-neutral-800 sticky top-0 z-40 shrink-0">
        <div className="flex flex-col">
            <h2 className="text-xl font-bold">Storyboard</h2>
            <p className="text-xs text-neutral-400">Generate shots and animatics.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button onClick={handleGenerateSequence} disabled={isSequencing && !stopSequenceRef.current} variant={isSequencing ? "secondary" : "accent"} className={`text-xs flex items-center gap-2 ${isSequencing ? 'border-red-500 text-red-500' : ''}`}>
               {isSequencing ? <><StopCircle size={14} className="animate-pulse"/> Stop Sequence</> : <><Play size={14} fill="currentColor"/> Generate All</>}
            </Button>
            
            <div className="h-6 w-px bg-neutral-700 mx-1"></div>

            <Button onClick={handleGenerateSketches} disabled={generatingSketch || data.shots.filter(s => s.image).length === 0} variant="secondary" className="text-xs flex items-center gap-2">
               {generatingSketch ? <Spinner /> : <><PenTool size={14} /> Sketches</>}
            </Button>
        </div>
      </div>

      {/* Main Grid: 3-Columns with precise 5px gap */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[5px] bg-neutral-950">
            {data.shots.map(shot => {
                const loc = data.locations.find(l => l.id === shot.locationId);
                const isProcessing = generatingId === shot.id || videoGeneratingId === shot.id;
                const hasMedia = !!shot.image || !!shot.videoUrl;

                return (
                <div key={shot.id} className="relative aspect-video group bg-neutral-900 overflow-hidden">
                    {/* Media Layer (Background) */}
                    {shot.videoUrl ? (
                        <video src={shot.videoUrl} controls loop muted className="w-full h-full object-cover" />
                    ) : shot.image ? (
                        <img src={shot.image.url} alt={`Shot ${shot.number}`} className="w-full h-full object-cover" />
                    ) : (
                        // Empty State Background - No Box, Dim Text
                        <div className="w-full h-full flex flex-col items-center justify-center text-center opacity-20 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="text-6xl font-black text-neutral-500">#{shot.number}</span>
                            <span className="text-xs text-neutral-400 uppercase tracking-widest mt-2">{loc?.name || 'Unknown Loc'}</span>
                        </div>
                    )}

                    {/* Loading Overlay */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 backdrop-blur-sm z-30 pointer-events-none">
                        <Spinner />
                        <span className="text-xs text-white font-bold tracking-widest animate-pulse">
                            {videoGeneratingId === shot.id ? 'GENERATING MOTION...' : 'RENDERING FRAME...'}
                        </span>
                        </div>
                    )}

                    {/* Info & Controls Overlay (Visible on Hover) - POINTER EVENTS LOGIC FIX */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80 flex flex-col justify-between p-5 transition-opacity duration-300 z-20 pointer-events-none ${hasMedia ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                        
                        {/* Top Bar */}
                        <div className="flex justify-between items-start pointer-events-auto">
                            <div>
                                <div className="text-2xl font-bold text-white leading-none">#{shot.number}</div>
                                {shot.image?.filename && (
                                    <div className="text-[10px] font-mono text-neutral-400 bg-black/50 px-1 rounded inline-block mt-1">{shot.image.filename}</div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {shot.image && (
                                    <button 
                                        onClick={() => handleDownload(shot)}
                                        className="p-2 bg-neutral-800/80 hover:bg-white hover:text-black rounded-full text-white transition-all backdrop-blur-sm"
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => setEditingShotId(shot.id)}
                                    className="p-2 bg-neutral-800/80 hover:bg-blue-600 rounded-full text-white transition-all backdrop-blur-sm"
                                    title="Settings"
                                >
                                    <Settings size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Center Actions */}
                        <div className="flex items-center justify-center gap-6 pointer-events-auto">
                            <div className="relative group/btn flex flex-col items-center gap-2">
                                <button 
                                    onClick={() => handleReviewImage(shot)}
                                    disabled={isProcessing || isSequencing}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-110 ${hasMedia ? 'bg-white/10 hover:bg-blue-600 text-white backdrop-blur-md border border-white/20' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                                >
                                    <Wand2 size={24} />
                                </button>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-black/70 px-2 py-0.5 rounded text-white opacity-0 group-hover/btn:opacity-100 transition-opacity absolute top-16 whitespace-nowrap">Generate Image</span>
                            </div>

                            <div className="relative group/btn flex flex-col items-center gap-2">
                                <button 
                                    onClick={() => handleReviewVideo(shot)}
                                    disabled={!shot.image || isProcessing || isSequencing}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-110 ${
                                        shot.videoUrl 
                                        ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                                        : shot.image 
                                            ? 'bg-white/10 hover:bg-purple-600 text-white backdrop-blur-md border border-white/20' 
                                            : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                                    }`}
                                >
                                    {shot.videoUrl ? <Play size={24} fill="currentColor" /> : <Video size={24} />}
                                </button>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-black/70 px-2 py-0.5 rounded text-white opacity-0 group-hover/btn:opacity-100 transition-opacity absolute top-16 whitespace-nowrap">Generate Motion</span>
                            </div>
                        </div>

                        {/* Bottom Info */}
                        <div className="pointer-events-auto">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded text-neutral-200 border border-white/10 backdrop-blur-md">
                                    {loc?.name || 'No Loc'}
                                </span>
                                {shot.videoUrl && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-900/50 px-2 py-0.5 rounded text-purple-200 border border-purple-500/30 backdrop-blur-md flex items-center gap-1">
                                        <Film size={10} /> Motion
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed opacity-90">{shot.description}</p>
                        </div>

                    </div>
                </div>
                )
            })}
        </div>

        {/* Sketch Sheets Gallery */}
        {data.storyboardSketches && data.storyboardSketches.length > 0 && (
            <div className="mt-8 bg-neutral-900 p-6 mx-4 rounded-lg border border-neutral-800 mb-20">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><PenTool size={16} /> Generated Sketch Sheets</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {data.storyboardSketches.map(sketch => (
                        <div key={sketch.id} className="relative group">
                            <img src={sketch.url} className="w-full rounded border border-neutral-700" alt={sketch.shotRange} />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-[10px] text-center font-bold">{sketch.shotRange}</div>
                            <a href={sketch.url} download={`Storyboard_Sketch_${sketch.shotRange}.png`} className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-blue-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <Download size={12} />
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Settings Modal */}
      {editingShotId && (
        <ShotSettingsModal 
            shot={data.shots.find(s => s.id === editingShotId)!}
            projectLenses={data.lookSettings.selectedFocalLengths}
            allSubjects={data.subjects}
            allLocations={data.locations}
            allShots={data.shots}
            styleReferences={data.lookSettings.styleReferences}
            onClose={() => setEditingShotId(null)}
            onSave={(shotId, prompt, assets, lens, refTypes) => handleSaveSettings(shotId, prompt, assets, lens, refTypes)}
            onGenerate={(shotId, prompt, assets, lens, refTypes) => {
                const shot = data.shots.find(s => s.id === shotId)!;
                handleReviewImage(shot, prompt, assets, lens, refTypes);
            }}
            defaultPromptBuilder={buildDefaultPrompt}
            defaultAssetsBuilder={getDefaultAssetIds}
        />
      )}

      {/* Confirmation Modals */}
      <PromptModal 
        isOpen={!!pendingImage} 
        prompt={pendingImage?.prompt || ''} 
        onChange={(val) => setPendingImage(prev => prev ? {...prev, prompt: val} : null)}
        onCancel={() => setPendingImage(null)} 
        onConfirm={handleConfirmImage} 
        isGenerating={generatingId !== null} 
      />

      <PromptModal 
        isOpen={!!pendingVideo} 
        prompt={pendingVideo?.prompt || ''} 
        onChange={(val) => setPendingVideo(prev => prev ? {...prev, prompt: val} : null)}
        onCancel={() => setPendingVideo(null)} 
        onConfirm={handleConfirmVideo} 
        isGenerating={videoGeneratingId !== null} 
      />
    </div>
  );
};

// --- Subcomponent: Shot Settings Modal ---
const ShotSettingsModal = ({ 
    shot, 
    projectLenses,
    allSubjects, 
    allLocations, 
    allShots,
    styleReferences,
    onClose, 
    onSave, 
    onGenerate,
    defaultPromptBuilder,
    defaultAssetsBuilder
}: {
    shot: Shot,
    projectLenses: string[],
    allSubjects: Subject[],
    allLocations: Location[],
    allShots: Shot[],
    styleReferences: StyleReference[],
    onClose: () => void,
    onSave: (id: string, prompt: string, assets: string[], lens: string, refTypes: Record<string, string[]>) => void,
    onGenerate: (id: string, prompt: string, assets: string[], lens: string, refTypes: Record<string, string[]>) => void,
    defaultPromptBuilder: (s: Shot) => string,
    defaultAssetsBuilder: (s: Shot) => string[]
}) => {
    // Initialize state
    const [prompt, setPrompt] = useState(shot.customPrompt || defaultPromptBuilder(shot));
    const [selectedLens, setSelectedLens] = useState(shot.lens || '');
    const [refTypes, setRefTypes] = useState<Record<string, string[]>>(shot.assetReferenceTypes || {});
    const [selectedAssets, setSelectedAssets] = useState<string[]>(() => {
        if (shot.selectedAssetIds) return shot.selectedAssetIds;

        const defaults = defaultAssetsBuilder(shot);
        // Only pre-select assets that actually have generated images
        // NOTE: We also check styleReferences which don't have .image property but .url
        return defaults.filter(id => {
             // Check Subject
             const c = allSubjects.find(subj => subj.id === id);
             if (c && c.image) return true;
             
             // Check Location
             const l = allLocations.find(loc => loc.id === id);
             if (l && l.image) return true;

             // Check Shot
             const s = allShots.find(shotRef => shotRef.id === id);
             if (s && s.image) return true;

             // Check Style References
             const r = styleReferences.find(ref => ref.id === id);
             if (r) return true;
             
             return false;
        });
    });

    // Rebuild prompt when deps change
    useEffect(() => {
        const tempShot = { ...shot, lens: selectedLens, assetReferenceTypes: refTypes };
        setPrompt(defaultPromptBuilder(tempShot));
    }, [selectedLens, refTypes]);

    const toggleRefType = (id: string, type: string) => {
        const current = refTypes[id] || [];
        const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
        setRefTypes(prev => ({ ...prev, [id]: updated }));
    };

    const availableLenses = projectLenses && projectLenses.length > 0 ? projectLenses : ['24mm', '35mm', '50mm', '85mm'];

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
                            {SHOT_REF_OPTIONS.map(opt => {
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
        const tempShot = { ...shot, lens: selectedLens, assetReferenceTypes: refTypes };
        setPrompt(defaultPromptBuilder(tempShot));
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col h-[90vh]">
                {/* Modal Header */}
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900 shrink-0">
                    <div>
                        <h3 className="font-bold text-lg">Shot #{shot.number} Configuration</h3>
                        <p className="text-xs text-neutral-400">Customize visual parameters.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Prompt & Lens Section */}
                    <div>
                        <div className="bg-neutral-800 p-3 rounded-lg border border-neutral-700 mb-4">
                             <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Aperture size={14} /> Active Focal Length
                             </label>
                             <div className="flex flex-wrap gap-2">
                                {availableLenses.map(lens => (
                                    <button
                                        key={lens}
                                        onClick={() => setSelectedLens(lens)}
                                        className={`flex-1 py-2 px-1 rounded text-xs font-bold border ${selectedLens === lens ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}
                                    >
                                        {lens}
                                    </button>
                                ))}
                             </div>
                             <div className="mt-2 text-[10px] text-neutral-400 italic">
                                Changing lens updates perspective & bokeh instructions in the prompt automatically.
                             </div>
                             
                             <div className="mt-4">
                                <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <VideoIcon size={14} /> Camera Movement (Metadata)
                                </label>
                                <Select 
                                    value={shot.cameraMove || 'Static'}
                                    onChange={() => {}} // This is just for view in modal, edit on card
                                    options={CAMERA_MOVES.map(m => ({value: m, label: m}))}
                                    className="text-xs py-1.5 opacity-70 cursor-not-allowed"
                                />
                                <div className="text-[10px] text-neutral-500 mt-1">Edit movement on main card</div>
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
                        </div>
                         <div className="mt-3">
                             <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Manual Reference Upload</h4>
                             <ImageUpload 
                                onImageSelected={() => {}} // Read-only
                                currentImage={shot.referenceImage}
                                label="Upload a custom reference image"
                             />
                        </div>
                    </div>

                    {/* Asset Selector */}
                    <div className="border-t border-neutral-800 pt-4">
                        <label className="block text-sm font-bold text-neutral-300 mb-2">Reference Assets ({selectedAssets.length})</label>
                        <p className="text-xs text-neutral-500 mb-4">Select generated images to use as visual references for consistency.</p>
                        
                        <div className="space-y-1">
                             {/* Style Refs */}
                             {styleReferences && styleReferences.length > 0 && (
                                <div className="mb-4">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase mb-2 pl-1">Style References (from Look)</div>
                                    {styleReferences.map((ref, idx) => renderAssetRow(ref.id, ref.url, `Style Ref #${idx+1}`, 'Style'))}
                                </div>
                             )}

                             {/* Locations */}
                             {allLocations.filter(l => l.image).length > 0 && (
                                <div className="mb-4">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase mb-2 pl-1">Locations</div>
                                    {allLocations.filter(l => l.image).map(l => renderAssetRow(l.id, l.image!.url, l.name, 'Location', l.image?.filename))}
                                </div>
                            )}

                             {/* Subjects */}
                             {allSubjects.filter(c => c.image).length > 0 && (
                                <div className="mb-4">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase mb-2 pl-1">Subjects</div>
                                    {allSubjects.filter(c => c.image).map(c => renderAssetRow(c.id, c.image!.url, c.name, 'Subject', c.image?.filename))}
                                </div>
                            )}

                             {/* Generated Shots */}
                             {allShots.filter(s => s.image && s.id !== shot.id).length > 0 && (
                                <div>
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase mb-2 pl-1">Other Shots</div>
                                    {allShots.filter(s => s.image && s.id !== shot.id).map(s => renderAssetRow(s.id, s.image!.url, `Shot #${s.number}`, 'Shot', s.image?.filename))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-900 shrink-0">
                    <Button onClick={() => onSave(shot.id, prompt, selectedAssets, selectedLens, refTypes)} variant="secondary">Save Changes</Button>
                    <Button onClick={() => onGenerate(shot.id, prompt, selectedAssets, selectedLens, refTypes)} variant="primary" className="flex items-center gap-2">
                        <Wand2 size={16} /> Generate Now
                    </Button>
                </div>
            </div>
        </div>
    );
};