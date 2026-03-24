import React, { useState, useEffect } from 'react';
import {
  Settings, Video, Layout, Music, Languages,
  User, LifeBuoy, Sparkles, FolderOpen, Key
} from 'lucide-react';
import { AppState, ProcessingLog } from './types';
import { VOICES, PROCESSING_STEPS, LANGUAGES } from './constants';
import LoadingScreen from './components/LoadingScreen';
import ApiKeyModal from './components/ApiKeyModal';
import Toast from './components/Toast';
import { api } from './api';

// Components
import Step1Upload from './components/steps/Step1Upload';
import Step2Script from './components/steps/Step2Script';
import Step3Voice from './components/steps/Step3Voice';
import Step4Render from './components/steps/Step4Render';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);

  // Unified State
  const [state, setState] = useState<AppState>({
    currentStep: 1, // Kept for compatibility but UI is now unified
    apiKeyStt: '',
    apiKeyMinimax: '',
    videoFile: null,
    videoPreviewUrl: null,
    sourceText: '',
    translatedText: '',
    targetLanguage: '英语', // Default to English (using Chinese name as code)
    selectedVoiceId: VOICES[0].id,
    voiceSpeed: 1.0,
    generatedAudioUrl: null,
    isProcessing: false,
    isGeneratingAudio: false,
    processingStage: '',
    finalVideoUrl: null,
    isCloneMode: false,
    cloneAudioFile: null,
    emotionType: 'happy',
    emotionAlpha: 1.0,
  });

  const [logs, setLogs] = useState<ProcessingLog[]>([]);

  // Init Keys - removed auto-popup logic
  useEffect(() => {
    const stt = localStorage.getItem('G_SYNC_STT_KEY');
    const mini = localStorage.getItem('G_SYNC_MINI_KEY');
    if (stt) setState(s => ({ ...s, apiKeyStt: stt }));
    if (mini) setState(s => ({ ...s, apiKeyMinimax: mini }));
  }, []);

  const handleSaveKeys = (stt: string, mini: string) => {
    localStorage.setItem('G_SYNC_STT_KEY', stt);
    localStorage.setItem('G_SYNC_MINI_KEY', mini);
    setState(s => ({ ...s, apiKeyStt: stt, apiKeyMinimax: mini }));
    setShowKeyModal(false);
    setToast({ msg: 'API 密钥已更新', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Logic Handlers (Same logic, triggered from different UI points) ---

  const handleFileUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    setState(s => ({ ...s, videoFile: file, videoPreviewUrl: url, isProcessing: true, processingStage: '正在上传视频...' }));

    try {
      // 1. Upload Video
      const uploadRes = await api.uploadVideo(file);
      setState(s => ({ ...s, serverVideoPath: uploadRes.file_path, processingStage: '', isProcessing: false }));
      setToast({ msg: '视频上传成功', type: 'success' });
    } catch (error) {
      console.error(error);
      setToast({ msg: '视频上传失败', type: 'error' });
      setState(s => ({ ...s, isProcessing: false, processingStage: '' }));
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!state.serverVideoPath) return;
    setState(s => ({ ...s, isProcessing: true, processingStage: '正在分析语音内容...' }));
    try {
      const sttRes = await api.processVideo(state.serverVideoPath);
      setState(s => ({
        ...s,
        sourceText: sttRes.text,
        isProcessing: false,
        processingStage: ''
      }));
      setToast({ msg: '视频分析完成', type: 'success' });
    } catch (error) {
      console.error(error);
      setToast({ msg: '视频分析失败', type: 'error' });
      setState(s => ({ ...s, isProcessing: false, processingStage: '' }));
    }
  };

  const handleTranslate = async () => {
    if (!state.sourceText) return;
    setState(s => ({ ...s, isProcessing: true }));
    try {
      // Find the language object to get the correct name (e.g. "Thai" -> "泰语")
      const langObj = LANGUAGES.find(l => l.code === state.targetLanguage);
      const targetLangName = langObj ? langObj.code : state.targetLanguage;

      const res = await api.translate(state.sourceText, targetLangName);
      setState(s => ({ ...s, translatedText: res.translated_text, isProcessing: false }));
    } catch (error) {
      console.error(error);
      setToast({ msg: '翻译失败', type: 'error' });
      setState(s => ({ ...s, isProcessing: false }));
    }
  };

  const handleGenerateAudio = async () => {
    if (!state.translatedText) return;
    setState(s => ({ ...s, isGeneratingAudio: true }));
    try {
      let res;
      if (state.isCloneMode) {
        const refFile = state.cloneAudioFile || state.videoFile;
        if (!refFile) {
          setToast({ msg: '请上传参考音频或视频', type: 'error' });
          setState(s => ({ ...s, isGeneratingAudio: false }));
          return;
        }
        res = await api.ttsClone(state.translatedText, refFile, state.voiceSpeed, state.emotionType, state.emotionAlpha);
      } else {
        // Find the language object to get the correct name (e.g. "Thai" -> "泰语")
        const langObj = LANGUAGES.find(l => l.code === state.targetLanguage);
        const targetLangName = langObj ? langObj.code : state.targetLanguage;
        res = await api.tts(state.translatedText, state.selectedVoiceId, state.voiceSpeed, targetLangName);
      }

      const audioUrl = api.getFileUrl(res.audio_path);
      setState(s => ({
        ...s,
        generatedAudioUrl: audioUrl,
        serverTTSAudioPath: res.audio_path,
        isGeneratingAudio: false
      }));
    } catch (error) {
      console.error(error);
      setToast({ msg: '语音合成失败', type: 'error' });
      setState(s => ({ ...s, isGeneratingAudio: false }));
    }
  };

  const handleStartRender = async () => {
    if (!state.serverVideoPath || !state.serverTTSAudioPath) {
      setToast({ msg: '缺少必要资源，请先完成前序步骤', type: 'error' });
      return;
    }

    setState(s => ({ ...s, isProcessing: true }));
    setLogs([]);

    // Simulate steps for UI feedback while waiting for the single API call
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < PROCESSING_STEPS.length - 1) {
        const currentMsg = PROCESSING_STEPS[stepIndex];
        setLogs(prev => [
          ...prev.map(l => ({ ...l, status: 'completed' as const })),
          { id: stepIndex.toString(), message: currentMsg, status: 'active' as const }
        ]);
        stepIndex++;
      }
    }, 2000);

    try {
      const res = await api.lipsync(
        state.serverVideoPath,
        state.serverTTSAudioPath,
        1.5, // guidance_scale
        20,  // inference_steps
        1247 // seed
      );

      clearInterval(interval);
      const videoUrl = api.getFileUrl(res.video_path);

      setLogs(prev => [
        ...prev.map(l => ({ ...l, status: 'completed' as const })),
        { id: 'done', message: '合成完成！', status: 'completed' as const }
      ]);

      setState(s => ({ ...s, isProcessing: false, finalVideoUrl: videoUrl }));
      setToast({ msg: '视频合成完毕！', type: 'success' });
    } catch (error) {
      clearInterval(interval);
      console.error(error);
      setToast({ msg: '视频合成失败', type: 'error' });
      setState(s => ({ ...s, isProcessing: false }));
    }
  };

  if (loading) return <LoadingScreen onComplete={() => setLoading(false)} />;

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <ApiKeyModal isOpen={showKeyModal} onSave={handleSaveKeys} initialSttKey={state.apiKeyStt} initialMinimaxKey={state.apiKeyMinimax} />

      {/* Sidebar - MiniMax Style */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-500 rounded-lg flex items-center justify-center text-white mr-3 shadow-lg shadow-primary-200">
            <Video className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900">GlobalSync</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-2">工作台</div>
          <NavItem icon={Layout} label="视频翻译" active />
          <NavItem icon={Music} label="AI 配音" />
          <NavItem icon={Languages} label="字幕工具" />

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-6">资源</div>
          <NavItem icon={FolderOpen} label="我的项目" />
          <NavItem icon={Sparkles} label="音色库" badge="New" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setShowKeyModal(true)}
            className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>API 设置</span>
          </button>
          <div className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-600 cursor-not-allowed opacity-60">
            <User className="w-4 h-4" />
            <span>个人中心</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900">创建新项目</h1>
            <p className="text-xs text-gray-500">智能同步口型，打破语言障碍</p>
          </div>
          <div className="flex items-center space-x-3 md:space-x-4">

            {/* API Key Button - Top Right */}
            <button
              onClick={() => setShowKeyModal(true)}
              className="flex items-center space-x-2 text-sm text-gray-500 hover:text-primary-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100"
            >
              <Key className="w-4 h-4" />
              <span className="hidden md:inline">API Key</span>
            </button>

            <div className="h-5 w-px bg-gray-200 hidden md:block"></div>

            <button className="flex items-center space-x-2 text-sm text-gray-500 hover:text-primary-600 transition-colors">
              <LifeBuoy className="w-4 h-4" />
              <span className="hidden md:inline">帮助文档</span>
            </button>
            <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md shadow-primary-200 transition-all hover:scale-105">
              导出项目
            </button>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-gray-50/50">
          <div className="max-w-[1800px] mx-auto space-y-6 pb-20">

            {/* 1. Video & Script Area (Grid Layout) */}
            {/* Added fixed height lg:h-[600px] to ensure stability and alignment */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[600px]">

              {/* Left: Video Source (Span 5) */}
              {/* Added min-w-0 min-h-0 to prevent flex item blowout */}
              <div className="lg:col-span-5 flex flex-col h-full min-w-0 min-h-0">
                <SectionCard title="1. 视频源" icon={Video} className="h-full">
                  <Step1Upload
                    onFileSelect={handleFileUpload}
                    videoPreview={state.videoPreviewUrl}
                    isProcessing={state.isProcessing && !state.sourceText}
                    processingStage={state.processingStage}
                    onAnalyze={handleAnalyzeVideo}
                  />
                </SectionCard>
              </div>

              {/* Right: Script Studio (Span 7) */}
              {/* Added min-w-0 min-h-0 to prevent flex item blowout */}
              <div className="lg:col-span-7 flex flex-col h-full min-w-0 min-h-0">
                <SectionCard title="2. 智能脚本" icon={Languages} className="h-full">
                  <Step2Script
                    sourceText={state.sourceText}
                    translatedText={state.translatedText}
                    targetLanguage={state.targetLanguage}
                    setTargetLanguage={(l) => setState(s => ({ ...s, targetLanguage: l }))}
                    setTranslatedText={(t) => setState(s => ({ ...s, translatedText: t }))}
                    setSourceText={(t) => setState(s => ({ ...s, sourceText: t }))}
                    onTranslate={handleTranslate}
                    isProcessing={state.isProcessing}
                  />
                </SectionCard>
              </div>
            </div>

            {/* 2. Voice Director */}
            <SectionCard title="3. 配音导演" icon={Music}>
              <Step3Voice
                selectedVoiceId={state.selectedVoiceId}
                onSelectVoice={(id) => setState(s => ({ ...s, selectedVoiceId: id }))}
                speed={state.voiceSpeed}
                onSpeedChange={(v) => setState(s => ({ ...s, voiceSpeed: v }))}
                onGenerateAudio={handleGenerateAudio}
                generatedAudioUrl={state.generatedAudioUrl}
                isProcessing={!!state.isGeneratingAudio}
                isCloneMode={state.isCloneMode}
                setIsCloneMode={(v) => setState(s => ({ ...s, isCloneMode: v }))}
                cloneAudioFile={state.cloneAudioFile}
                setCloneAudioFile={(f) => setState(s => ({ ...s, cloneAudioFile: f }))}
                emotionType={state.emotionType}
                setEmotionType={(v) => setState(s => ({ ...s, emotionType: v }))}
                emotionAlpha={state.emotionAlpha}
                setEmotionAlpha={(v) => setState(s => ({ ...s, emotionAlpha: v }))}
                videoFile={state.videoFile}
              />
            </SectionCard>

            {/* 3. Final Render */}
            <SectionCard title="4. 合成输出" icon={Sparkles} accent>
              <Step4Render
                isProcessing={state.isProcessing}
                logs={logs}
                onStartRender={handleStartRender}
                originalVideoUrl={state.videoPreviewUrl}
                finalVideoUrl={state.finalVideoUrl}
              />
            </SectionCard>

          </div>
        </div>
      </main>
    </div>
  );
};

// Helper Components
const NavItem = ({ icon: Icon, label, active, badge }: any) => (
  <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all mb-1 ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
    }`}>
    <div className="flex items-center space-x-3">
      <Icon className={`w-4 h-4 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
      <span className="text-sm font-medium">{label}</span>
    </div>
    {badge && <span className="bg-gradient-to-r from-primary-500 to-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">{badge}</span>}
  </div>
);

const SectionCard = ({ title, icon: Icon, children, className, accent }: any) => (
  <div className={`bg-white rounded-2xl border ${accent ? 'border-primary-100 shadow-glow' : 'border-gray-200 shadow-soft'} overflow-hidden flex flex-col ${className}`}>
    <div className="px-6 py-4 border-b border-gray-50 flex items-center space-x-2 bg-white flex-shrink-0">
      <div className={`p-1.5 rounded-md ${accent ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="font-semibold text-gray-800">{title}</h3>
    </div>
    <div className="p-6 flex-1 flex flex-col min-h-0 overflow-hidden relative">
      {children}
    </div>
  </div>
);

export default App;