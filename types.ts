export enum GenerationStep {
  TOPIC_SELECTION = 0,
  STRUCTURE_DESIGN = 1,
  COPYWRITING = 2,
  IMAGE_GENERATION = 3,
  CAPTION_GENERATION = 4,
  FINAL_RESULT = 5,
}

export type Language = 'KO' | 'EN' | 'JA';

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
  slideCount: number; // Number of slides to generate (1-10)
  referenceImages: string[]; // Array of Base64 strings (Max 10)
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