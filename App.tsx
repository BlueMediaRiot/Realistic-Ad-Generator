

import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Step1_Setup } from './components/Step1_Setup';
import { Step2_Ideas } from './components/Step2_Ideas';
import { Step3_Script } from './components/Step3_Script';
import { Step_Look } from './components/Step_Look';
import { Step_ShotList } from './components/Step_ShotList';
import { Step5_Subjects } from './components/Step5_Subjects';
import { Step5_Locations } from './components/Step5_Locations';
import { Step7_Storyboard } from './components/Step7_Storyboard';
import { Step9_PitchDeck } from './components/Step9_PitchDeck';
import { ProjectState, INITIAL_STATE } from './types';
import { initDB, loadProject, saveProject } from './services/dbService';

const App = () => {
  const [projectData, setProjectData] = useState<ProjectState>(INITIAL_STATE);
  const [loaded, setLoaded] = useState(false);

  // Initialize DB and Load
  useEffect(() => {
    const init = async () => {
        try {
            await initDB();
            const saved = await loadProject();
            if (saved) {
                // Smart Merge: Ensure nested objects from INITIAL_STATE are preserved if missing in saved data
                const mergedState = { ...INITIAL_STATE, ...saved };
                
                // Deep merge lookSettings
                if (saved.lookSettings) {
                    mergedState.lookSettings = {
                        ...INITIAL_STATE.lookSettings,
                        ...saved.lookSettings,
                        // Deep merge detailedLighting
                        detailedLighting: {
                            ...INITIAL_STATE.lookSettings.detailedLighting,
                            ...(saved.lookSettings.detailedLighting || {})
                        }
                    };
                }

                // Ensure tags exist
                if (!mergedState.tags) mergedState.tags = [];
                
                // Ensure sketch sheets exist
                if (!mergedState.storyboardSketches) mergedState.storyboardSketches = [];

                setProjectData(mergedState);
            }
        } catch (e) {
            console.error("Failed to initialize DB or load project:", e);
        } finally {
            setLoaded(true);
        }
    };
    init();
  }, []);

  // Save on change (Debounced slightly could be better, but direct save is fine for IDB async)
  useEffect(() => {
    if (loaded) {
        saveProject(projectData).catch(e => console.error("Auto-save failed:", e));
    }
  }, [projectData, loaded]);

  const updateProject = (updates: Partial<ProjectState>) => {
    setProjectData(prev => ({ ...prev, ...updates }));
  };

  const handleStepChange = (step: number) => {
    updateProject({ currentStep: step });
  };

  const nextStep = () => {
     handleStepChange(projectData.currentStep + 1);
  };

  if (!loaded) return null;

  return (
    <Layout 
      currentStep={projectData.currentStep} 
      onStepChange={handleStepChange}
      globalPrompt={projectData.globalPrompt}
      setGlobalPrompt={(val) => updateProject({ globalPrompt: val })}
      promptTemplates={projectData.promptTemplates}
      setPromptTemplates={(val) => updateProject({ promptTemplates: val })}
      projectData={projectData}
    >
      {projectData.currentStep === 1 && <Step1_Setup data={projectData} update={updateProject} onNext={nextStep} />}
      {projectData.currentStep === 2 && <Step2_Ideas data={projectData} update={updateProject} onNext={nextStep} />}
      {projectData.currentStep === 3 && <Step3_Script data={projectData} update={updateProject} onNext={nextStep} />}
      {projectData.currentStep === 4 && <Step_Look data={projectData} update={updateProject} onNext={nextStep} />}
      {projectData.currentStep === 5 && <Step5_Subjects data={projectData} update={updateProject} onNext={nextStep} />}
      {projectData.currentStep === 6 && <Step5_Locations data={projectData} update={updateProject} onNext={nextStep} />}
      {projectData.currentStep === 7 && <Step_ShotList data={projectData} update={updateProject} onNext={nextStep} />}
      {projectData.currentStep === 8 && <Step7_Storyboard data={projectData} update={updateProject} />}
      {projectData.currentStep === 9 && <Step9_PitchDeck data={projectData} onClose={() => handleStepChange(8)} />}
    </Layout>
  );
};

export default App;