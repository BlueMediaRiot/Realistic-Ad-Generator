

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
export type ImageSize = '1K' | '2K' | '4K';

export interface GeneratedImage {
  url: string; // Data URL
  prompt: string;
  filename?: string; // e.g. "Subject_A_01.jpg"
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  letter: string; // A, B, C, etc.
  image: GeneratedImage | null;
  referenceImage?: string; // Data URL for uploaded reference
  visualDetails?: string; // AI Extracted visual elements for consistency
  customPrompt?: string; // User edited prompt
  selectedAssetIds?: string[]; // IDs of specific generated assets to use as reference
  assetReferenceTypes?: Record<string, string[]>; // Map ID -> ["Facial Features", "Attire"]
}

export interface Location {
  id: string;
  name: string;
  description: string;
  timeOfDay: string;
  weather?: string;
  letter: string; // A, B, C, etc.
  image: GeneratedImage | null;
  referenceImage?: string; // Data URL for uploaded reference
  visualDetails?: string; // AI Extracted visual elements for consistency
  customPrompt?: string; // User edited prompt
  selectedAssetIds?: string[]; // IDs of specific generated assets to use as reference
  assetReferenceTypes?: Record<string, string[]>; // Map ID -> ["Architecture", "Lighting"]
}

export interface Shot {
  id: string;
  number: number;
  description: string;
  locationId: string;
  subjectIds: string[]; // Renamed from characterIds
  image: GeneratedImage | null;
  referenceImage?: string; // Data URL for uploaded reference
  videoUrl?: string; // URL for Veo generated video
  customPrompt?: string; // User edited prompt
  selectedAssetIds?: string[]; // IDs of specific generated assets to use as reference
  assetReferenceTypes?: Record<string, string[]>; // Map ID -> ["Composition", "Lighting"]
  
  // Technical Metadata
  cameraSpot?: string; 
  cameraRelation?: string; 
  lens?: string; 
  cameraMove?: string; 
  
  // New Director of Photography Metadata
  shotComposition?: string; 
  aperture?: string; 
  focus?: string; 
  sceneDescription?: string; 
  action?: string; 
}

export interface Idea {
  id: string;
  title: string;
  synopsis: string;
  locationCount: number;
  subjectCount: number; 
  locationNames: string[];
  subjectBriefs: string[]; 
}

export interface DetailedLighting {
    motivation: string[];
    quality: string[];
    visualKey: string[];
    atmosphere: string[];
}

export interface StyleReference {
    id: string;
    url: string;
    types: string[]; // e.g. ["Color Grading", "Lighting"]
}

export interface ColorGradeData {
    image: string; // Base64 URL
    analysis: string; // The AI extracted description of the grade
}

export interface LookSettings {
  camera: string;
  lens: string;
  selectedFocalLengths: string[]; 
  film: string;
  lighting: string; 
  detailedLighting?: DetailedLighting; 
  styleReferences: StyleReference[]; // Array of style reference images
  colorGrade?: ColorGradeData; // New dedicated color grade reference
}

export interface PromptTemplates {
  ideas: string;
  script: string;
  shotList: string;
  subject: string;
  location: string;
  storyboard: string;
}

export interface SketchSheet {
  id: string;
  url: string;
  shotRange: string; // e.g. "Shots 1-6"
}

export interface ProjectState {
  // Step 1: Setup
  productName: string;
  productWebsite: string;
  duration: '15' | '30' | '60';
  tags: string[]; 
  customTag: string;
  manualLocations: string;
  manualSubjects: string; 
  notes: string;

  // Step 2: Ideas
  ideas: Idea[];
  selectedIdeaId: string | null;

  // Step 3: Script & Breakdown
  scriptText: string;
  scriptAudioUrl?: string; 
  subjects: Subject[]; 
  locations: Location[];
  shots: Shot[];

  // Step 4: Look
  lookSettings: LookSettings;

  // Step 7: Storyboard Extras
  storyboardSketches: SketchSheet[];

  // Global Settings
  currentStep: number;
  globalPrompt: string;
  promptTemplates: PromptTemplates;
}

export const INITIAL_STATE: ProjectState = {
  productName: '',
  productWebsite: '',
  duration: '30',
  tags: [],
  customTag: '',
  manualLocations: '',
  manualSubjects: '',
  notes: '',
  ideas: [],
  selectedIdeaId: null,
  scriptText: '',
  subjects: [],
  locations: [],
  shots: [],
  lookSettings: {
    camera: 'ARRI Alexa 35',
    lens: 'Cooke S8/i FF Primes',
    selectedFocalLengths: ['25mm', '32mm', '40mm', '50mm', '75mm', '100mm'],
    film: 'Kodak Vision3 500T',
    lighting: 'Motivation: Natural Light. Quality: Soft. Key: Mid-Key (Neutral).',
    detailedLighting: {
        motivation: ['Natural Light'],
        quality: ['Soft'],
        visualKey: ['Mid-Key (Neutral)'],
        atmosphere: []
    },
    styleReferences: []
  },
  storyboardSketches: [],
  currentStep: 1,
  globalPrompt: 'Visual Style: Cinematic, Photorealistic. Consistency: Maintain identical subject facial features, hairstyles, and clothing across all shots. Color Palette: Unified cinematic color grading. Camera: Stable, professional composition.',
  promptTemplates: {
    ideas: `Generate 5 distinct commercial concepts for "{{productName}}" (Duration: {{duration}}s).
Tone/Style: {{tags}}. {{customTag}}

User Constraints:
- Locations: {{manualLocations}}
- Subjects: {{manualSubjects}}
- Notes: {{notes}}

Return strictly a JSON array of objects with keys: id, title, synopsis, locationCount, subjectCount, locationNames (string[]), subjectBriefs (string[]).`,

    script: `Write a {{duration}}-second commercial script for "{{title}}".
Synopsis: {{synopsis}}.
Format: Standard Screenplay.
Global Style: {{globalPrompt}}.

CRITICAL OUTPUT INSTRUCTIONS:
You MUST extract and return a structured list of:
1. Subjects: Every character mentioned. Fields: name, description, letter (A, B, C...).
2. Locations: Every setting mentioned. Fields: name, description, timeOfDay, letter (A, B, C...).

Ensure the JSON response strictly matches the schema provided. ALL fields for subjects and locations are MANDATORY.`,

    shotList: `Act as a world-class Director of Photography. Break down this script into a technical shot list.

Script:
{{script}}

Look Settings:
Camera: {{camera}}.
Lens Kit: {{lens}}.

Assets:
Subjects: {{subjects}}
Locations: {{locations}}

Instructions:
- Analyze the location images provided to determine logical camera spots and blocking.
- Assign specific focal lengths from the kit.
- Define Shot Composition, Aperture (e.g. f/2.8), and Focus Point.
- Describe Camera Move (Dolly, Pan, etc) and Relation to previous shot.
- Describe Camera Location (cameraSpot) and its relation to the last shot (cameraRelation).
- Detailed Scene Description and Action details.

CRITICAL:
- Use the EXACT 'ID' provided in the Assets list for 'locationId' and 'subjectIds'. Do not invent new IDs.
- Return JSON array of Shots with ALL detailed fields including shotComposition, aperture, focus, sceneDescription, action.`,

    subject: `Create an ultra-realistic cinematic commercial image.

Subject:
A {{name}}: {{description}}.
Maintain natural proportions, authentic textures, and lifelike detail. 
*Crucial*: This is a Character Reference Sheet. Ensure consistent facial structure, identical hairstyle, and fixed body proportions.

Environment / Location:
A clean, neutral studio environment (solid grey background).
Include soft backlight separation, with realistic depth, atmosphere, reflections, and material textures.

Camera & Composition:
Shot on a {{camera}} using a {{lens}} lens.
Use shallow depth of field (f/2.8), sharp focus on eyes, and static framing.
The composition should follow a Character Sheet format (Full-body rotation sequence: front, 3/4, profile), emphasizing the subject within the environment.

Lighting & Mood (PROJECT STYLE - MUST MATCH):
{{lighting}}.
Ensure realistic shadows, subtle bloom, highlight rolloff, and filmic contrast.
Avoid flat or artificial illumination. Lighting must match the project's overall visual language.{{colorGrade}}

Styling Details:
Wardrobe: As described in subject description, commercial-friendly clothing with textures.
Hair/Makeup: Natural look fitting the concept.

Technical Quality:
8K resolution, photorealistic textures, perfect materials, cinematic grading ({{film}}), subtle grain, clean edges.
No distortions, no AI artifacts, no cartoon effects.

Negative:
No unrealistic anatomy, no noise, no oversaturation, no washed-out highlights, no CGI-looking surfaces, no text overlay.

REFERENCE INSTRUCTIONS:
{{referenceNotes}}`,

    location: `Create an ultra-realistic cinematic commercial image.

Subject:
No human subject. Focus entirely on the environment, architecture, and mood.

Environment / Location:
A {{name}}: {{description}}.
Time: {{time}}. Weather: {{weather}}.
Include {{visualDetails}}, with realistic depth, atmosphere, reflections, and material textures.

Camera & Composition:
Shot on a {{camera}} using a {{lens}} wide-angle lens.
Use deep depth of field (f/8), wide establishing framing, and static placement.
The composition should follow rule of thirds and balanced symmetry, emphasizing the scale of the space.

Lighting (PROJECT STYLE - MUST MATCH):
{{lighting}}.
Ensure realistic shadows, subtle bloom, highlight rolloff, and filmic contrast.
Avoid flat or artificial illumination.{{colorGrade}}

Mood & Tone:
Aim for a brand mood descriptor: Atmospheric, Cinematic, High-End.
Color palette should include environmental tones, with high contrast and {{weather}} atmospheric conditions.

Styling Details:
Props: Contextual elements fitting the location description.

Technical Quality:
8K resolution, photorealistic textures, perfect materials, cinematic grading ({{film}}), subtle grain, clean edges.
No distortions, no AI artifacts, no cartoon effects.

Negative:
No unrealistic anatomy, no noise, no oversaturation, no washed-out highlights, no CGI-looking surfaces, no text overlay, no people.

REFERENCE INSTRUCTIONS:
{{referenceNotes}}`,

    storyboard: `Create an ultra-realistic cinematic commercial image.

{{subjectSection}}
Maintain natural proportions, authentic textures, and lifelike detail.

Environment / Location:
A {{location}}: {{sceneDescription}}.
Time: {{time}}. Weather: {{weather}}.
Include {{visualDetails}}, with realistic depth, atmosphere, reflections, and material textures.

Camera & Composition:
Shot on a {{camera}} using a {{lens}} lens.
Aperture: {{aperture}}. Focus: Razor sharp on the {{focus}}.
Movement: {{movement}}. Camera Spot: {{cameraSpot}}. Relation to last: {{cameraRelation}}.
The composition should follow {{composition}}, emphasizing the subject within the environment.

PERSPECTIVE & DEPTH GUIDE:
{{perspective}}

COMPOSITING & INTEGRATION (CRITICAL):
{{compositing}}

Lighting & Mood:
{{lighting}}.
Ensure realistic shadows, subtle bloom, highlight rolloff, and filmic contrast.
Avoid flat or artificial illumination.{{colorGrade}}

Tone:
Aim for a brand mood descriptor: Cinematic, High-End, Story-Driven.
Color palette should include {{weather}} tones, with high contrast and atmospheric conditions.

Styling Details:
Wardrobe: Consistent with Subject Reference Sheets.
Props: Contextual elements fitting the scene description.

Technical Quality:
8K resolution, photorealistic textures, perfect materials, cinematic grading ({{film}}), subtle grain, clean edges.
No distortions, no AI artifacts, no cartoon effects.

Negative:
No unrealistic anatomy, no noise, no oversaturation, no washed-out highlights, no CGI-looking surfaces, no text overlay, no amateur composition.

REFERENCE INSTRUCTIONS:
{{referenceNotes}}`
  }
};

export const DEMO_STATE: ProjectState = {
  ...INITIAL_STATE,
  productName: 'Nebula Nectar',
  productWebsite: 'www.nebulanectar.com',
  duration: '30',
  tags: ['Sci-fi futuristic', 'Energetic and fast-paced', 'Hero’s journey arc', 'Cyberpunk neon aesthetic'],
  customTag: '',
  manualLocations: '',
  manualSubjects: '',
  notes: 'High energy commercial featuring a space explorer discovering the drink.',
  ideas: [{
    id: 'idea-1',
    title: 'The Awakening',
    synopsis: 'A weary space traveler discovers a glowing vial of Nebula Nectar in a ruin, drinking it restores their vitality and transforms the world around them.',
    locationCount: 1,
    subjectCount: 1,
    locationNames: ['Alien Ruins'],
    subjectBriefs: ['Space Traveler']
  }],
  selectedIdeaId: 'idea-1',
  scriptText: 'INT. ALIEN RUINS - NIGHT\n\nRain lashes against neon-lit ruins. \n\nCOMMANDER ZARA (30s, rugged armor) stumbles through the debris. She is exhausted.\n\nShe spots a glowing blue vial on a pedestal. The Nebula Nectar.\n\nShe grabs it. Pops the cork. Drinks.\n\nHer eyes widen. Energy surges through her veins. The ruins light up in sync with her heartbeat.\n\nZARA\n(Whispering)\nPure energy.\n\nCUT TO PRODUCT SHOT.',
  subjects: [{
    id: 'subj-1',
    name: 'Commander Zara',
    letter: 'A',
    description: 'Female space explorer, 30s, athletic build. Wears weathered sci-fi armor with neon blue accents. Short silver hair, determined expression, glowing HUD monocle over left eye. Cyberpunk aesthetic.',
    image: null,
    visualDetails: 'Short silver hair, glowing blue HUD monocle left eye, weathered grey sci-fi armor, neon blue piping on suit, athletic build',
    assetReferenceTypes: {}
  }],
  locations: [{
    id: 'loc-1',
    name: 'Alien Ruins',
    letter: 'A',
    description: 'Ancient stone structures overgrown with bioluminescent purple vines. Dark, rainy atmosphere lit by neon signs from a forgotten civilization. Cyberpunk meets archaeology. Wet surfaces, reflections.',
    timeOfDay: 'Night',
    weather: 'Raining',
    image: null,
    visualDetails: 'Bioluminescent purple vines, dark rainy atmosphere, neon blue and pink signage, wet reflective stone surfaces, ancient ruins',
    assetReferenceTypes: {}
  }],
  shots: [
    {
      id: 'shot-1',
      number: 1,
      description: 'Wide establishing shot of the Alien Ruins in the rain. Neon signs flicker in the background. Cinematic and moody.',
      locationId: 'loc-1',
      subjectIds: [],
      image: null,
      cameraSpot: 'High angle, overlooking the entire ruins entrance from a distance',
      cameraRelation: 'Establishing shot',
      lens: '18mm',
      cameraMove: 'Crane Down',
      shotComposition: 'Wide establishing shot, rule of thirds placement of ruins',
      aperture: 'f/8.0',
      focus: 'Infinite focus on the entire landscape',
      sceneDescription: 'Dark, rainy alien ruins illuminated by flickering neon signs',
      action: 'Rain falls heavily, lights flicker',
      assetReferenceTypes: {}
    },
    {
      id: 'shot-2',
      number: 2,
      description: 'Medium shot of Commander Zara stumbling through debris, looking exhausted. Rain drips off her armor. She looks towards a light source.',
      locationId: 'loc-1',
      subjectIds: ['subj-1'],
      image: null,
      cameraSpot: 'Eye level, side profile tracking with subject movement',
      cameraRelation: 'Cut in closer from Shot 1, focus on subject',
      lens: '50mm',
      cameraMove: 'Dolly In',
      shotComposition: 'Medium shot, subject centered, shallow depth of field',
      aperture: 'f/2.8',
      focus: 'Sharp focus on Zara\'s face',
      sceneDescription: 'Zara moving through debris in the foreground, ruins blurred in background',
      action: 'Zara stumbles and looks up',
      assetReferenceTypes: {}
    },
    {
      id: 'shot-3',
      number: 3,
      description: 'Close up on the glowing blue Nebula Nectar vial in Zara\'s hand. Intense blue light illuminates her face and the rain drops.',
      locationId: 'loc-1',
      subjectIds: ['subj-1'],
      image: null,
      cameraSpot: 'Macro view, extremely close to the hand and face',
      cameraRelation: 'Detail insert, reverse angle looking up at face',
      lens: '100mm',
      cameraMove: 'Static',
      shotComposition: 'Extreme close up, macro detail',
      aperture: 'f/1.8',
      focus: 'Sharp focus on the glowing blue vial',
      sceneDescription: 'The vial glows intensely, illuminating rain drops',
      action: 'Hand grips the vial tightly',
      assetReferenceTypes: {}
    },
    {
      id: 'shot-4',
      number: 4,
      description: 'Low angle hero shot of Zara drinking the nectar. Energy crackles around her. The environment brightens.',
      locationId: 'loc-1',
      subjectIds: ['subj-1'],
      image: null,
      cameraSpot: 'Low angle on the ground looking up at subject',
      cameraRelation: 'Wider angle than previous, emphasizing power',
      lens: '32mm',
      cameraMove: 'Orbit Left',
      shotComposition: 'Low angle hero shot, dynamic framing',
      aperture: 'f/4.0',
      focus: 'Subject full body sharp',
      sceneDescription: 'Environment brightening as energy surges',
      action: 'Zara drinks, energy flares outward',
      assetReferenceTypes: {}
    }
  ],
  lookSettings: {
    ...INITIAL_STATE.lookSettings,
    camera: 'RED V-Raptor [X] 8K VV',
    lens: 'Atlas Orion Anamorphic',
    selectedFocalLengths: ['32mm', '40mm', '50mm', '65mm', '80mm', '100mm'],
    film: 'Cyberpunk Neon',
    lighting: 'Motivation: Unmotivated/Stylized. Quality: Hard, Specular. Key: Low-Key (Dark/Moody). Atmosphere: Haze, God Rays (Light Shafts).',
    detailedLighting: {
        motivation: ['Unmotivated/Stylized'],
        quality: ['Hard', 'Specular'],
        visualKey: ['Low-Key (Dark/Moody)'],
        atmosphere: ['Haze', 'God Rays (Light Shafts)']
    },
    styleReferences: []
  },
  currentStep: 1,
  storyboardSketches: [],
  globalPrompt: 'Visual Style: Cinematic, Cyberpunk, High Contrast. Consistency: Maintain identical subject facial features (Zara silver hair), and neon blue/purple color palette. Camera: Anamorphic lens flare, professional composition.',
};