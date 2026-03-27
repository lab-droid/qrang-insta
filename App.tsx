import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  LayoutTemplate, 
  PenTool, 
  Image as ImageIcon, 
  Type, 
  CheckCircle, 
  Download, 
  Copy, 
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Globe,
  Zap,
  Layers,
  Search,
  Upload,
  X,
  FileDigit,
  Briefcase,
  BrainCircuit,
  FileText,
  Target,
  TrendingUp,
  Key,
  FolderDown,
  ArrowDownToLine,
  Users,
  Palette
} from 'lucide-react';
import { 
  suggestCarrierSEOTopics,
  performDeepResearch,
  generateCarouselStructure, 
  generateSlideImage, 
  generateInstagramCaption 
} from './services/geminiService';
import { 
  AppState, 
  GenerationStep, 
  Language, 
  CarouselStructure,
  FinalCaption
} from './types';

const LANGUAGES: Language[] = ['KO', 'EN', 'JA', 'ZH'];

// Utility to handle API Key Selection
const checkApiKey = async () => {
  if (window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }
};

export default function App() {
  const [state, setState] = useState<AppState>({
    currentStep: GenerationStep.TOPIC_SELECTION,
    topic: '',
    usp: '',
    description: '',
    targetAudience: '',
    toneAndManner: '',
    slideCount: 5, // Default slide count
    referenceImages: [], // Now an array
    selectedLanguages: ['KO', 'EN', 'JA', 'ZH'],
    isAutoMode: false,
    sessionSeed: 0,
    structures: {},
    generatedImages: {},
    finalCaptions: {},
    isProcessing: false,
    isResearching: false,
    processingMessage: '',
    progress: 0,
    error: null,
  });

  const [suggestedTopicsList, setSuggestedTopicsList] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
    checkApiKey().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveApiKey = () => {
    if (apiKeyInputRef.current) {
      const key = apiKeyInputRef.current.value.trim();
      if (key) {
        setApiKey(key);
        localStorage.setItem('gemini_api_key', key);
        setIsApiKeyModalOpen(false);
      } else {
        alert("API Key를 입력해주세요.");
      }
    }
  };

  useEffect(() => {
    if (state.currentStep > GenerationStep.TOPIC_SELECTION && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.currentStep, state.processingMessage]);

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleError = (error: any) => {
    console.error(error);
    updateState({ 
      isProcessing: false, 
      isResearching: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다." 
    });
  };

  const handleOpenApiKey = async () => {
    setIsApiKeyModalOpen(true);
  };

  const handleSEOSuggestions = async () => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    updateState({ processingMessage: '1,000개 이상의 인기 주제 분석 중...' });
    try {
      const topics = await suggestCarrierSEOTopics(apiKey);
      setSuggestedTopicsList(topics);
    } catch (e) {
      console.warn("Could not fetch SEO suggestions", e);
    }
    updateState({ processingMessage: '' });
  };

  const handleDeepResearch = async () => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    if (!state.topic.trim()) {
      alert("주제를 먼저 입력해주세요.");
      return;
    }

    updateState({ isResearching: true, error: null });
    
    try {
      const result = await performDeepResearch(state.topic, apiKey);
      updateState({
        usp: result.usp,
        description: result.description,
        targetAudience: result.targetAudience,
        toneAndManner: result.toneAndManner,
        isResearching: false
      });
    } catch (e) {
      console.error(e);
      updateState({ isResearching: false, error: "AI 자동 기획 중 오류가 발생했습니다." });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remainingSlots = 10 - state.referenceImages.length;
      if (remainingSlots <= 0) {
        alert("최대 10장까지 업로드할 수 있습니다.");
        return;
      }
      
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      
      Promise.all(filesToProcess.map(file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file as Blob);
      }))).then(newImages => {
        updateState({ referenceImages: [...state.referenceImages, ...newImages] });
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
    }
  };

  const removeReferenceImage = (index: number) => {
    const newImages = [...state.referenceImages];
    newImages.splice(index, 1);
    updateState({ referenceImages: newImages });
  };

  const clearReferenceImages = () => {
    updateState({ referenceImages: [] });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateStructures = async (autoMode: boolean) => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    const selectedTopic = state.topic;
    if (!selectedTopic.trim()) return;

    const sessionSeed = Math.floor(Math.random() * 1000000);

    updateState({ 
      currentStep: GenerationStep.STRUCTURE_DESIGN, 
      isProcessing: true,
      isAutoMode: autoMode,
      sessionSeed,
      processingMessage: '다국어 콘텐츠 분석 중...',
      progress: 5,
      error: null,
      structures: {},
      generatedImages: {},
      finalCaptions: {}
    });

    try {
      updateState({ processingMessage: `구조 설계 중 (${state.slideCount}장)`, progress: 10 });
      
      const structurePromises = state.selectedLanguages.map(async (lang) => {
        const s = await generateCarouselStructure(
          selectedTopic, 
          lang, 
          state.slideCount,
          state.usp,
          state.description,
          state.targetAudience,
          state.toneAndManner,
          apiKey
        );
        return { lang, structure: s };
      });
      
      const structuresResults = await Promise.all(structurePromises);
      const newStructures: Partial<Record<Language, CarouselStructure>> = {};
      structuresResults.forEach(r => newStructures[r.lang] = r.structure);

      updateState({
        structures: newStructures,
        currentStep: GenerationStep.STRUCTURE_DESIGN,
        isProcessing: autoMode,
        processingMessage: autoMode ? '카피라이팅 최적화 중...' : '',
        progress: 30
      });

      if (autoMode) {
        await new Promise(r => setTimeout(r, 1000));
        handleGenerateImages(newStructures, sessionSeed, true);
      }

    } catch (e) {
      handleError(e);
    }
  };

  const handleGenerateImages = async (structures: Partial<Record<Language, CarouselStructure>>, sessionSeed: number, autoMode: boolean) => {
    try {
      updateState({
        currentStep: GenerationStep.IMAGE_GENERATION,
        isProcessing: true,
        processingMessage: '이미지 생성 중... (순차 처리)',
        progress: 40
      });

      const allTasks: { id: number, lang: Language, prompt: string, text: string }[] = [];
      const masterStructure = structures['EN'] || structures['KO'] || structures['JA'] || structures['ZH'];

      if (masterStructure) {
        masterStructure.slides.forEach(masterSlide => {
          const slideId = masterSlide.id;
          const commonVisualPrompt = masterSlide.imagePrompt;

          state.selectedLanguages.forEach(lang => {
            const langStruct = structures[lang];
            if (langStruct) {
              const targetSlide = langStruct.slides.find(s => s.id === slideId);
              if (targetSlide) {
                allTasks.push({
                  id: slideId,
                  lang: lang,
                  prompt: commonVisualPrompt,
                  text: targetSlide.textOverlay
                });
              }
            }
          });
        });
      }

      const BATCH_SIZE = 3; 
      const newImages = { ...state.generatedImages };
      
      for (let i = 0; i < allTasks.length; i += BATCH_SIZE) {
        const batch = allTasks.slice(i, i + BATCH_SIZE);
        const currentProgress = 40 + Math.floor((i / allTasks.length) * 40);
        updateState({ processingMessage: `이미지 생성 중... (${i + 1}/${allTasks.length})`, progress: currentProgress });
        
        await Promise.all(batch.map(async (task) => {
            try {
              const url = await generateSlideImage(task.prompt, task.text, task.lang, state.referenceImages, sessionSeed, apiKey);
              if (url) {
                newImages[`${task.id}-${task.lang}`] = url;
                setState(prev => ({ 
                  ...prev, 
                  generatedImages: { ...prev.generatedImages, [`${task.id}-${task.lang}`]: url } 
                }));
              }
            } catch (err) {
              console.error(`Failed image gen for ${task.lang} slide ${task.id}`, err);
            }
        }));
      }

      updateState({
        generatedImages: newImages,
        currentStep: GenerationStep.CAPTION_GENERATION,
        isProcessing: autoMode,
        processingMessage: autoMode ? '바이럴 캡션 및 해시태그 생성 중...' : '',
        progress: 85
      });

      if (autoMode) {
        handleGenerateCaptions(structures, true);
      }
    } catch (e) {
      handleError(e);
    }
  };

  const handleGenerateCaptions = async (structures: Partial<Record<Language, CarouselStructure>>, autoMode: boolean) => {
    try {
      updateState({
        currentStep: GenerationStep.CAPTION_GENERATION,
        isProcessing: true,
        processingMessage: '바이럴 캡션 및 해시태그 생성 중...',
        progress: 85
      });

      const captionPromises = state.selectedLanguages.map(async (lang) => {
        const struct = structures[lang];
        if (struct) {
          const cap = await generateInstagramCaption(state.topic, struct, lang, apiKey);
          return { lang, cap };
        }
        return null;
      });

      const captionResults = await Promise.all(captionPromises);
      const newCaptions: Partial<Record<Language, FinalCaption>> = {};
      captionResults.forEach(r => {
        if (r) newCaptions[r.lang] = r.cap;
      });

      updateState({
        finalCaptions: newCaptions,
        currentStep: GenerationStep.FINAL_RESULT,
        isProcessing: false,
        processingMessage: '',
        progress: 100
      });
    } catch (e) {
      handleError(e);
    }
  };

  // --- Download Utilities ---
  
  const downloadImage = async (url: string, filename: string) => {
    try {
      // Use fetch to get the blob from the data URL, ensuring it's fully loaded
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a); // Required for Firefox and some browsers
      a.click();
      document.body.removeChild(a);
      
      // Clean up
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Download failed, falling back to direct link", e);
      // Fallback
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const downloadLanguageSet = async (lang: Language) => {
    const struct = state.structures[lang];
    if (!struct) return;
    
    // Download loop with slight delay to prevent browser blocking
    for (let i = 0; i < struct.slides.length; i++) {
      const slide = struct.slides[i];
      const key = `${slide.id}-${lang}`;
      const url = state.generatedImages[key];
      if (url) {
        await downloadImage(url, `QRANG_${lang}_Slide_${slide.id}.png`);
        await new Promise(r => setTimeout(r, 250)); 
      }
    }
  };

  const downloadAllImages = async () => {
    for (const lang of state.selectedLanguages) {
      await downloadLanguageSet(lang);
      await new Promise(r => setTimeout(r, 250)); // Delay between languages
    }
  };

  const copyCaption = (lang: Language) => {
    const cap = state.finalCaptions[lang];
    if (cap) {
      const text = `${cap.mainText}\n\n${cap.hashtags.map(t => '#' + t).join(' ')}`;
      navigator.clipboard.writeText(text);
      alert(`${lang === 'KO' ? '한국어' : lang === 'JA' ? '일본어' : lang === 'ZH' ? '중국어' : '영어'} 캡션이 복사되었습니다!`);
    }
  };

  // --- UI Components ---

  const renderStepIndicator = () => {
    const steps = [
      { id: GenerationStep.TOPIC_SELECTION, icon: Search, label: '주제 선정' },
      { id: GenerationStep.STRUCTURE_DESIGN, icon: LayoutTemplate, label: '구조 설계' },
      { id: GenerationStep.IMAGE_GENERATION, icon: ImageIcon, label: '이미지' },
      { id: GenerationStep.CAPTION_GENERATION, icon: Type, label: '캡션' },
      { id: GenerationStep.FINAL_RESULT, icon: CheckCircle, label: '완료' },
    ];

    return (
      <div className="w-full bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
             <Layers size={24} className="text-blue-400"/>
             <span className="hidden sm:block">큐랑 인스타그램 캐러셀 AI</span>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-4">
              {steps.map((step) => {
                const isActive = state.currentStep === step.id;
                const isCompleted = state.currentStep > step.id;
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <div className={`p-1.5 rounded-full transition-all duration-300 ${
                      isActive ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 
                      isCompleted ? 'bg-green-500/20 text-green-400' : 'text-slate-600'
                    }`}>
                      <Icon size={16} />
                    </div>
                    {isActive && <div className="h-1 w-1 bg-blue-500 rounded-full mt-1 animate-bounce"></div>}
                  </div>
                );
              })}
            </div>

            {/* API Key Button */}
            <button 
              onClick={handleOpenApiKey}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
              title="API Key Settings"
            >
              <Key size={14} />
              <span className="hidden sm:inline">API Key</span>
            </button>
          </div>
        </div>
        
        {state.isProcessing && (
           <div className="w-full bg-blue-900/20 py-1 text-center border-b border-blue-500/20">
             <p className="text-xs text-blue-300 animate-pulse flex items-center justify-center gap-2 font-mono">
               <RefreshCw className="animate-spin" size={12}/> {state.processingMessage}
             </p>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-blue-500/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]"></div>
      </div>

      {renderStepIndicator()}

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 sm:py-12">
        
        {/* Step 0: Dashboard / Topic Selection */}
        {state.currentStep === GenerationStep.TOPIC_SELECTION && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10 animate-fade-in">
            
            <div className="text-center space-y-4 max-w-2xl">
              <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-400">
                  큐랑 인스타그램 캐러셀 AI
                </span>
              </h1>
              <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
                큐랑과 함께 한국어, 영어, 일본어 콘텐츠를<br/>한 번의 클릭으로 완성하세요.
              </p>
            </div>

            <div className="w-full max-w-xl flex flex-col gap-6">
              
              {/* Main Input Area */}
              <div className="bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-700/50 shadow-2xl space-y-5">
                
                {/* Topic Input Row */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1">주제 (Topic)</label>
                  <div className="flex gap-2 items-center bg-slate-800/80 rounded-xl p-2 border border-slate-700 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                     <div className="pl-3 text-slate-400">
                      <Search size={20} />
                    </div>
                    <input 
                      type="text" 
                      value={state.topic}
                      onChange={(e) => updateState({ topic: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && state.topic && handleGenerateStructures(false)}
                      placeholder="주제를 입력하세요"
                      className="flex-1 bg-transparent border-none outline-none text-white px-2 py-2 text-lg placeholder:text-slate-600"
                      autoFocus
                    />
                  </div>
                  
                  {/* Action Buttons: SEO & Deep Research */}
                  <div className="flex flex-wrap justify-end gap-2">
                     <button
                      onClick={handleSEOSuggestions}
                      className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-500/30 transition-all"
                    >
                      <TrendingUp size={12} />
                      캐리어 SEO 주제 추천
                    </button>

                    <button
                      onClick={handleDeepResearch}
                      disabled={!state.topic || state.isResearching}
                      className={`
                        flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-all
                        ${state.isResearching 
                          ? 'bg-purple-900/20 text-purple-300 cursor-wait' 
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 hover:-translate-y-0.5'
                        }
                      `}
                    >
                      {state.isResearching ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          AI 자동 기획 중...
                        </>
                      ) : (
                        <>
                          <BrainCircuit size={12} />
                          AI 자동 기획
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* SEO Suggestions (In-card display) */}
                {suggestedTopicsList.length > 0 && (
                  <div className="animate-fade-in bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 mb-2 font-medium flex items-center gap-1">
                      <TrendingUp size={12}/> 추천 SEO 주제 (클릭하여 적용)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTopicsList.map((t, i) => (
                        <button 
                          key={i}
                          onClick={() => updateState({ topic: t })}
                          className="text-xs bg-slate-700 hover:bg-blue-600 hover:text-white text-slate-300 px-3 py-1.5 rounded-full transition-colors border border-slate-600 hover:border-blue-500"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* USP & Description Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                      <Target size={14} /> 핵심 강점 (USP)
                    </label>
                    <input 
                      type="text" 
                      value={state.usp}
                      onChange={(e) => updateState({ usp: e.target.value })}
                      placeholder="AI 자동 기획으로 생성되거나 직접 입력"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                      <FileText size={14} /> 상세 설명
                    </label>
                    <textarea 
                      value={state.description}
                      onChange={(e) => updateState({ description: e.target.value })}
                      placeholder="콘텐츠의 방향성이나 포함할 내용을 입력하세요"
                      rows={1}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600 resize-none"
                    />
                  </div>
                </div>

                {/* Target Audience & Tone and Manner Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                      <Users size={14} /> 타겟 고객
                    </label>
                    <input 
                      type="text" 
                      value={state.targetAudience}
                      onChange={(e) => updateState({ targetAudience: e.target.value })}
                      placeholder="예: 2030 직장인, 초보 여행자 등"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
                      <Palette size={14} /> 톤앤매너
                    </label>
                    <input 
                      type="text" 
                      value={state.toneAndManner}
                      onChange={(e) => updateState({ toneAndManner: e.target.value })}
                      placeholder="예: 전문적인, 유머러스한, 감성적인"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-800 my-4"></div>

                {/* Reference Images Upload Row */}
                <div className="flex gap-2 items-center bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 border-dashed hover:border-blue-500/30 transition-all">
                  <div className="pl-1 text-slate-400">
                    <ImageIcon size={20} />
                  </div>
                  <div className="flex-1 px-2">
                     <p className="text-sm text-slate-300">참고 이미지 업로드 ({state.referenceImages.length}/10)</p>
                     <p className="text-xs text-slate-500">스타일 및 제품 참조용 (제품 일관성 100% 반영)</p>
                  </div>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    이미지 선택
                  </button>
                </div>
                
                {/* Reference Images Grid (Inside Form) */}
                {state.referenceImages.length > 0 && (
                   <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                      {state.referenceImages.map((img, idx) => (
                        <div key={idx} className="relative w-16 h-16 shrink-0 group">
                           <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover rounded-lg border border-slate-600" />
                           <button 
                             onClick={() => removeReferenceImage(idx)}
                             className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                           >
                             <X size={10} />
                           </button>
                        </div>
                      ))}
                      <button 
                         onClick={clearReferenceImages}
                         className="text-xs text-red-400 hover:text-red-300 px-2 self-center shrink-0"
                      >
                        전체 삭제
                      </button>
                   </div>
                )}

                {/* Settings Row (Slide Count) */}
                <div className="flex items-center justify-between px-2 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <FileDigit size={16} />
                      <span>장수 설정:</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={state.slideCount} 
                        onChange={(e) => updateState({ slideCount: parseInt(e.target.value) })}
                        className="w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <span className="w-8 text-center text-sm font-bold text-white">{state.slideCount}장</span>
                    </div>
                  </div>
                </div>

                {/* Language Selection */}
                <div className="flex flex-col gap-2 pt-2 px-2">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Globe size={16} />
                    <span>생성 언어:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateState({ selectedLanguages: ['KO', 'EN', 'JA', 'ZH'] })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${state.selectedLanguages.length === 4 ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                    >
                      모든 언어
                    </button>
                    {LANGUAGES.map(lang => {
                      const isSelected = state.selectedLanguages.includes(lang);
                      const label = lang === 'KO' ? '한국어' : lang === 'EN' ? '영어' : lang === 'JA' ? '일본어' : '중국어';
                      return (
                        <button
                          key={lang}
                          onClick={() => {
                            let newLangs = [...state.selectedLanguages];
                            if (isSelected) {
                              newLangs = newLangs.filter(l => l !== lang);
                            } else {
                              newLangs.push(lang);
                            }
                            if (newLangs.length === 0) newLangs = ['KO']; // Prevent empty selection
                            updateState({ selectedLanguages: newLangs });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${isSelected && state.selectedLanguages.length !== 4 ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => handleGenerateStructures(false)}
                    disabled={!state.topic}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium border border-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    다음 단계 (수정하며 진행) <ChevronRight size={18} />
                  </button>
                  <button 
                    onClick={() => handleGenerateStructures(true)}
                    disabled={!state.topic}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Zap size={18} /> 자동화 진행 (최종까지 자동)
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Processing State */}
        {state.isProcessing && (
           <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8">
             <div className="relative">
               <div className="w-32 h-32 rounded-full border-4 border-slate-800"></div>
               <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center flex-col">
                 <span className="text-2xl font-bold text-blue-400">{state.progress}%</span>
               </div>
             </div>
             <div className="text-center space-y-4 w-full max-w-md">
               <h2 className="text-2xl font-bold text-white animate-pulse">콘텐츠 생성 중...</h2>
               <p className="text-slate-400 font-mono text-sm">{state.processingMessage}</p>
               
               {/* Progress Bar */}
               <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                 <div 
                   className="bg-gradient-to-r from-blue-600 to-blue-400 h-2.5 rounded-full transition-all duration-500 ease-out"
                   style={{ width: `${state.progress}%` }}
                 ></div>
               </div>
             </div>
           </div>
        )}

        {/* Step 2: Structure Design Review */}
        {state.currentStep === GenerationStep.STRUCTURE_DESIGN && !state.isProcessing && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">구조 및 카피라이팅 검토</h2>
                <p className="text-slate-400">생성된 슬라이드 구조와 텍스트를 확인하고 수정할 수 있습니다.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleGenerateImages(state.structures, state.sessionSeed, false)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all"
                >
                  다음 단계 (이미지 생성) <ChevronRight size={18} />
                </button>
                <button 
                  onClick={() => handleGenerateImages(state.structures, state.sessionSeed, true)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold border border-slate-700 transition-all"
                >
                  <Zap size={18} /> 이후 자동화
                </button>
              </div>
            </div>

            <div className="space-y-12">
              {state.selectedLanguages.map(lang => {
                const struct = state.structures[lang];
                if (!struct) return null;
                return (
                  <div key={lang} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                        <Globe className="text-blue-400" size={20}/>
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {lang === 'KO' ? '한국어' : lang === 'EN' ? '영어' : lang === 'JA' ? '일본어' : '중국어'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {struct.slides.map((slide, idx) => (
                        <div key={slide.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold bg-slate-700 text-slate-300 px-2 py-1 rounded">Slide {slide.id}</span>
                            <span className="text-xs text-blue-400 font-medium uppercase">{slide.role}</span>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">이미지 텍스트 (Text Overlay)</label>
                            <textarea 
                              value={slide.textOverlay}
                              onChange={(e) => {
                                const newStructs = { ...state.structures };
                                newStructs[lang]!.slides[idx].textOverlay = e.target.value;
                                updateState({ structures: newStructs });
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none h-20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">이미지 프롬프트 (Image Prompt)</label>
                            <textarea 
                              value={slide.imagePrompt}
                              onChange={(e) => {
                                const newStructs = { ...state.structures };
                                newStructs[lang]!.slides[idx].imagePrompt = e.target.value;
                                updateState({ structures: newStructs });
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none h-20"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Image Generation Review */}
        {state.currentStep === GenerationStep.CAPTION_GENERATION && !state.isProcessing && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">이미지 검토</h2>
                <p className="text-slate-400">생성된 이미지를 확인하고 캡션 생성을 진행합니다.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleGenerateCaptions(state.structures, false)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all"
                >
                  다음 단계 (캡션 생성) <ChevronRight size={18} />
                </button>
                <button 
                  onClick={() => handleGenerateCaptions(state.structures, true)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold border border-slate-700 transition-all"
                >
                  <Zap size={18} /> 이후 자동화
                </button>
              </div>
            </div>

            <div className="space-y-12">
              {state.selectedLanguages.map(lang => {
                const struct = state.structures[lang];
                if (!struct) return null;
                return (
                  <div key={lang} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                        <Globe className="text-blue-400" size={20}/>
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {lang === 'KO' ? '한국어' : lang === 'EN' ? '영어' : lang === 'JA' ? '일본어' : '중국어'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      {struct.slides.map((slide) => {
                        const imgKey = `${slide.id}-${lang}`;
                        const imgUrl = state.generatedImages[imgKey];
                        return (
                          <div key={slide.id} className="group relative aspect-[4/5] bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50">
                            {imgUrl ? (
                              <img src={imgUrl} alt={slide.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                <ImageIcon className="text-slate-600 animate-pulse" size={32} />
                              </div>
                            )}
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md">
                              <span className="text-xs font-bold text-white">Slide {slide.id}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Final Result (Multi-Language) */}
        {state.currentStep === GenerationStep.FINAL_RESULT && (
          <div className="space-y-16 animate-fade-in-up">
            
            <div className="flex justify-between items-end border-b border-white/10 pb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{state.topic}</h2>
                <p className="text-slate-400">모든 언어 결과물 생성 완료</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={downloadAllImages}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-green-900/20 transition-all hover:-translate-y-0.5"
                >
                  <Download size={18} /> 전체 다운로드 (All)
                </button>
                <button 
                   onClick={() => updateState({ currentStep: GenerationStep.TOPIC_SELECTION, topic: '', usp: '', description: '', referenceImages: [] })}
                   className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>

            {/* Language Sections */}
            {state.selectedLanguages.map((lang) => {
              const struct = state.structures[lang];
              const caption = state.finalCaptions[lang];
              if (!struct) return null;

              return (
                <section key={lang} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                        <Globe className="text-blue-400" size={20}/>
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {lang === 'KO' ? 'Korean (한국어)' : lang === 'JA' ? 'Japanese (日本語)' : lang === 'ZH' ? 'Chinese (中文)' : 'English'}
                      </h3>
                    </div>
                    
                    {/* Language Set Download Button */}
                    <button 
                      onClick={() => downloadLanguageSet(lang)}
                      className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      <FolderDown size={16} />
                      {lang === 'KO' ? '한국어 세트 저장' : lang === 'JA' ? '일본어 세트 저장' : lang === 'ZH' ? '중국어 세트 저장' : '영어 세트 저장'}
                    </button>
                  </div>

                  {/* Carousel Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {struct.slides.map((slide) => {
                      const imgKey = `${slide.id}-${lang}`;
                      const imgUrl = state.generatedImages[imgKey];
                      return (
                        <div key={slide.id} className="group relative aspect-[4/5] bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1">
                          {imgUrl ? (
                            <img src={imgUrl} alt={slide.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                              <ImageIcon className="text-slate-600 animate-pulse" size={32} />
                            </div>
                          )}
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                             <div className="absolute top-2 right-2 flex gap-2">
                               {/* Individual Download Button */}
                               {imgUrl && (
                                 <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadImage(imgUrl, `QRANG_${lang}_Slide_${slide.id}.png`);
                                  }}
                                  className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                                  title="이미지 다운로드"
                                 >
                                   <ArrowDownToLine size={16} />
                                 </button>
                               )}
                               <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1.5 rounded backdrop-blur-md">
                                 {slide.id}
                               </span>
                             </div>

                             <span className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">{slide.role}</span>
                             <p className="text-white text-sm font-medium leading-snug">{slide.title}</p>
                             <div className="mt-2 pt-2 border-t border-white/10">
                               <p className="text-xs text-slate-300 truncate">"{slide.textOverlay}"</p>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Caption Box */}
                  {caption && (
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                      <div className="bg-slate-800/80 px-4 py-3 flex justify-between items-center border-b border-slate-700/50">
                        <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <Type size={14} /> 인스타그램 캡션
                        </span>
                        <button 
                          onClick={() => copyCaption(lang)}
                          className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Copy size={12} /> 텍스트 복사
                        </button>
                      </div>
                      <div className="p-4 text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                        {caption.mainText}
                        <div className="mt-4 text-blue-400 font-medium">
                          {caption.hashtags.map(t => `#${t}`).join(' ')}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
            
            <div ref={bottomRef} className="h-10"/>
          </div>
        )}

        {state.error && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500/10 backdrop-blur-xl border border-red-500/50 text-red-200 px-6 py-4 rounded-xl shadow-2xl text-center max-w-md w-full animate-fade-in-up z-50">
            <p className="font-bold flex items-center justify-center gap-2"><Zap size={16}/> 생성 오류</p>
            <p className="text-sm mt-1 opacity-90">{state.error}</p>
            <button 
              onClick={() => updateState({ currentStep: GenerationStep.TOPIC_SELECTION, error: null })}
              className="mt-3 text-xs bg-red-500/20 hover:bg-red-500/30 px-4 py-1.5 rounded-full transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

      </main>

      {/* Developer Info */}
      <div className="fixed bottom-4 left-4 z-50">
        <span className="text-slate-500 text-xs font-medium bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800 backdrop-blur-sm">
          개발자 : 정혁신
        </span>
      </div>

      {/* API Key Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-blue-400 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Key size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">API Key 설정</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-slate-400 text-sm leading-relaxed">
                앱을 사용하기 위해 Gemini API Key가 필요합니다.<br/>
                입력한 키는 브라우저에 안전하게 저장됩니다.
              </p>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gemini API Key</label>
                <input 
                  ref={apiKeyInputRef}
                  type="password" 
                  defaultValue={apiKey}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 font-mono"
                />
              </div>

              <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs text-blue-300 flex gap-2">
                  <span className="shrink-0">ℹ️</span>
                  <span>API Key는 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline hover:text-blue-200">Google AI Studio</a>에서 발급받을 수 있습니다.</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {apiKey && (
                <button 
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                >
                  취소
                </button>
              )}
              <button 
                onClick={saveApiKey}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5"
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}