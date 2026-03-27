export enum GenerationStep {
  TOPIC_SELECTION = 0,
  STRUCTURE_DESIGN = 1,
  IMAGE_GENERATION = 2,
  CAPTION_GENERATION = 3,
  FINAL_RESULT = 4,
}

export type Language = 'KO' | 'EN' | 'JA' | 'ZH';

export interface SlideContent {
  id: number;
  role: 'intro' | 'problem' | 'solution' | 'climax' | 'cta' | 'content';
  title: string;
  description: string;
  imagePrompt: string;
  textOverlay: string; // The text to be rendered ON the image
}

export interface CarouselStructure {
  topic: string;
  targetAudience: string;
  slides: SlideContent[];
}

export interface GeneratedImage {
  slideId: number;
  language: Language;
  imageUrl: string;
  loading: boolean;
}

export interface FinalCaption {
  mainText: string;
  hashtags: string[];
}

export interface AppState {
  currentStep: GenerationStep;
  topic: string;
  usp: string; // Unique Selling Proposition
  description: string; // Detailed Description
  targetAudience: string; // Target Audience
  toneAndManner: string; // Tone and Manner
  slideCount: number; // Number of slides to generate (1-10)
  referenceImages: string[]; // Array of Base64 strings (Max 10)
  selectedLanguages: Language[]; // Selected languages for generation
  isAutoMode: boolean; // Whether to automatically proceed to the final step
  sessionSeed: number; // Seed for consistent image generation
  structures: Partial<Record<Language, CarouselStructure>>;
  generatedImages: Record<string, string>; // Key: "slideId-Lang" -> Url
  finalCaptions: Partial<Record<Language, FinalCaption>>;
  isProcessing: boolean;
  isResearching: boolean; // New state for Deep Research loading
  processingMessage: string;
  progress: number; // Progress percentage (0-100)
  error: string | null;
}

export const ASPECT_RATIO_W = 1080;
export const ASPECT_RATIO_H = 1350; // 4:5 aspect ratio (Instagram Portrait)