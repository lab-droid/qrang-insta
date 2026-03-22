import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CarouselStructure, FinalCaption, Language, SlideContent } from "../types";

// Helper to ensure API key is available via the specific paid key flow
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

const getClient = async (apiKey?: string): Promise<GoogleGenAI> => {
  if (apiKey) {
    return new GoogleGenAI({ apiKey });
  }
  if (window.aistudio) {
     const hasKey = await window.aistudio.hasSelectedApiKey();
     if (!hasKey) {
        throw new Error("API Key not selected. Please select a key.");
     }
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

// --- 1. SEO Topic Recommendation ---
export const suggestCarrierSEOTopics = async (apiKey?: string): Promise<string[]> => {
  const ai = await getClient(apiKey);
  
  // Prompt engineered to simulate selecting from a large dataset of 1000+ topics
  const prompt = `
    You are an expert Social Media Trend Analyst with a database of over 1,000 high-performing content topics related to 'Travel Luggage', 'Carriers', and 'Suitcases'.
    
    From this database of 1,000+ topics, RANDOMLY select 5 distinct, high-traffic topics.
    
    Selection Criteria:
    - High Search Volume & Virality on Instagram/TikTok.
    - Diverse Categories: Packing hacks, Brand comparisons, Durability stress tests, Airport/Airline specific rules, Material science (PC vs ABS).
    - Output Language: Korean (Hangul).
    - Format: Catchy, clickable titles.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      temperature: 1.2 // High temperature to ensure randomness from the "1000+" pool
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse SEO topics", e);
    return [
      "기내용 vs 수하물용 캐리어 사이즈 완벽 정리", 
      "절대 고장 안 나는 캐리어 고르는 3가지 기준", 
      "현직 승무원이 알려주는 캐리어 짐싸기 테트리스 비법", 
      "여행 유튜버들이 쓰는 10만원대 가성비 캐리어 추천", 
      "수하물 파손/분실 시 대처 방법 A to Z"
    ];
  }
};

// --- 1.5 Deep Research ---
export const performDeepResearch = async (topic: string, apiKey?: string): Promise<{ usp: string, description: string }> => {
  const ai = await getClient(apiKey);
  
  const prompt = `
    Analyze the topic: "${topic}" for an Instagram Carousel.
    
    1. Identify the most compelling Unique Selling Proposition (USP) or "Hook" that would make this content go viral. What is the core value proposition?
    2. Write a detailed description of the content strategy. What key points should be covered? What is the angle?
    
    Return the result in Korean (Hangul).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          usp: { type: Type.STRING, description: "The core hook or unique selling point (Korean)" },
          description: { type: Type.STRING, description: "Detailed content strategy description (Korean)" }
        },
        required: ['usp', 'description']
      },
      thinkingConfig: { thinkingBudget: 2048 } // Use thinking for deep analysis
    }
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return {
      usp: data.usp || "",
      description: data.description || ""
    };
  } catch (e) {
    console.error("Deep Research failed", e);
    return { usp: "", description: "" };
  }
};

// --- 2. Structure Design & 3. Copywriting (Combined for efficiency) ---
export const generateCarouselStructure = async (
  topic: string, 
  language: Language, 
  slideCount: number,
  usp?: string,
  description?: string,
  apiKey?: string
): Promise<CarouselStructure> => {
  const ai = await getClient(apiKey);
  
  const systemPrompt = `
    You are an expert Instagram content strategist. 
    Create a high-performing carousel structure (${slideCount} slides) for the topic: "${topic}".
    The content must be in ${language === 'KO' ? 'Korean' : language === 'JA' ? 'Japanese' : 'English'}.

    ${usp ? `CORE USP (Focus on this): ${usp}` : ''}
    ${description ? `CONTEXT & DETAILS: ${description}` : ''}
    
    Structure Requirements:
    - Total Slides: ${slideCount}
    - Slide 1: Hook (Intro)
    ${slideCount > 1 ? `- Slide ${slideCount}: Call to Action (CTA)` : ''}
    - Intermediate Slides: Problem, Agitation, Solution, Value, Proof, etc. as appropriate for the count.

    For 'textOverlay', provide the EXACT text that should appear visibly ON the image. Keep it short, punchy, and readable.
    
    CRITICAL FOR IMAGE PROMPTS:
    For 'imagePrompt', describe a high-quality, photorealistic or 3D vector style image suitable for 'gemini-3-pro-image-preview'.
    **You MUST write the 'imagePrompt' in ENGLISH**, regardless of the target language.
    The image prompt should be detailed and descriptive to ensure visual consistency.
    Mention that it should be vertical composition (Portrait).
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      topic: { type: Type.STRING },
      targetAudience: { type: Type.STRING },
      slides: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            role: { type: Type.STRING, enum: ['intro', 'problem', 'solution', 'climax', 'cta', 'content'] },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            textOverlay: { type: Type.STRING }
          },
          required: ['id', 'role', 'title', 'description', 'imagePrompt', 'textOverlay']
        }
      }
    },
    required: ['topic', 'targetAudience', 'slides']
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Topic: ${topic}. Language: ${language}. Slide Count: ${slideCount}.`,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 1024 } // Use thinking for better structure
    }
  });

  const text = response.text;
  if (!text) throw new Error("No structure generated");
  return JSON.parse(text) as CarouselStructure;
};

// --- 4. Image Generation ---
export const generateSlideImage = async (
  prompt: string, 
  textOverlay: string, 
  language: Language,
  referenceImages?: string[], 
  seed?: number,
  apiKey?: string
): Promise<string> => {
  const ai = await getClient(apiKey);
  
  const langName = language === 'KO' ? 'Korean (Hangul)' : language === 'JA' ? 'Japanese' : 'English';

  // Construct a prompt that strongly enforces strict product preservation when reference images are present.
  const fullPrompt = `
    [ROLE: EXPERT PRODUCT COMPOSITOR & TYPOGRAPHER]
    
    [CORE TASK]
    Integrate the PRODUCT from the reference image(s) into the scene described below.
    Overlay the text "${textOverlay}" in ${langName}.

    [STRICT PRODUCT PRESERVATION GUIDELINES]
    1. **NO HALLUCINATION**: The object in the reference image IS the product. You must render it EXACTLY as it appears. Do not change its shape, details, handle style, wheel design, or brand logo.
    2. **COLOR ACCURACY**: Maintain the exact color of the reference product.
    3. **REALISM**: The product must look photorealistic, as if the reference photo was professionally retouched into the new background. 
    4. **NO DISTORTION**: Do not warp or distort the product proportions.

    [COMPOSITION RULES - INSTAGRAM PORTRAIT]
    1. **Aspect Ratio**: The image will be generated in 3:4.
    2. **Safe Area**: Ensure the main subject (Carrier/Luggage) and the Text Overlay are centered within the "4:5 Safe Area" (middle 80% height). This ensures no clipping when posted on Instagram.
    3. **Spacing**: Leave adequate negative space at the very top and very bottom.

    [TEXT OVERLAY RULES]
    1. Text: "${textOverlay}"
    2. Legibility: High contrast against background.
    3. Style: Modern, clean, professional advertising typography.
    
    [SCENE DESCRIPTION]
    ${prompt}
  `;

  const parts: any[] = [];
  
  if (referenceImages && referenceImages.length > 0) {
    referenceImages.forEach(img => {
      // Robustly handle base64 strings to extract type and data
      const match = img.match(/^data:(.+);base64,(.+)$/);
      let mimeType = 'image/jpeg';
      let data = img;

      if (match) {
        mimeType = match[1];
        data = match[2];
      } else if (img.includes('base64,')) {
         data = img.split('base64,')[1];
      }

      parts.push({
        inlineData: {
          mimeType: mimeType, 
          data: data
        }
      });
    });
  }

  parts.push({ text: fullPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4", // Closest supported vertical ratio for 1080x1350 (4:5)
          imageSize: "1K"
        },
        seed: seed
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        // Respect the returned mimeType
        const mime = part.inlineData.mimeType || 'image/png';
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
  
  throw new Error("No image data returned from Gemini.");
};

// --- 5. Caption Generation ---
export const generateInstagramCaption = async (topic: string, structure: CarouselStructure, language: Language, apiKey?: string): Promise<FinalCaption> => {
  const ai = await getClient(apiKey);
  
  const slideSummaries = structure.slides.map(s => `[${s.role}] ${s.textOverlay}`).join('\n');
  const langName = language === 'KO' ? 'Korean' : language === 'JA' ? 'Japanese' : 'English';

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Write an engaging Instagram caption for a carousel about "${topic}".
      Language: ${langName}.
      
      Slides Content:
      ${slideSummaries}
      
      Format:
      1. Hook line
      2. Value provided (bullet points)
      3. Engagement question
      4. 5 Relevant hashtags
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mainText: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
};