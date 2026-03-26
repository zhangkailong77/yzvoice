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
import axios from 'axios';

// Components
import Step1Upload from './components/steps/Step1Upload';
import Step2Script from './components/steps/Step2Script';
import Step3Voice from './components/steps/Step3Voice';
import Step4Render from './components/steps/Step4Render';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const PROJECTS_STORAGE_KEY = 'G_SYNC_PROJECTS';

type ProjectItem = {
  id: string;
  title: string;
  videoUrl: string;
  createdAt: number;
  durationSeconds: number | null;
};
type NavView = 'workspace' | 'projects';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [scale, setScale] = useState(1);

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
  const [renderStartAt, setRenderStartAt] = useState<number | null>(null);
  const [renderElapsedSeconds, setRenderElapsedSeconds] = useState(0);
  const [lastRenderDurationSeconds, setLastRenderDurationSeconds] = useState<number | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<NavView>('workspace');
  const [baseVideoPathForRender, setBaseVideoPathForRender] = useState<string | null>(null);

  // Init Keys - removed auto-popup logic
  useEffect(() => {
    const stt = localStorage.getItem('G_SYNC_STT_KEY');
    const mini = localStorage.getItem('G_SYNC_MINI_KEY');
    if (stt) setState(s => ({ ...s, apiKeyStt: stt }));
    if (mini) setState(s => ({ ...s, apiKeyMinimax: mini }));

    const rawProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (rawProjects) {
      try {
        const parsed = JSON.parse(rawProjects);
        if (Array.isArray(parsed)) {
          setProjects(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved projects', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!state.isProcessing || !renderStartAt) return;
    const timer = window.setInterval(() => {
      setRenderElapsedSeconds(Math.max(0, (Date.now() - renderStartAt) / 1000));
    }, 200);
    return () => window.clearInterval(timer);
  }, [state.isProcessing, renderStartAt]);

  useEffect(() => {
    const updateScale = () => {
      const nextScale = Math.max(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
      setScale(nextScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSaveKeys = (stt: string, mini: string) => {
    localStorage.setItem('G_SYNC_STT_KEY', stt);
    localStorage.setItem('G_SYNC_MINI_KEY', mini);
    setState(s => ({ ...s, apiKeyStt: stt, apiKeyMinimax: mini }));
    setShowKeyModal(false);
    setToast({ msg: 'API 密钥已更新', type: 'success' });
  };

  // --- Logic Handlers (Same logic, triggered from different UI points) ---

  const handleFileUpload = async (file: File) => {
    const localPreviewUrl = URL.createObjectURL(file);
    setState(s => ({
      ...s,
      videoFile: file,
      videoPreviewUrl: localPreviewUrl,
      isProcessing: true,
      processingStage: '正在上传视频...',
      serverVideoPath: undefined,
      sourceText: '',
      translatedText: '',
      generatedAudioUrl: null,
      serverTTSAudioPath: undefined,
      finalVideoUrl: null,
    }));

    try {
      // 1. Upload Video
      const uploadRes = await api.uploadVideo(file);
      const serverPreviewUrl = api.getFileUrl(uploadRes.file_path);

      if (serverPreviewUrl && localPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrl);
      }

      setBaseVideoPathForRender(uploadRes.file_path);
      setState(s => ({
        ...s,
        serverVideoPath: uploadRes.file_path,
        videoPreviewUrl: serverPreviewUrl || s.videoPreviewUrl,
        processingStage: '',
        isProcessing: false
      }));
      setToast({ msg: '视频上传成功', type: 'success' });
    } catch (error) {
      console.error(error);
      let errMsg = '视频上传失败';
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        if (typeof detail === 'string' && detail.trim()) {
          errMsg = `视频上传失败：${detail}`;
        }
      }
      setToast({ msg: errMsg, type: 'error' });
      setState(s => ({ ...s, isProcessing: false, processingStage: '' }));
    }
  };

  const handleClearVideo = () => {
    setBaseVideoPathForRender(null);
    setState(s => {
      if (s.videoPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(s.videoPreviewUrl);
      }
      return {
        ...s,
        videoFile: null,
        videoPreviewUrl: null,
        serverVideoPath: undefined,
        sourceText: '',
        translatedText: '',
        generatedAudioUrl: null,
        serverTTSAudioPath: undefined,
        finalVideoUrl: null,
        processingStage: '',
        isProcessing: false,
      };
    });
    setToast({ msg: '已清除当前视频，请重新上传或拍摄', type: 'info' });
  };

  const handleAnalyzeVideo = async () => {
    if (!state.serverVideoPath) {
      setToast({ msg: '请先等待视频上传完成', type: 'info' });
      return;
    }
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
    setState(s => ({ ...s, isProcessing: true, finalVideoUrl: null }));
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
    setState(s => ({ ...s, isGeneratingAudio: true, generatedAudioUrl: null, serverTTSAudioPath: undefined }));
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
      const detail = axios.isAxiosError(error)
        ? error.response?.data?.detail || error.message
        : (error instanceof Error ? error.message : '未知错误');
      setToast({ msg: `语音合成失败：${detail}`, type: 'error' });
      setState(s => ({ ...s, isGeneratingAudio: false, generatedAudioUrl: null, serverTTSAudioPath: undefined }));
    }
  };

  const handleStartRender = async () => {
    const videoPath = baseVideoPathForRender || state.serverVideoPath;
    if (!videoPath || !state.serverTTSAudioPath) {
      setToast({ msg: '缺少必要资源，请先完成前序步骤', type: 'error' });
      return;
    }

    setState(s => ({ ...s, isProcessing: true }));
    setLogs([]);
    setLastRenderDurationSeconds(null);
    const startAt = Date.now();
    setRenderStartAt(startAt);
    setRenderElapsedSeconds(0);

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
        videoPath,
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

      const durationSeconds = Math.max(0, (Date.now() - startAt) / 1000);
      setLastRenderDurationSeconds(durationSeconds);
      setRenderStartAt(null);
      setRenderElapsedSeconds(durationSeconds);
      setState(s => ({ ...s, isProcessing: false, finalVideoUrl: videoUrl }));
      const newProject: ProjectItem = {
        id: `${Date.now()}`,
        title: `成片 ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
        videoUrl: videoUrl || '',
        createdAt: Date.now(),
        durationSeconds,
      };
      setProjects(prev => {
        const next = [newProject, ...prev].slice(0, 10);
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setActiveProjectId(newProject.id);
      setToast({ msg: `视频合成完毕！耗时 ${durationSeconds.toFixed(1)}s`, type: 'success' });
    } catch (error) {
      clearInterval(interval);
      console.error(error);
      const detail =
        axios.isAxiosError(error)
          ? (error.response?.data?.detail || error.message)
          : '视频合成失败';
      setToast({ msg: `视频合成失败：${detail}`, type: 'error' });
      setRenderStartAt(null);
      setState(s => ({ ...s, isProcessing: false }));
    }
  };

  if (loading) return <LoadingScreen onComplete={() => setLoading(false)} />;

  const isStep1Processing =
    state.processingStage === '正在上传视频...' ||
    state.processingStage === '正在分析语音内容...';
  const canAnalyzeVideo = !!state.serverVideoPath && !isStep1Processing;

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-50">
      <div
        style={{
          width: '100vw',
          height: '100vh',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: DESIGN_WIDTH,
            height: DESIGN_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          className="flex h-full bg-gray-50 font-sans text-gray-900 overflow-hidden"
        >
          {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
          <ApiKeyModal isOpen={showKeyModal} onSave={handleSaveKeys} initialSttKey={state.apiKeyStt} initialMinimaxKey={state.apiKeyMinimax} />

          {/* Sidebar - MiniMax Style */}
          <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-20">
            <div className="h-16 flex items-center px-6 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-primary-200 overflow-hidden bg-white">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-lg tracking-tight text-gray-900">GlobalSync</span>
            </div>
    
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-2">工作台</div>
              <NavItem
                icon={Layout}
                label="视频翻译"
                active={activeView === 'workspace'}
                onClick={() => setActiveView('workspace')}
              />
    
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-6">资源</div>
              <NavItem
                icon={FolderOpen}
                label="我的项目"
                active={activeView === 'projects'}
                onClick={() => setActiveView('projects')}
              />
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
                <h1 className="text-xl font-bold text-gray-900">
                  {activeView === 'projects' ? '我的项目' : '创建新项目'}
                </h1>
                <p className="text-xs text-gray-500">
                  {activeView === 'projects' ? '查看历史合成成片' : '智能同步口型，打破语言障碍'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
    
                {/* API Key Button - Top Right */}
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="flex items-center space-x-2 text-sm text-gray-500 hover:text-primary-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100"
                >
                  <Key className="w-4 h-4" />
                  <span className="inline">API Key</span>
                </button>
    
                <div className="h-5 w-px bg-gray-200 block"></div>
    
                <button className="flex items-center space-x-2 text-sm text-gray-500 hover:text-primary-600 transition-colors">
                  <LifeBuoy className="w-4 h-4" />
                  <span className="inline">帮助文档</span>
                </button>
                <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md shadow-primary-200 transition-all hover:scale-105">
                  导出项目
                </button>
              </div>
            </header>
    
            {/* Scrollable Workspace */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gray-50/50">
              <div className="max-w-[1800px] mx-auto space-y-6 pb-20">
                {activeView === 'projects' ? (
                  <ProjectsWall projects={projects} />
                ) : (
                  <>
    
                {/* 1. Video & Script Area (Grid Layout) */}
                {/* Added fixed height h-[600px] to ensure stability and alignment */}
                <div className="grid grid-cols-12 gap-6 h-[600px]">
    
                  {/* Left: Video Source (Span 5) */}
                  {/* Added min-w-0 min-h-0 to prevent flex item blowout */}
                  <div className="col-span-5 flex flex-col h-full min-w-0 min-h-0">
                    <SectionCard title="1. 视频源" icon={Video} className="h-full">
                      <Step1Upload
                        onFileSelect={handleFileUpload}
                        onClearVideo={handleClearVideo}
                        videoPreview={state.videoPreviewUrl}
                        isProcessing={isStep1Processing}
                        canAnalyze={canAnalyzeVideo}
                        processingStage={state.processingStage}
                        onAnalyze={handleAnalyzeVideo}
                      />
                    </SectionCard>
                  </div>
    
                  {/* Right: Script Studio (Span 7) */}
                  {/* Added min-w-0 min-h-0 to prevent flex item blowout */}
                  <div className="col-span-7 flex flex-col h-full min-w-0 min-h-0">
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
                    elapsedSeconds={renderElapsedSeconds}
                    lastDurationSeconds={lastRenderDurationSeconds}
                  />
                </SectionCard>
                </>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const NavItem = ({ icon: Icon, label, active, badge, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all mb-1 ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
    }`}>
    <div className="flex items-center space-x-3">
      <Icon className={`w-4 h-4 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
      <span className="text-sm font-medium">{label}</span>
    </div>
    {badge && <span className="bg-gradient-to-r from-primary-500 to-primary-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">{badge}</span>}
  </button>
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

const ProjectsWall = ({ projects }: { projects: ProjectItem[] }) => {
  const [previewProject, setPreviewProject] = useState<ProjectItem | null>(null);
  const formatTime = (ts: number) =>
    new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  if (projects.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-500">
        暂无项目，先去工作台合成一个视频吧。
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="text-sm text-gray-500">已合成视频（最近 {projects.length} 条）</div>

        <div className="flex flex-wrap gap-6">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setPreviewProject(project)}
              className="group text-left w-[250px] flex-shrink-0"
            >
              <div className="text-[15px] font-medium text-gray-700 mb-2">{formatTime(project.createdAt)}</div>
              <div className="w-[250px] h-[250px] bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 group-hover:border-primary-400 group-hover:shadow-soft">
                <div className="w-full h-full bg-[#0a1320] overflow-hidden">
                  <video src={project.videoUrl} className="w-full h-full object-contain" muted preload="metadata" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {previewProject && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="w-full max-w-5xl bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">视频预览</div>
                <div className="text-sm text-gray-500 mt-0.5">{formatTime(previewProject.createdAt)}</div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProject(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors"
              >
                关闭
              </button>
            </div>
            <div className="p-6">
              <video
                src={previewProject.videoUrl}
                controls
                autoPlay
                className="w-full max-h-[72vh] bg-black rounded-xl"
              />
              {previewProject.durationSeconds !== null && (
                <div className="mt-3 text-sm text-gray-500">合成耗时：{previewProject.durationSeconds.toFixed(1)}s</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
