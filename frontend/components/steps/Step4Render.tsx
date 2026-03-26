import React, { useState } from 'react';
import { ProcessingLog } from '../../types';
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Clock, Play, ArrowUpRight, Loader2 } from 'lucide-react';

interface Step4Props {
  isProcessing: boolean;
  logs: ProcessingLog[];
  onStartRender: () => void;
  originalVideoUrl: string | null;
  finalVideoUrl: string | null;
  elapsedSeconds: number;
  lastDurationSeconds: number | null;
}

const Step4Render: React.FC<Step4Props> = ({
  isProcessing,
  logs,
  onStartRender,
  originalVideoUrl,
  finalVideoUrl,
  elapsedSeconds,
  lastDurationSeconds
}) => {
  const [showLogs, setShowLogs] = useState(true);
  const canStartRender = !!originalVideoUrl;

  // 1. Success State (Finished)
  if (finalVideoUrl) {
    return (
      <div className="grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
         <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  最终成片
                </span>
                <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 font-medium">
                  合成成功
                </span>
             </div>
             {lastDurationSeconds !== null && (
               <div className="text-xs text-gray-500">本次耗时：{lastDurationSeconds.toFixed(1)}s</div>
             )}
             <div className="aspect-video bg-black rounded-xl shadow-lg overflow-hidden ring-1 ring-black/5 relative group">
               <video src={finalVideoUrl} controls className="w-full h-full" />
             </div>
         </div>
         
         <div className="flex flex-col justify-center space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">合成完成！</h3>
              <p className="text-gray-500 leading-relaxed">
                您的视频已完成唇形同步与配音替换。AI 模型已自动调整画面中的面部特征以匹配新的语音。
              </p>
            </div>

            <div className="w-full">
              <button
                type="button"
                onClick={onStartRender}
                disabled={!originalVideoUrl}
                className="group flex items-center justify-center gap-2 bg-primary-600 border border-primary-600 text-white px-8 py-3 rounded-full font-semibold transition-all shadow-sm hover:shadow-md hover:bg-primary-700 hover:border-primary-700 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-primary-600 disabled:hover:border-primary-600"
              >
                <span>重新生成</span>
                <ArrowUpRight className="w-4 h-4 text-white/90 group-hover:text-white transition-colors" />
              </button>
            </div>
         </div>
      </div>
    );
  }

  // 2. Processing State
  if (isProcessing) {
    return (
      <div className="w-full bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col h-[400px] shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center space-x-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
              </div>
              <span className="font-bold text-gray-800">正在合成视频...</span>
            </div>
            <div className="flex items-center text-xs text-gray-400 font-mono gap-2">
              <Clock className="w-3 h-3" />
              <span>已用时: {elapsedSeconds.toFixed(1)}s</span>
            </div>
        </div>
        
        {/* Logs */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white font-mono text-sm space-y-4 scroll-smooth">
            {logs.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>初始化渲染引擎...</span>
              </div>
            )}
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 animate-in slide-in-from-left-2 duration-300">
                  <div className={`mt-0.5 flex-shrink-0 ${log.status === 'active' ? 'text-primary-600' : log.status === 'completed' ? 'text-green-500' : 'text-gray-200'}`}>
                      {log.status === 'active' ? <Loader2 className="w-4 h-4 animate-spin" /> : log.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </div>
                  <span className={`${log.status === 'active' ? 'text-gray-900 font-semibold' : log.status === 'completed' ? 'text-gray-500' : 'text-gray-300'} transition-colors`}>
                    {log.message}
                  </span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  // 3. Ready State (Design match)
  return (
    <div className="w-full bg-gray-50/50 rounded-2xl p-10 flex flex-row items-center gap-16 relative overflow-hidden border border-gray-100 transition-all hover:bg-white hover:shadow-soft group">
      
      {/* Visuals (Left) - Mimicking the Pill Design */}
      <div className="relative w-64 h-32 flex-shrink-0 select-none transform transition-transform duration-500 group-hover:scale-105">
          {/* Background Decorations */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary-100/30 to-cyan-100/30 rounded-full blur-2xl transform rotate-12 scale-125 opacity-0 group-hover:opacity-100 transition-opacity"></div>

          {/* Pill 1: Original (Purple) */}
          <div className="absolute top-0 left-0 bg-[#60A5FA] text-white pl-5 pr-2 py-3 rounded-full flex items-center gap-3 shadow-lg transform -rotate-6 transition-transform group-hover:-rotate-12 group-hover:-translate-y-2 z-10 w-40 border border-white/20">
              <span className="font-bold text-sm tracking-wide text-shadow-sm">原始视频</span>
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center ml-auto shadow-inner">
                <Play className="w-3.5 h-3.5 text-black fill-current ml-0.5" />
              </div>
          </div>

          {/* Pill 2: Result (Dark) */}
          <div className="absolute bottom-0 right-0 bg-[#4B5563] text-white pl-5 pr-2 py-3 rounded-full flex items-center gap-3 shadow-xl transform rotate-3 transition-transform group-hover:rotate-6 group-hover:translate-y-2 z-20 w-40 border-2 border-white">
              <span className="font-bold text-sm tracking-wide text-shadow-sm">合成成片</span>
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center ml-auto shadow-inner">
                <Play className="w-3.5 h-3.5 text-black fill-current ml-0.5" />
              </div>
          </div>
      </div>

      {/* Content (Middle) */}
      <div className="flex-1 text-left space-y-3 z-10">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
            视频合成
          </h3>
          <p className="text-gray-500 text-base leading-relaxed">
            一键融合画面与生成的语音，AI 自动调整口型，消除语言违和感，快速生成母语级视频。
          </p>
      </div>

      {/* Button (Right) */}
      <div className="flex-shrink-0 z-10">
        <div className="relative">
          <span
            className={`pointer-events-none absolute -inset-1 rounded-full bg-primary-500/40 blur-md transition-opacity ${
              canStartRender ? '[animation:pulse_1.8s_ease-in-out_infinite] opacity-100' : 'opacity-0'
            }`}
          />
          <button
            onClick={onStartRender}
            disabled={!canStartRender}
            className="relative group flex items-center gap-2 bg-primary-600 border border-primary-600 text-white px-8 py-3 rounded-full font-semibold transition-all shadow-md shadow-primary-300/50 hover:shadow-lg hover:shadow-primary-300/60 hover:bg-primary-700 hover:border-primary-700 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 disabled:hover:bg-primary-600 disabled:hover:border-primary-600"
          >
            <span>开始合成</span>
            <ArrowUpRight className="w-4 h-4 text-white/90 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default Step4Render;
