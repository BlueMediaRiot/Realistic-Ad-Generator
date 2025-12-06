import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { Idea, Subject, Location, Shot, ImageSize, LookSettings, ProjectState } from "../types";

const MODEL_TEXT_FAST = 'gemini-2.5-flash';
const MODEL_TEXT_COMPLEX = 'gemini-3-pro-preview';
const MODEL_IMAGE = 'gemini-3-pro-image-preview';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const MODEL_VIDEO = 'veo-3.1-fast-generate-preview';

const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const createClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- Logger Helper ---
const dispatchLog = (model: string, prompt: any) => {
    const text = typeof prompt === 'string' ? prompt : JSON.stringify(prompt, null, 2);
    const event = new CustomEvent('gemini-api-log', {
        detail: { timestamp: new Date(), model, prompt: text }
    });
    window.dispatchEvent(event);
};

const handleApiError = (error: any) => {
  console.error("Gemini API Error:", error);
  
  const errorMsg = error.message || error.toString();
  let errorStr = '';
  try {
    errorStr = JSON.stringify(error);
  } catch (e) {
    // Ignore circular reference errors
  }

  const isPermissionDenied = 
    error.status === 403 || 
    error.code === 403 || 
    (error.error && error.error.code === 403) ||
    (error.error && error.error.status === 'PERMISSION_DENIED') ||
    errorMsg.includes('403') || 
    errorMsg.includes('PERMISSION_DENIED') || 
    errorMsg.includes('The caller does not have permission') ||
    errorMsg.includes('API_KEY_INVALID') ||
    errorStr.includes('PERMISSION_DENIED');

  if (isPermissionDenied) {
    const detailMsg = 'Invalid API Key. Please ensure it is a valid Google Cloud API key with access to Gemini models.';
    const event = new CustomEvent('gemini-auth-error', {
      detail: detailMsg
    });
    window.dispatchEvent(event);
    throw new Error(detailMsg);
  }
  
  throw error;
};

// --- Audio Helpers ---
async function decodeAudioData(
    base64Data: string, 
    ctx: AudioContext
): Promise<AudioBuffer> {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 24kHz is standard for Gemini TTS
    const sampleRate = 24000;
    const numChannels = 1;
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export const generateIdeas = async (state: ProjectState, promptOverride?: string): Promise<Idea[]> => {
  const client = createClient();
  const prompt = promptOverride || buildIdeasPrompt(state);
  
  dispatchLog(MODEL_TEXT_FAST, prompt);

  try {
    const response = await client.models.generateContent({
      model: MODEL_TEXT_FAST,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              synopsis: { type: Type.STRING },
              locationCount: { type: Type.NUMBER },
              subjectCount: { type: Type.NUMBER },
              locationNames: { type: Type.ARRAY, items: { type: Type.STRING } },
              subjectBriefs: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["id", "title", "synopsis", "locationCount", "subjectCount", "locationNames", "subjectBriefs"]
          }
        }
      }
    });

    const text = cleanJson(response.text || '[]');
    return JSON.parse(text);
  } catch (error) {
    handleApiError(error);
    return [];
  }
};

export const buildIdeasPrompt = (state: ProjectState) => {
  let template = state.promptTemplates?.ideas || "Generate commercial concepts.";
  
  // Replace variables
  template = template.replace('{{productName}}', state.productName);
  template = template.replace('{{duration}}', state.duration);
  template = template.replace('{{tags}}', state.tags?.join(', ') || '');
  template = template.replace('{{customTag}}', state.customTag || '');
  template = template.replace('{{manualLocations}}', state.manualLocations || 'AI Decision');
  template = template.replace('{{manualSubjects}}', state.manualSubjects || 'AI Decision');
  template = template.replace('{{notes}}', state.notes || '');

  return template;
};

export const generateScriptAndBreakdown = async (idea: Idea, globalPrompt: string, promptOverride?: string): Promise<any> => {
  const client = createClient();
  // Note: promptOverride usually passed from component
  const prompt = promptOverride || ""; // Fallback if no prompt provided, but component usually handles this via buildScriptPrompt

  dispatchLog(MODEL_TEXT_COMPLEX, prompt);

  try {
    const response = await client.models.generateContent({
      model: MODEL_TEXT_COMPLEX,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scriptText: { type: Type.STRING },
            subjects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  letter: { type: Type.STRING }
                },
                required: ["id", "name", "description", "letter"]
              }
            },
            locations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  timeOfDay: { type: Type.STRING },
                  letter: { type: Type.STRING }
                },
                required: ["id", "name", "description", "timeOfDay", "letter"]
              }
            }
          },
          required: ["scriptText", "subjects", "locations"]
        }
      }
    });

    const text = cleanJson(response.text || '{}');
    const result = JSON.parse(text);
    return result;
  } catch (error) {
    handleApiError(error);
    return {};
  }
};

export const buildScriptPrompt = (state: ProjectState, ideaId: string) => {
    const idea = state.ideas.find(i => i.id === ideaId);
    if (!idea) return "";

    let template = state.promptTemplates?.script || "";
    
    template = template.replace('{{duration}}', state.duration);
    template = template.replace('{{title}}', idea.title);
    template = template.replace('{{synopsis}}', idea.synopsis);
    template = template.replace('{{globalPrompt}}', state.globalPrompt);

    return template;
};

export const generateShotList = async (
    scriptText: string, 
    lookSettings: LookSettings,
    subjects: Subject[],
    locations: Location[],
    globalPrompt: string,
    promptOverride?: string
): Promise<Shot[]> => {
    const client = createClient();
    const prompt = promptOverride || "";

    // Multi-modal: Pass location images if available
    const parts: any[] = [{ text: prompt }];
    locations.forEach(loc => {
        if (loc.image) {
            const base64Data = loc.image.url.split(',')[1];
            parts.push({
                inlineData: { mimeType: 'image/jpeg', data: base64Data }
            });
            parts.push({ text: `Above is the visual reference for Location ${loc.name} (Letter ${loc.letter}). Use this to determine camera placement.` });
        }
    });

    dispatchLog(MODEL_TEXT_COMPLEX, "Generating Shot List with Multi-modal Context");

    try {
        const response = await client.models.generateContent({
            model: MODEL_TEXT_COMPLEX,
            contents: { parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            number: { type: Type.NUMBER },
                            description: { type: Type.STRING },
                            locationId: { type: Type.STRING },
                            subjectIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                            lens: { type: Type.STRING },
                            cameraMove: { type: Type.STRING },
                            cameraSpot: { type: Type.STRING },
                            cameraRelation: { type: Type.STRING },
                            shotComposition: { type: Type.STRING },
                            aperture: { type: Type.STRING },
                            focus: { type: Type.STRING },
                            sceneDescription: { type: Type.STRING },
                            action: { type: Type.STRING }
                        },
                        required: ["id", "number", "description", "locationId", "lens", "cameraMove", "cameraSpot", "cameraRelation", "shotComposition", "aperture", "focus", "sceneDescription", "action"]
                    }
                }
            }
        });

        const text = cleanJson(response.text || '[]');
        return JSON.parse(text);
    } catch (error) {
        handleApiError(error);
        return [];
    }
};

export const parseRawShotList = async (rawText: string, state: ProjectState): Promise<Shot[]> => {
    const client = createClient();
    
    const subjsList = state.subjects.map(s => `${s.name} (ID: ${s.id})`).join(', ');
    const locsList = state.locations.map(l => `${l.name} (ID: ${l.id})`).join(', ');
    const lensKit = state.lookSettings.selectedFocalLengths?.join(', ') || 'Standard';

    const prompt = `Parse the following raw shot list text into structured JSON. 
    Map items to the existing project assets.
    Infer missing technical details (Lens, Camera Move, etc) based on the description and project look settings.

    Project Context:
    - Camera: ${state.lookSettings.camera}
    - Available Lenses: ${lensKit}
    - Subjects: ${subjsList}
    - Locations: ${locsList}

    Raw Text:
    ${rawText}

    Return a JSON array of Shot objects. Use existing IDs where possible for locationId and subjectIds. If unknown, leave empty.
    `;

    dispatchLog(MODEL_TEXT_FAST, "Parsing Raw Shot List");

    try {
        const response = await client.models.generateContent({
            model: MODEL_TEXT_FAST,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            number: { type: Type.NUMBER },
                            description: { type: Type.STRING },
                            locationId: { type: Type.STRING },
                            subjectIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                            lens: { type: Type.STRING },
                            cameraMove: { type: Type.STRING },
                            cameraSpot: { type: Type.STRING },
                            cameraRelation: { type: Type.STRING },
                            shotComposition: { type: Type.STRING },
                            aperture: { type: Type.STRING },
                            focus: { type: Type.STRING },
                            sceneDescription: { type: Type.STRING },
                            action: { type: Type.STRING }
                        },
                        required: ["number", "description", "lens", "cameraMove", "sceneDescription"]
                    }
                }
            }
        });
        
        const text = cleanJson(response.text || '[]');
        return JSON.parse(text);
    } catch (e) {
        console.error(e);
        return [];
    }
}

export const buildShotListPrompt = (state: ProjectState) => {
    let template = state.promptTemplates?.shotList || "";

    const subjsList = state.subjects.map(s => `${s.name} (Letter ${s.letter}, ID: ${s.id})`).join(', ');
    const locsList = state.locations.map(l => `${l.name} (Letter ${l.letter}, ID: ${l.id})`).join(', ');
    const lensKit = state.lookSettings.selectedFocalLengths?.join(', ') || 'Standard';

    template = template.replace('{{script}}', state.scriptText);
    template = template.replace('{{camera}}', state.lookSettings.camera);
    template = template.replace('{{lens}}', lensKit);
    template = template.replace('{{subjects}}', subjsList);
    template = template.replace('{{locations}}', locsList);

    return template;
};

export const generateImage = async (prompt: string, size: ImageSize, referenceImages: string[] = [], globalPrompt: string = ''): Promise<string> => {
  const client = createClient();
  
  // Clean base64 strings
  const parts: any[] = [{ text: prompt }];

  referenceImages.forEach((b64) => {
      if (b64 && b64.includes('base64,')) {
          const cleanB64 = b64.split(',')[1];
          parts.push({
              inlineData: { mimeType: 'image/jpeg', data: cleanB64 }
          });
      }
  });

  dispatchLog(MODEL_IMAGE, prompt);

  try {
    const response = await client.models.generateContent({
      model: MODEL_IMAGE,
      contents: { parts },
      config: {
        imageConfig: {
            aspectRatio: '16:9',
            imageSize: size
        }
      }
    });

    const partsRes = response.candidates?.[0]?.content?.parts;
    const imagePart = partsRes?.find((p: any) => p.inlineData);
    
    if (imagePart && imagePart.inlineData) {
      return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
    throw new Error('No image returned');
  } catch (error) {
    handleApiError(error);
    return '';
  }
};

export const extractVisualDetails = async (imageBase64: string, type: 'subject' | 'location'): Promise<string> => {
    const client = createClient();
    const cleanB64 = imageBase64.split(',')[1];
    
    const prompt = type === 'subject' 
        ? "Analyze this character image. List 5 key visual details to maintain consistency (e.g. 'scar on left cheek', 'neon blue jacket', 'silver hair'). Return as a comma-separated string."
        : "Analyze this location image. List 5 key visual details to maintain consistency (e.g. 'glowing vines', 'wet stone floor', 'purple neon signs'). Return as a comma-separated string.";

    dispatchLog(MODEL_TEXT_FAST, `Extracting Visual DNA (${type})`);

    try {
        const response = await client.models.generateContent({
            model: MODEL_TEXT_FAST,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: cleanB64 } },
                    { text: prompt }
                ]
            }
        });
        return response.text || '';
    } catch (e) {
        console.error(e);
        return '';
    }
};

export const analyzeColorGrade = async (imageBase64: string): Promise<string> => {
    const client = createClient();
    const cleanB64 = imageBase64.split(',')[1];
    
    const prompt = "Analyze this image for its COLOR GRADING DNA. Describe the Highlights Tint, Shadow Tint, Midtone Balance, Contrast Curve, Saturation levels, and any specific Film Grain or Texture characteristics. Keep it concise, technical, and formatted for use in an AI image generation prompt (e.g. 'Teal shadows, orange highlights, high contrast, heavy grain').";

    dispatchLog(MODEL_TEXT_FAST, "Analyzing Color Grade DNA");

    try {
        const response = await client.models.generateContent({
            model: MODEL_TEXT_FAST,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: cleanB64 } },
                    { text: prompt }
                ]
            }
        });
        return response.text || '';
    } catch (e) {
        console.error(e);
        return '';
    }
};

export const generateLookLock = async (
    subjectB64: string, 
    locationB64: string, 
    size: ImageSize,
    globalPrompt: string,
    promptOverride?: string
): Promise<string> => {
    const client = createClient();
    
    const prompt = promptOverride || `Composite this subject into this location. 
    Ensure perfect lighting match. 
    ${globalPrompt}`;

    const parts = [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: subjectB64.split(',')[1] } },
        { inlineData: { mimeType: 'image/jpeg', data: locationB64.split(',')[1] } }
    ];

    dispatchLog(MODEL_IMAGE, prompt);

    try {
        const response = await client.models.generateContent({
            model: MODEL_IMAGE,
            contents: { parts },
            config: {
                imageConfig: { aspectRatio: '16:9', imageSize: size }
            }
        });

         const partsRes = response.candidates?.[0]?.content?.parts;
         const imagePart = partsRes?.find((p: any) => p.inlineData);
        
        if (imagePart && imagePart.inlineData) {
            return `data:image/png;base64,${imagePart.inlineData.data}`;
        }
        throw new Error('No image returned');
    } catch (e) {
        handleApiError(e);
        return '';
    }
};

export const buildLookLockPrompt = (globalPrompt: string) => {
    return `Create a cinematic composite shot. Place the Subject (img 1) into the Location (img 2).
    - Match the subject's lighting to the location's environment.
    - Adjust shadows and highlights to blend seamlessly.
    - ${globalPrompt}`;
};

export const generateShotVideo = async (prompt: string, imageBase64: string): Promise<string> => {
    const client = createClient();
    const cleanB64 = imageBase64.split(',')[1];
    
    dispatchLog(MODEL_VIDEO, prompt);

    try {
        // Step 1: Trigger Generation
        let operation = await client.models.generateVideos({
            model: MODEL_VIDEO,
            prompt: prompt,
            image: {
                imageBytes: cleanB64,
                mimeType: 'image/jpeg'
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        // Step 2: Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s
            operation = await client.operations.getVideosOperation({ operation: operation });
        }

        // Step 3: Get Result
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error('No video URI returned');

        // Step 4: Fetch video bytes (requires API key)
        const videoRes = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
        const blob = await videoRes.blob();
        
        return URL.createObjectURL(blob);
    } catch (error) {
        handleApiError(error);
        return '';
    }
};

export const generateStoryboardSketch = async (shots: Shot[], prompt: string): Promise<string> => {
    const client = createClient();
    
    const parts: any[] = [{ text: prompt }];

    // Add up to 6 images as reference
    shots.forEach((shot, index) => {
        if (shot.image && shot.image.url.includes('base64,')) {
            const cleanB64 = shot.image.url.split(',')[1];
            parts.push({
                inlineData: { mimeType: 'image/jpeg', data: cleanB64 }
            });
            parts.push({ text: `Shot #${shot.number} Reference (Image ${index+1})`});
        }
    });

    dispatchLog(MODEL_IMAGE, `Generating Storyboard Sketch for Shots ${shots.map(s => s.number).join(', ')}`);

    try {
        const response = await client.models.generateContent({
            model: MODEL_IMAGE,
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: '9:16',
                    imageSize: '2K'
                }
            }
        });

        const partsRes = response.candidates?.[0]?.content?.parts;
        const imagePart = partsRes?.find((p: any) => p.inlineData);
        
        if (imagePart && imagePart.inlineData) {
            return `data:image/png;base64,${imagePart.inlineData.data}`;
        }
        throw new Error('No image returned for sketch');
    } catch (e) {
        handleApiError(e);
        return '';
    }
};

export const generateScriptAudio = async (text: string): Promise<string> => {
    const client = createClient();
    
    dispatchLog(MODEL_TTS, text.substring(0, 100) + "...");

    try {
        const response = await client.models.generateContent({
            model: MODEL_TTS,
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Puck' } 
                    }
                }
            }
        });

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) throw new Error('No audio data returned');

        // Decode PCM
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await decodeAudioData(audioData, audioContext);

        // Convert to WAV for playback
        const wavBlob = await audioBufferToWav(audioBuffer);
        return URL.createObjectURL(wavBlob);
    } catch (e) {
        handleApiError(e);
        return '';
    }
};

// --- WAV Encoder Helper ---
function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
    return new Promise(resolve => {
        const length = buffer.length * buffer.numberOfChannels * 2 + 44;
        const arrayBuffer = new ArrayBuffer(length);
        const view = new DataView(arrayBuffer);
        const channels = [];
        let offset = 0;
        let pos = 0;

        // Write WAV Header
        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length - 8
        setUint32(0x45564157); // "WAVE"
        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16); // length = 16
        setUint16(1); // PCM (uncompressed)
        setUint16(buffer.numberOfChannels);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // avg. bytes/sec
        setUint16(buffer.numberOfChannels * 2); // block-align
        setUint16(16); // 16-bit (hardcoded in this example)
        setUint32(0x61746164); // "data" - chunk
        setUint32(length - pos - 4); // chunk length

        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        while (pos < buffer.length) {
            for (let i = 0; i < buffer.numberOfChannels; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][pos]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(offset, sample, true);
                offset += 2;
            }
            pos++;
        }

        resolve(new Blob([arrayBuffer], { type: "audio/wav" }));

        function setUint16(data: any) {
            view.setUint16(offset, data, true);
            offset += 2;
        }

        function setUint32(data: any) {
            view.setUint32(offset, data, true);
            offset += 4;
        }
    });
}