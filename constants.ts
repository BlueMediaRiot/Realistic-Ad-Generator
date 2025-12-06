

export const PROJECT_TAGS = [
  "Comedy", "Witty", "Edgy", "Family", "Emotional", 
  "Inspirational", "Dramatic", "Playful", "Serious", "Wholesome", 
  "Gritty", "Bold", "Elegant", "Futuristic", "Retro", 
  "Minimal", "Warm", "Dark", "High-energy", "Chill", 
  "Surreal", "Realistic", "Nostalgic", "Uplifting", "Clever", 
  "Intense", "Lighthearted", "Mysterious", "Rebellious", "Heartfelt"
];

export const CAMERA_BODY_OPTIONS = [
    { value: 'ARRI Alexa 35', label: 'ARRI Alexa 35 (Super 35)' },
    { value: 'RED V-Raptor [X] 8K VV', label: 'RED V-Raptor [X] 8K VV' },
    { value: 'Sony VENICE 2', label: 'Sony VENICE 2' },
    { value: 'ARRI Alexa Mini LF', label: 'ARRI Alexa Mini LF' },
    { value: 'Panavision Millennium DXL2', label: 'Panavision Millennium DXL2' },
    { value: 'IMAX 65mm Film Camera', label: 'IMAX 65mm Film Camera' },
    { value: 'Blackmagic URSA Cine 12K', label: 'Blackmagic URSA Cine 12K' },
    { value: 'Canon EOS C500 Mark II', label: 'Canon EOS C500 Mark II' },
];

export const LENS_OPTIONS = [
    { value: 'Cooke S8/i FF Primes', label: 'Cooke S8/i FF Primes (The "Cooke Look")' },
    { value: 'ARRI/Zeiss Master Primes', label: 'ARRI/Zeiss Master Primes (Ultra Clean)' },
    { value: 'Panavision C Series Anamorphic', label: 'Panavision C Series Anamorphic' },
    { value: 'Atlas Orion Anamorphic', label: 'Atlas Orion Anamorphic' },
    { value: 'DZOFilm Arles Primes', label: 'DZOFilm Arles Primes' },
    { value: 'Angénieux Optimo Zoom', label: 'Angénieux Optimo Zoom' },
    { value: 'Canon K-35 Vintage', label: 'Canon K-35 Vintage (Soft, Flaring)' },
    { value: 'Leica Summilux-C', label: 'Leica Summilux-C' },
];

export const LENS_KITS: Record<string, string[]> = {
    'Cooke S8/i FF Primes': ['18mm', '25mm', '32mm', '40mm', '50mm', '75mm', '100mm', '135mm'],
    'ARRI/Zeiss Master Primes': ['12mm', '14mm', '16mm', '18mm', '21mm', '25mm', '27mm', '32mm', '35mm', '40mm', '50mm', '65mm', '75mm', '100mm', '135mm', '150mm'],
    'Panavision C Series Anamorphic': ['30mm', '35mm', '40mm', '50mm', '60mm', '75mm', '100mm'],
    'Atlas Orion Anamorphic': ['32mm', '40mm', '50mm', '65mm', '80mm', '100mm'],
    'DZOFilm Arles Primes': ['14mm', '21mm', '25mm', '35mm', '40mm', '50mm', '75mm', '100mm', '135mm', '180mm'],
    'Angénieux Optimo Zoom': ['15-40mm', '28-76mm', '45-120mm', '24-290mm'],
    'Canon K-35 Vintage': ['18mm', '24mm', '35mm', '55mm', '85mm'],
    'Leica Summilux-C': ['16mm', '18mm', '21mm', '25mm', '29mm', '35mm', '40mm', '50mm', '65mm', '75mm', '100mm', '135mm']
};

export const FILM_OPTIONS = [
    { value: 'Digital Clean', label: 'Modern Digital (Clean)' },
    { value: 'Kodak Vision3 500T', label: 'Kodak Vision3 (Grainy, Warm)' },
    { value: 'Technicolor', label: 'Technicolor (Vibrant, Retro)' },
    { value: 'Black and White Noir', label: 'B&W Noir (High Contrast)' },
    { value: 'Bleach Bypass', label: 'Bleach Bypass (Gritty, Desaturated)' },
    { value: 'Vintage 1970s', label: 'Vintage 70s (Faded, Warm)' },
    { value: 'Cyberpunk Neon', label: 'Cyberpunk (Neon, Cool)' },
    { value: 'Pastel Palette', label: 'Pastel (Wes Anderson Style)' },
];

// Replaced simple LIGHTING_OPTIONS with granular categories
export const LIGHTING_MOTIVATION = [
    "Natural Light", "Practical", "Window Light", "Studio/Artificial", "Motivated", "Unmotivated/Stylized"
];

export const LIGHTING_QUALITY = [
    "Soft", "Diffused", "Hard", "Specular", "Harsh", "Wraparound", "Creamy"
];

export const LIGHTING_KEY = [
    "High-Key (Bright/Optimistic)", "Low-Key (Dark/Moody)", "Mid-Key (Neutral)"
];

export const LIGHTING_ATMOSPHERE = [
    "Haze", "Fog", "Mist", "God Rays (Light Shafts)", "Clean Air", "Smoky"
];

export const CAMERA_MOVES = [
  "Static", 
  "Handheld", 
  "Dolly In", 
  "Dolly Out", 
  "Pan Left", 
  "Pan Right",
  "Tilt Up", 
  "Tilt Down", 
  "Zoom In", 
  "Zoom Out", 
  "Truck Left", 
  "Truck Right",
  "Crane Up", 
  "Crane Down", 
  "Jib Up", 
  "Jib Down", 
  "Orbit Left", 
  "Orbit Right", 
  "FPV"
];

export const TIME_OF_DAY_OPTIONS = [
  "Morning", "Daylight", "Golden Hour", "Sunset", "Night", "Blue Hour"
];

export const WEATHER_OPTIONS = [
  "Clear", "Cloudy", "Overcast", "Raining", "Snowing", "Stormy", "Foggy"
];

// --- REFERENCE TYPE OPTIONS ---

export const LOOK_STYLE_REF_OPTIONS = [
    "Overall Vibe/Mood",
    "Color Grading Only",
    "Lighting Style Only",
    "Camera Angle/Composition",
    "Texture/Grain Structure"
];

export const SUBJECT_REF_OPTIONS = [
    "Full Character (Identity & Attire)",
    "Facial Features Only",
    "Hairstyle Only",
    "Attire/Clothing Only",
    "Pose/Gesture Only",
    "Lighting Reference"
];

export const LOCATION_REF_OPTIONS = [
    "Full Environment (Layout & Style)",
    "Architectural Style Only",
    "Color Palette Only",
    "Lighting Conditions Only",
    "Furniture/Prop Style",
    "Texture/Material Reference"
];

export const SHOT_REF_OPTIONS = [
    "Composition & Framing",
    "Lighting Direction",
    "Color Grading",
    "Camera Angle",
    "Depth of Field / Bokeh Style",
    "Visual Consistency (Subject & Loc)"
];
