export type LanguageCode = string;

export interface Language {
  name: string;
  code: string;
  flag: string;
}

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  style: string;
  avatarSeed: string; // For picsum
}

export interface AppState {
  currentStep: number;
  apiKeyStt: string;
  apiKeyMinimax: string;
  videoFile: File | null;
  videoPreviewUrl: string | null;
  sourceText: string;
  translatedText: string;
  targetLanguage: string;
  selectedVoiceId: string;
  voiceSpeed: number;
  generatedAudioUrl: string | null;
  isProcessing: boolean;
  isGeneratingAudio?: boolean;
  processingStage: string; // Description of current task
  finalVideoUrl: string | null;
  serverVideoPath?: string;
  serverTTSAudioPath?: string;
  isCloneMode?: boolean;
  cloneAudioFile?: File | null;
  emotionType?: string;
  emotionAlpha?: number;
}

export type ProcessingLog = {
  id: string;
  message: string;
  status: 'pending' | 'active' | 'completed';
};
