# CLAUDE.md - AI Assistant Guide for Realistic Ad Generator

## Project Overview

**Realistic Ad Generator** is a sophisticated React-based web application that leverages Google's Gemini AI models to automate the creative development process for commercial advertisements. The application guides users through a comprehensive 9-step workflow from initial concept to final pitch deck.

### Core Purpose
Transform a product name and brief into a complete commercial production package including:
- Creative concepts and scripts
- Character/subject reference sheets
- Location scouting imagery
- Technical shot lists with cinematography details
- Storyboard frames and video previews
- Exportable pitch decks

### Technology Stack
- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6.2
- **AI Integration**: Google Gemini API (@google/genai v1.31.0)
  - Text Generation: gemini-2.5-flash, gemini-3-pro-preview
  - Image Generation: gemini-3-pro-image-preview
  - Video Generation: veo-3.1-fast-generate-preview
  - Text-to-Speech: gemini-2.5-flash-preview-tts
- **State Management**: React useState with IndexedDB persistence
- **UI Components**: Custom components with Lucide React icons
- **Styling**: Tailwind CSS (via inline classes)

---

## Codebase Structure

```
/home/user/Realistic-Ad-Generator/
├── App.tsx                      # Main application entry point
├── index.tsx                    # React DOM render
├── index.html                   # HTML template
├── types.ts                     # TypeScript type definitions
├── constants.ts                 # Application constants and options
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite build configuration
├── .env.local                   # Environment variables (GEMINI_API_KEY)
├── .gitignore                   # Git ignore rules
├── components/                  # React components
│   ├── Layout.tsx               # Main layout with navigation and prompt logger
│   ├── UIComponents.tsx         # Shared UI components (Button, Input, etc)
│   ├── Step1_Setup.tsx          # Project setup and configuration
│   ├── Step2_Ideas.tsx          # AI-generated concept ideas
│   ├── Step3_Script.tsx         # Script generation and breakdown
│   ├── Step_Look.tsx            # Visual style and cinematography settings
│   ├── Step5_Subjects.tsx       # Character/subject reference generation
│   ├── Step5_Locations.tsx      # Location reference generation
│   ├── Step_ShotList.tsx        # Technical shot list generation
│   ├── Step7_Storyboard.tsx     # Storyboard frame generation
│   ├── Step9_PitchDeck.tsx      # Final pitch deck export
│   └── ...                      # Legacy/alternate component files
└── services/
    ├── dbService.ts             # IndexedDB persistence layer
    └── geminiService.ts         # Gemini API integration
```

### Key Files Explained

#### `types.ts`
Central type definitions including:
- **ProjectState**: Complete application state shape
- **Subject/Location/Shot**: Core entity types
- **LookSettings**: Cinematography configuration
- **PromptTemplates**: Customizable AI prompts
- **INITIAL_STATE/DEMO_STATE**: Default state objects

#### `constants.ts`
Application-wide constants:
- Camera bodies and lens kits (ARRI, RED, Sony, etc.)
- Film stock options (Kodak Vision3, Technicolor, etc.)
- Lighting categories (motivation, quality, key, atmosphere)
- Reference type options for style consistency
- Time of day and weather options

#### `App.tsx`
Main application orchestrator:
- Initializes IndexedDB on mount
- Loads persisted project state
- Auto-saves state changes
- Routes to appropriate step component based on `currentStep`

#### `services/geminiService.ts`
Comprehensive Gemini API wrapper with functions:
- `generateIdeas()`: Create 5 concept ideas
- `generateScriptAndBreakdown()`: Write script + extract subjects/locations
- `generateShotList()`: Create technical shot breakdowns
- `generateImage()`: Create images with multi-modal references
- `generateShotVideo()`: Generate video clips using Veo
- `extractVisualDetails()`: Analyze images for consistency DNA
- `analyzeColorGrade()`: Extract color grading metadata
- `generateScriptAudio()`: Text-to-speech for scripts

#### `services/dbService.ts`
IndexedDB wrapper for offline persistence:
- Database: `MediaRiotDB`
- Store: `projects`
- Key: `current_project`
- Functions: `initDB()`, `saveProject()`, `loadProject()`, `resetFullProject()`

---

## Application Architecture

### Multi-Step Workflow

The application uses a linear 9-step workflow pattern:

1. **Setup** (`Step1_Setup.tsx`): Product info, duration, tags, constraints
2. **Ideas** (`Step2_Ideas.tsx`): AI generates 5 creative concepts
3. **Script** (`Step3_Script.tsx`): Full screenplay + asset breakdown
4. **Look** (`Step_Look.tsx`): Cinematography settings (camera, lens, lighting)
5. **Subjects** (`Step5_Subjects.tsx`): Character reference sheet generation
6. **Locations** (`Step5_Locations.tsx`): Environment/setting references
7. **Shot List** (`Step_ShotList.tsx`): Technical shot-by-shot breakdown
8. **Storyboard** (`Step7_Storyboard.tsx`): Visual storyboard frames
9. **Pitch Deck** (`Step9_PitchDeck.tsx`): Export complete pitch deck

### State Management Pattern

```typescript
// App.tsx maintains single source of truth
const [projectData, setProjectData] = useState<ProjectState>(INITIAL_STATE);

// Update function passed to children
const updateProject = (updates: Partial<ProjectState>) => {
  setProjectData(prev => ({ ...prev, ...updates }));
};

// Auto-save on any state change
useEffect(() => {
  if (loaded) {
    saveProject(projectData);
  }
}, [projectData, loaded]);
```

**Key Principles:**
- Single `ProjectState` object contains entire application state
- Components receive `data` and `update` props
- Updates are shallow merged via spread operator
- IndexedDB provides automatic persistence
- No external state management library needed

### Prompt Template System

The application uses a sophisticated prompt template system defined in `types.ts > INITIAL_STATE.promptTemplates`:

**Template Variables:**
- `{{productName}}`, `{{duration}}`, `{{tags}}`
- `{{camera}}`, `{{lens}}`, `{{lighting}}`
- `{{subjects}}`, `{{locations}}`, `{{script}}`
- `{{globalPrompt}}` - overarching style guidance

**Templates:**
- `ideas`: Generate creative concepts
- `script`: Write screenplay with asset extraction
- `shotList`: Technical DP breakdown with focal lengths
- `subject`: Character reference sheet prompts
- `location`: Environment reference prompts
- `storyboard`: Final composite frame prompts

These templates can be customized in the Layout settings panel.

---

## Development Workflows

### Common Development Tasks

#### 1. Adding a New Step Component

```typescript
// 1. Create component file: components/StepX_NewFeature.tsx
import React from 'react';
import { ProjectState } from '../types';

interface Props {
  data: ProjectState;
  update: (updates: Partial<ProjectState>) => void;
  onNext?: () => void;
}

export const StepX_NewFeature = ({ data, update, onNext }: Props) => {
  return (
    <div className="p-6">
      {/* Your UI */}
    </div>
  );
};

// 2. Add to Layout.tsx STEPS array
const STEPS = [
  // ...existing steps
  { label: "New Feature", icon: YourIcon }
];

// 3. Add route in App.tsx
{projectData.currentStep === X && <StepX_NewFeature data={projectData} update={updateProject} onNext={nextStep} />}
```

#### 2. Adding New AI Generation Function

```typescript
// services/geminiService.ts

export const generateNewFeature = async (
  input: string,
  state: ProjectState
): Promise<YourType> => {
  const client = createClient();
  const prompt = buildYourPrompt(input, state);

  dispatchLog(MODEL_TEXT_FAST, prompt);

  try {
    const response = await client.models.generateContent({
      model: MODEL_TEXT_FAST,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            // Define your schema
          }
        }
      }
    });

    const text = cleanJson(response.text || '{}');
    return JSON.parse(text);
  } catch (error) {
    handleApiError(error);
    return defaultValue;
  }
};
```

#### 3. Adding New State Properties

```typescript
// 1. Update types.ts
export interface ProjectState {
  // Existing properties...
  newFeature: YourType;
  newFeatureSettings?: OptionalType;
}

// 2. Update INITIAL_STATE
export const INITIAL_STATE: ProjectState = {
  // Existing defaults...
  newFeature: defaultValue,
  newFeatureSettings: undefined
};

// 3. Update App.tsx state merging if needed
if (saved.newFeature) {
  mergedState.newFeature = {
    ...INITIAL_STATE.newFeature,
    ...saved.newFeature
  };
}
```

#### 4. Working with Image Generation

Images in this app follow a consistent pattern:

```typescript
// Generate with references
const imageUrl = await generateImage(
  prompt,                    // Your crafted prompt
  '2K',                      // '1K' | '2K' | '4K'
  [referenceImage1, ref2],   // Array of base64 data URLs
  state.globalPrompt         // Global style guidance
);

// Store in state
update({
  shots: shots.map(s =>
    s.id === currentShot.id
      ? { ...s, image: { url: imageUrl, prompt } }
      : s
  )
});
```

**Important Image Notes:**
- Images are stored as base64 data URLs in state
- All images persist to IndexedDB (can be large)
- Reference images use `inlineData` format for Gemini
- Multi-modal prompts combine text + multiple images

#### 5. Extending Prompt Templates

```typescript
// In your component
const buildCustomPrompt = (state: ProjectState) => {
  let template = state.promptTemplates?.yourTemplate || "fallback prompt";

  // Replace template variables
  template = template.replace('{{variable}}', state.someValue);

  // Handle optional variables
  if (state.optionalValue) {
    template = template.replace('{{optional}}', state.optionalValue);
  } else {
    template = template.replace('{{optional}}', '');
  }

  return template;
};
```

---

## Code Conventions

### Naming Conventions

**Components:**
- Step components: `Step{N}_{Name}.tsx` (e.g., `Step1_Setup.tsx`)
- Shared components: PascalCase (e.g., `UIComponents.tsx`)
- Component exports: Named exports (e.g., `export const Step1_Setup`)

**Functions:**
- API calls: `generate{Feature}()` (e.g., `generateIdeas()`)
- Prompt builders: `build{Feature}Prompt()` (e.g., `buildScriptPrompt()`)
- Database: `{verb}Project()` (e.g., `saveProject()`)

**Types:**
- Interfaces: PascalCase (e.g., `ProjectState`, `Subject`)
- Enums/Literals: PascalCase (e.g., `AspectRatio`, `ImageSize`)
- Constants: UPPER_SNAKE_CASE (e.g., `INITIAL_STATE`, `PROJECT_TAGS`)

**Variables:**
- State: camelCase (e.g., `projectData`, `currentStep`)
- Props: camelCase (e.g., `data`, `update`, `onNext`)
- Constants: UPPER_SNAKE_CASE for exports

### File Organization

**Component Structure:**
```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { ProjectState, YourTypes } from '../types';
import { serviceFunction } from '../services/geminiService';
import { Icon1, Icon2 } from 'lucide-react';
import { Button, Input } from './UIComponents';

// 2. Interface definitions
interface Props {
  data: ProjectState;
  update: (updates: Partial<ProjectState>) => void;
  onNext?: () => void;
}

// 3. Component
export const ComponentName = ({ data, update, onNext }: Props) => {
  // Local state
  const [loading, setLoading] = useState(false);

  // Handlers
  const handleAction = async () => {
    // Implementation
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### TypeScript Patterns

**Strict Type Safety:**
```typescript
// Always type function parameters and returns
const updateShot = (shotId: string, updates: Partial<Shot>): void => {
  // Implementation
};

// Use ProjectState for all state updates
update: (updates: Partial<ProjectState>) => void;

// Avoid 'any' - use proper types from types.ts
const processSubjects = (subjects: Subject[]): Subject[] => {
  return subjects.map(s => ({
    ...s,
    visualDetails: s.visualDetails || ''
  }));
};
```

**Optional Chaining:**
```typescript
// Safe access to nested properties
const lens = state.lookSettings?.selectedFocalLengths?.[0] || 'Standard';

// Array operations
const shot = state.shots.find(s => s.id === id);
if (shot?.image) {
  // Use shot.image
}
```

### React Patterns

**State Updates:**
```typescript
// ✅ Good - Immutable updates
update({
  subjects: subjects.map(s =>
    s.id === id ? { ...s, name: newName } : s
  )
});

// ❌ Bad - Direct mutation
const subject = data.subjects.find(s => s.id === id);
subject.name = newName; // Never mutate state directly
```

**Async Operations:**
```typescript
const handleGenerate = async () => {
  setLoading(true);
  try {
    const result = await generateSomething(data);
    update({ result });
  } catch (error) {
    console.error('Generation failed:', error);
    // Handle error appropriately
  } finally {
    setLoading(false);
  }
};
```

**Conditional Rendering:**
```typescript
// Loading states
{loading && <Spinner />}

// Empty states
{items.length === 0 && <EmptyState />}

// Optional content
{data.scriptAudioUrl && (
  <audio src={data.scriptAudioUrl} controls />
)}
```

---

## Gemini API Integration

### Model Selection Strategy

The app uses different models for different tasks:

- **gemini-2.5-flash**: Fast text generation (ideas, parsing)
- **gemini-3-pro-preview**: Complex reasoning (scripts, shot lists)
- **gemini-3-pro-image-preview**: All image generation
- **veo-3.1-fast-generate-preview**: Video generation
- **gemini-2.5-flash-preview-tts**: Text-to-speech

### Structured Output Pattern

All text generation uses JSON mode with schemas:

```typescript
const response = await client.models.generateContent({
  model: MODEL_TEXT_FAST,
  contents: prompt,
  config: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        field1: { type: Type.STRING },
        field2: { type: Type.NUMBER },
        arrayField: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["field1", "field2"]
    }
  }
});
```

**Benefits:**
- Guaranteed valid JSON
- Type safety
- No parsing errors
- Consistent structure

### Multi-Modal Prompting

Images can be passed as references:

```typescript
const parts: any[] = [{ text: prompt }];

referenceImages.forEach((base64Url) => {
  const cleanB64 = base64Url.split(',')[1];
  parts.push({
    inlineData: {
      mimeType: 'image/jpeg',
      data: cleanB64
    }
  });
});

const response = await client.models.generateContent({
  model: MODEL_IMAGE,
  contents: { parts },
  config: { imageConfig: { aspectRatio: '16:9', imageSize: '2K' } }
});
```

### Error Handling

Centralized error handling in `handleApiError()`:
- Detects permission/auth errors (403, PERMISSION_DENIED)
- Dispatches custom events for UI error display
- Falls back gracefully to empty/default values

```typescript
try {
  // API call
} catch (error) {
  handleApiError(error); // Throws on auth errors
  return defaultValue;   // Or return safe fallback
}
```

---

## Testing & Debugging

### Development Server

```bash
# Install dependencies
npm install

# Set API key in .env.local
GEMINI_API_KEY=your_key_here

# Start dev server
npm run dev
# Opens on http://localhost:3000
```

### Live Prompt Logger

The app includes a built-in prompt logger (`<PromptLogger />` in Layout.tsx):
- Shows real-time API calls in bottom-right terminal
- Displays model used and full prompt text
- Auto-opens on new API calls
- Useful for debugging prompt templates

### IndexedDB Inspection

Project state is stored in IndexedDB:
- **Database**: MediaRiotDB
- **Store**: projects
- **Key**: current_project

**Browser DevTools:**
1. Open DevTools → Application/Storage tab
2. Navigate to IndexedDB → MediaRiotDB → projects
3. View/edit current_project entry

**Programmatic Reset:**
```typescript
import { resetFullProject } from './services/dbService';

// Clear all data and reset
await resetFullProject();
window.location.reload();
```

### Common Debugging Scenarios

**Images Not Generating:**
1. Check API key validity in `.env.local`
2. Inspect Network tab for 403/permission errors
3. View prompt in Logger - check reference image format
4. Verify base64 data URLs are complete (start with `data:image/`)

**State Not Persisting:**
1. Check IndexedDB in DevTools
2. Verify `initDB()` completes successfully
3. Check console for transaction errors
4. Ensure `loaded` state is `true` before saves

**Template Variables Not Replacing:**
1. Check template string in `promptTemplates`
2. Verify variable names match (case-sensitive)
3. Ensure `build{Feature}Prompt()` is called
4. View final prompt in Logger

---

## Key Design Decisions

### Why IndexedDB Over LocalStorage?
- LocalStorage has 5-10MB limit
- Images are stored as base64 (very large)
- IndexedDB supports hundreds of MB
- Async API prevents blocking UI

### Why Single ProjectState Object?
- Simplifies persistence (single save/load)
- Easy to serialize/deserialize
- Clear data flow (props drilling is explicit)
- No action creators or reducers needed

### Why Base64 Data URLs?
- Self-contained (no external file dependencies)
- Serializable in JSON
- Works offline
- Direct compatibility with Gemini API

### Why Template Strings Over Code?
- Non-developers can customize prompts
- No code changes needed for prompt iteration
- Easy to version and experiment
- Visible in UI for transparency

---

## Performance Considerations

### Image Generation Limits
- Each image can be 1-5MB as base64
- 10-20 images = 20-100MB in memory
- IndexedDB handles this but loads can be slow
- Consider pagination or lazy loading for large projects

### API Rate Limits
- Gemini has rate limits (varies by tier)
- No built-in retry logic (could be added)
- Sequential generation can be slow
- Consider batch operations where possible

### State Update Frequency
- Every state change triggers IndexedDB save
- Save is async but frequent updates could queue
- Debouncing could improve performance
- Current implementation works for typical usage

---

## Common Gotchas

### 1. State Merging on Load
When loading saved state, always merge with INITIAL_STATE:

```typescript
// App.tsx example
const mergedState = { ...INITIAL_STATE, ...saved };

// Deep merge nested objects
if (saved.lookSettings) {
  mergedState.lookSettings = {
    ...INITIAL_STATE.lookSettings,
    ...saved.lookSettings,
    detailedLighting: {
      ...INITIAL_STATE.lookSettings.detailedLighting,
      ...(saved.lookSettings.detailedLighting || {})
    }
  };
}
```

**Why?** New properties added to INITIAL_STATE won't exist in old saved data.

### 2. Base64 Image Handling

```typescript
// ✅ Correct - Remove data URL prefix
const cleanB64 = imageDataUrl.split(',')[1];

// ❌ Wrong - Sending full data URL
inlineData: { data: imageDataUrl } // Contains 'data:image/jpeg;base64,' prefix
```

### 3. Array Updates in State

```typescript
// ✅ Correct - Create new array
update({
  shots: [...data.shots, newShot]
});

// ❌ Wrong - Mutate existing array
data.shots.push(newShot);
update({ shots: data.shots });
```

### 4. Async/Await in Event Handlers

```typescript
// ✅ Correct - Async handler
const handleGenerate = async () => {
  const result = await generateImage(prompt);
  update({ result });
};

// ❌ Wrong - Missing await
const handleGenerate = () => {
  const result = generateImage(prompt); // Returns Promise, not string
  update({ result }); // Stores Promise instead of value
};
```

---

## Extension Ideas

Here are common feature requests and how to approach them:

### 1. Export to PDF
- Add dependency: `jspdf` or `react-pdf`
- Create export function in `Step9_PitchDeck.tsx`
- Iterate through shots, add images + metadata
- Provide download button

### 2. Multiple Projects
- Extend `dbService.ts` to support multiple keys
- Add project listing/selection UI
- Update `loadProject()` to accept project ID
- Add project metadata (name, created date)

### 3. Undo/Redo
- Implement state history array
- Track changes with `useReducer` instead of `useState`
- Add undo/redo buttons in Layout
- Persist history to IndexedDB

### 4. Collaborative Editing
- Add backend (Firebase, Supabase, etc.)
- Replace IndexedDB with API calls
- Implement real-time sync
- Add user authentication

### 5. Custom AI Models
- Abstract model constants in `geminiService.ts`
- Add model selector in Settings
- Support OpenAI API as alternative
- Allow per-step model override

---

## Troubleshooting Guide

### "Permission Denied" Error
**Cause:** Invalid or missing Gemini API key
**Fix:**
1. Check `.env.local` file exists
2. Verify `GEMINI_API_KEY=your_actual_key`
3. Restart dev server (`npm run dev`)
4. Ensure API key has Gemini model access

### Images Not Loading
**Cause:** IndexedDB quota exceeded or corrupt data
**Fix:**
```typescript
// Reset database
import { resetFullProject } from './services/dbService';
await resetFullProject();
window.location.reload();
```

### Stuck on Loading State
**Cause:** API call failed but loading state not reset
**Fix:** Always use try/finally:
```typescript
setLoading(true);
try {
  await apiCall();
} finally {
  setLoading(false); // Always runs
}
```

### Template Variables Not Replaced
**Cause:** Variable name mismatch or template not refreshed
**Fix:**
1. Check exact variable name: `{{productName}}` (case-sensitive)
2. Verify `build{Feature}Prompt()` is called before API
3. Check Logger to see final prompt sent

---

## Best Practices for AI Assistants

### When Modifying This Codebase

1. **Always Read Before Editing**
   - Read the file you're about to modify
   - Understand existing patterns
   - Match the style and conventions

2. **Type Safety First**
   - Update `types.ts` before implementation
   - Use existing types, don't duplicate
   - Avoid `any` - use proper interfaces

3. **State Updates Are Immutable**
   - Never mutate `ProjectState` directly
   - Always create new objects/arrays
   - Use spread operators for updates

4. **Test API Changes Carefully**
   - Gemini API is rate-limited
   - Add error handling for all API calls
   - Use Logger to verify prompts

5. **Preserve Existing Functionality**
   - This is a working application
   - Changes should be additive when possible
   - Test existing features after modifications

### When Adding Features

1. **Follow the Step Pattern**
   - New major features should be new steps
   - Update STEPS array in Layout.tsx
   - Add route in App.tsx

2. **Extend, Don't Replace**
   - Add new properties to ProjectState
   - Keep existing properties functional
   - Provide defaults in INITIAL_STATE

3. **Document Complex Logic**
   - Add comments for non-obvious code
   - Explain AI prompt strategies
   - Note any workarounds or hacks

4. **Consider Performance**
   - Large images impact IndexedDB
   - API calls can be slow
   - Show loading states to user

---

## Quick Reference

### Project State Shape
```typescript
{
  // Step 1
  productName: string
  duration: '15' | '30' | '60'
  tags: string[]

  // Step 2
  ideas: Idea[]
  selectedIdeaId: string | null

  // Step 3
  scriptText: string
  subjects: Subject[]
  locations: Location[]

  // Step 4
  lookSettings: LookSettings

  // Step 7
  shots: Shot[]

  // Global
  currentStep: number
  globalPrompt: string
  promptTemplates: PromptTemplates
}
```

### Common Update Patterns
```typescript
// Add item to array
update({ subjects: [...data.subjects, newSubject] });

// Update item in array
update({
  subjects: data.subjects.map(s =>
    s.id === id ? { ...s, name: newName } : s
  )
});

// Remove item from array
update({
  subjects: data.subjects.filter(s => s.id !== id)
});

// Update nested object
update({
  lookSettings: {
    ...data.lookSettings,
    camera: newCamera
  }
});
```

### Essential Imports
```typescript
// Types
import { ProjectState, Subject, Location, Shot } from '../types';

// Services
import { generateImage, generateIdeas } from '../services/geminiService';
import { saveProject, loadProject } from '../services/dbService';

// UI Components
import { Button, Input, Select, Spinner } from './UIComponents';

// Icons
import { Icon } from 'lucide-react';
```

---

## Conclusion

This codebase is designed for rapid creative development workflows powered by AI. The architecture prioritizes:
- **Simplicity**: Single state object, straightforward React patterns
- **Flexibility**: Customizable prompts, extensible step system
- **User Experience**: Persistent state, live logging, clear progression
- **AI Integration**: Multi-modal prompting, structured outputs, error handling

When working with this code, prioritize maintaining these qualities. The application should feel like a cohesive creative tool, not a collection of disconnected AI demos.

---

**Last Updated**: 2025-12-06
**Version**: Initial comprehensive documentation
**Maintainer**: AI-assisted development team
