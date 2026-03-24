import React, { useRef, useState } from 'react';
import { UploadCloud, FileVideo, Loader2, X } from 'lucide-react';

interface Step1Props {
  onFileSelect: (file: File) => void;
  videoPreview: string | null;
  isProcessing: boolean;
  processingStage: string;
  onAnalyze: () => void;
}

const Step1Upload: React.FC<Step1Props> = ({ onFileSelect, videoPreview, isProcessing, processingStage, onAnalyze }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) onFileSelect(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) onFileSelect(e.target.files[0]);
  };

  if (videoPreview) {
    return (
      // 使用 absolute 布局策略的核心容器
      // 父级必须有确定的高度（由 App.tsx 的 Grid 和 SectionCard 控制）
      <div className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-inner group">

        {/* 视频元素使用 absolute inset-0 强制填满容器，object-contain 保证画面完整显示且不变形 */}
        <video
          src={videoPreview}
          className="absolute inset-0 w-full h-full object-contain z-0"
          controls
        />

        {/* 加载遮罩层 */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-400" />
            <p className="text-sm font-medium tracking-wide animate-pulse">{processingStage}</p>
          </div>
        )}

        {/* 更换视频按钮 - 悬浮在右上角 */}
        <button
          onClick={() => inputRef.current?.click()}
          className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 hover:scale-110 border border-white/10 shadow-lg"
          title="更换视频"
        >
          <UploadCloud className="w-4 h-4" />
        </button>

        {/* 识别语音按钮 - 悬浮在底部 */}
        {!isProcessing && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onAnalyze}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-full shadow-lg font-medium flex items-center space-x-2 transform hover:scale-105 transition-all"
            >
              <FileVideo className="w-4 h-4" />
              <span>1. 识别语音</span>
            </button>
          </div>
        )}

        {/* 隐藏的文件输入框，用于更换视频 */}
        <input ref={inputRef} type="file" className="hidden" accept="video/mp4,video/quicktime" onChange={handleChange} />
      </div>
    );
  }

  // 上传前的状态
  return (
    <div
      className={`relative w-full h-full min-h-[300px] lg:min-h-0 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${dragActive ? 'border-primary-500 bg-primary-50 scale-[0.99]' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'
        }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" className="hidden" accept="video/mp4,video/quicktime" onChange={handleChange} />

      <div className={`p-5 rounded-full shadow-sm mb-4 transition-colors ${dragActive ? 'bg-primary-100' : 'bg-white'}`}>
        <UploadCloud className={`w-10 h-10 ${dragActive ? 'text-primary-600' : 'text-gray-400'}`} />
      </div>

      <p className="text-lg font-medium text-gray-700">点击或拖拽上传视频</p>
      <p className="text-sm text-gray-400 mt-2">支持 MP4, MOV (最大 500MB)</p>
    </div>
  );
};

export default Step1Upload;