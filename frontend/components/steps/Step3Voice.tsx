import React, { useState, useRef, useEffect } from 'react';
import { VOICES } from '../../constants';
import { Play, Pause, Wand2, Volume2, VolumeX, Download, Settings2, RefreshCw, Upload, Mic, Video } from 'lucide-react';

interface Step3Props {
  selectedVoiceId: string;
  onSelectVoice: (id: string) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onGenerateAudio: () => void;
  generatedAudioUrl: string | null;
  isProcessing: boolean;
  isCloneMode?: boolean;
  setIsCloneMode?: (v: boolean) => void;
  cloneAudioFile?: File | null;
  setCloneAudioFile?: (f: File | null) => void;
  emotionType?: string;
  setEmotionType?: (v: string) => void;
  emotionAlpha?: number;
  setEmotionAlpha?: (v: number) => void;
  videoFile?: File | null;
}

// 声纹加载动画组件
const WaveformLoader = () => (
  <div className="flex items-center justify-center space-x-1 h-12 w-full bg-gray-50 rounded-xl border border-gray-100">
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        className="w-1 bg-primary-500 rounded-full animate-wave"
        style={{
          height: '40%',
          animationDelay: `${i * 0.1}s`,
          animationDuration: '1.2s'
        }}
      ></div>
    ))}
    <style>{`
      @keyframes wave {
        0%, 100% { height: 20%; opacity: 0.4; }
        50% { height: 60%; opacity: 1; }
      }
      .animate-wave {
        animation: wave 1s ease-in-out infinite;
      }
    `}</style>
    <span className="ml-3 text-sm font-medium text-gray-500 animate-pulse">AI 正在合成语音...</span>
  </div>
);

// 全功能音频播放器组件
const FullFeatureAudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingVolume(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setPlaybackRate(1);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  }, [src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setProgress((current / total) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
    setProgress(percentage * 100);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const cyclePlaybackRate = () => {
    const rates = [0.5, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `generated_audio_${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-300">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />

      {/* Top Row: Controls & Progress */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 flex-shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* Progress Bar Container */}
        <div className="flex-1 flex flex-col justify-center gap-1.5">
          <div className="flex justify-between text-xs font-medium text-gray-500 font-mono">
            <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div
            className="h-2 bg-gray-100 rounded-full cursor-pointer relative overflow-hidden group"
            onClick={handleSeek}
          >
            {/* Background Track */}
            <div className="absolute inset-0 w-full h-full bg-gray-100"></div>

            {/* Progress Fill */}
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            ></div>

            {/* Hover Indicator */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </div>

        {/* Right Controls Group */}
        <div className="flex items-center gap-1 border-l border-gray-100 pl-2">
          {/* Playback Speed */}
          <button
            onClick={cyclePlaybackRate}
            className="px-2 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-md transition-colors w-12 text-center"
            title="切换倍速"
          >
            {playbackRate}x
          </button>

          {/* Volume Control */}
          <div
            className="relative flex items-center justify-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => {
              if (!isDraggingVolume) setShowVolumeSlider(false);
            }}
          >
            <button
              onClick={toggleMute}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Popup Volume Slider */}
            {showVolumeSlider && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-white rounded-xl shadow-xl border border-gray-100 z-20 animate-in fade-in slide-in-from-bottom-2">
                <div className="h-24 w-8 flex items-center justify-center">
                  {/* Custom Vertical Slider Track */}
                  <div
                    className="relative w-1.5 h-full bg-gray-100 rounded-full cursor-pointer group"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsDraggingVolume(true);
                      const slider = e.currentTarget;
                      const rect = slider.getBoundingClientRect();

                      const updateVolume = (clientY: number) => {
                        const height = rect.height;
                        const y = clientY - rect.top;
                        let val = (height - y) / height;
                        if (val < 0) val = 0;
                        if (val > 1) val = 1;
                        setVolume(val);
                        setIsMuted(false);
                      };

                      updateVolume(e.clientY);

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        updateVolume(moveEvent.clientY);
                      };

                      const handleMouseUp = () => {
                        setIsDraggingVolume(false);
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };

                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  >
                    {/* Fill */}
                    <div
                      className="absolute bottom-0 left-0 w-full bg-primary-500 rounded-full transition-all duration-75"
                      style={{ height: `${(isMuted ? 0 : volume) * 100}%` }}
                    ></div>

                    {/* Knob */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-primary-500 rounded-full shadow-sm transition-all duration-75 hover:scale-110"
                      style={{ bottom: `calc(${(isMuted ? 0 : volume) * 100}% - 7px)` }}
                    ></div>
                  </div>
                </div>

                {/* Invisible Bridge to prevent mouseleave when moving from button to slider */}
                <div className="absolute top-full left-0 w-full h-4 bg-transparent"></div>
              </div>
            )}
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
            title="下载音频"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Step3Voice: React.FC<Step3Props> = ({
  selectedVoiceId,
  onSelectVoice,
  speed,
  onSpeedChange,
  onGenerateAudio,
  generatedAudioUrl,
  isProcessing,
  isCloneMode,
  setIsCloneMode,
  cloneAudioFile,
  setCloneAudioFile,
  emotionType,
  setEmotionType,
  emotionAlpha,
  setEmotionAlpha,
  videoFile
}) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Mode Toggle Tabs (clone tab hidden) */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setIsCloneMode && setIsCloneMode(false)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${!isCloneMode ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          预设音色
        </button>
      </div>

      {!isCloneMode ? (
        <>
          {/* Voice List */}
          <div className="grid grid-cols-5 gap-4">
            {VOICES.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              return (
                <div
                  key={voice.id}
                  onClick={() => onSelectVoice(voice.id)}
                  className={`relative p-3 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col items-center space-y-2 group hover:-translate-y-1 ${isSelected ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-md'
                    }`}
                >
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100 border border-gray-100">
                    <img
                      src={`https://picsum.photos/seed/${voice.avatarSeed}/100/100`}
                      alt={voice.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary-600/20 flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary-600 rounded-full animate-ping"></div>
                      </div>
                    )}
                  </div>
                  <div className="text-center w-full">
                    <div className="text-sm font-bold text-gray-800 truncate">{voice.name}</div>
                    <div className="flex justify-center gap-1 mt-1">
                      <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">{voice.style}</span>
                    </div>
                  </div>

                  <button className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm text-gray-400 hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Clone Voice UI - Redesigned */
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* 1. Reference Audio Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <div className="w-1 h-4 bg-primary-600 rounded-full"></div>
                参考音频
              </label>
              <span className="text-xs text-gray-400">支持 WAV/MP3 (3-10秒)</span>
            </div>

            {/* Note about language restriction */}
            <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              注意：克隆音色目前仅支持生成中文和英文语音。
            </div>

            {!cloneAudioFile && !videoFile ? (
              <label className="group flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all duration-300">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="w-10 h-10 mb-3 rounded-full bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                  </div>
                  <p className="mb-1 text-sm text-gray-500 font-medium group-hover:text-primary-600 transition-colors">点击上传音频文件</p>
                  <p className="text-xs text-gray-400">或将文件拖拽至此处</p>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0] && setCloneAudioFile) {
                      setCloneAudioFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-4 bg-primary-50/50 border border-primary-100 rounded-xl group hover:border-primary-200 transition-all">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-600">
                    {cloneAudioFile ? <Volume2 className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {cloneAudioFile ? cloneAudioFile.name : `使用视频源音频: ${videoFile?.name}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {cloneAudioFile ? (cloneAudioFile.size / 1024 / 1024).toFixed(2) + ' MB' : '自动提取'}
                    </span>
                  </div>
                </div>
                <label className="cursor-pointer text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors">
                  {cloneAudioFile ? '更换' : '上传自定义音频'}
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0] && setCloneAudioFile) {
                        setCloneAudioFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* 2. Emotion Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <div className="w-1 h-4 bg-primary-500 rounded-full"></div>
                情感风格
              </label>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { id: '', label: '正常', icon: '😐' },
                { id: 'happy', label: '开心', icon: '😊' },
                { id: 'sad', label: '悲伤', icon: '😢' },
                { id: 'angry', label: '愤怒', icon: '😠' },
                { id: 'surprised', label: '惊讶', icon: '😲' },
                { id: 'calm', label: '平静', icon: '😌' },
                { id: 'fear', label: '恐惧', icon: '😨' },
                { id: 'disgusted', label: '厌恶', icon: '🤢' },
                { id: 'melancholic', label: '忧郁', icon: '😔' }
              ].map((item) => {
                const isActive = emotionType === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setEmotionType && setEmotionType(item.id)}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${isActive
                      ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm ring-1 ring-primary-500'
                      : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <span className="text-xl mb-1">{item.icon}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                    {isActive && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Intensity Slider */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <div className="w-1 h-4 bg-primary-500 rounded-full"></div>
                情感强度
              </label>
              <span className="text-xs font-mono font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                {emotionAlpha?.toFixed(1)}
              </span>
            </div>
            <div className="relative h-6 flex items-center">
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={emotionAlpha || 1.0}
                onChange={(e) => setEmotionAlpha && setEmotionAlpha(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary-600 z-10 relative"
              />
              <div
                className="absolute left-0 h-2 bg-gradient-to-r from-primary-400 to-primary-500 rounded-l-lg pointer-events-none"
                style={{ width: `${((emotionAlpha || 0) / 2) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 px-1">
              <span>淡</span>
              <span>标准</span>
              <span>强</span>
            </div>
          </div>

        </div>
      )}

      {/* Action Area */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-4">

        {/* Top Row: Settings & Generate Button */}
        <div className="flex items-center justify-between">
          {/* Speed Setting */}
          <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2 text-gray-500">
              <Settings2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">生成语速</span>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <span className="text-xs font-mono text-gray-900 font-bold w-8">{speed.toFixed(1)}x</span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={onGenerateAudio}
            disabled={isProcessing}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm ${isProcessing
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-700 hover:border-primary-500 hover:text-primary-600 hover:shadow-md'
              }`}
          >
            {isProcessing ? (
              <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
            ) : generatedAudioUrl ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            <span>{generatedAudioUrl ? '重新生成' : '生成试听'}</span>
          </button>
        </div>

        {/* Bottom Row: Player or Loader */}
        <div className="w-full">
          {isProcessing ? (
            <WaveformLoader />
          ) : generatedAudioUrl ? (
            <FullFeatureAudioPlayer src={generatedAudioUrl} />
          ) : (
            <div className="h-12 flex items-center justify-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-400 text-sm">
              <Wand2 className="w-4 h-4 mr-2 opacity-50" />
              <span>选择音色并点击生成，即可预览 AI 配音效果</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step3Voice;
