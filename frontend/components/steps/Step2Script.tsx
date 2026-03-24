import React from 'react';
import { LANGUAGES } from '../../constants';
import { Sparkles, ArrowRightLeft, Loader2 } from 'lucide-react';

interface Step2Props {
  sourceText: string;
  translatedText: string;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  setTranslatedText: (text: string) => void;
  setSourceText: (text: string) => void;
  onTranslate: () => void;
  isProcessing: boolean;
}

const Step2Script: React.FC<Step2Props> = ({
  sourceText,
  translatedText,
  targetLanguage,
  setTargetLanguage,
  setTranslatedText,
  setSourceText,
  onTranslate,
  isProcessing
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end mb-4 flex-shrink-0">
        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-colors hover:border-primary-300">
          <span className="text-xs text-gray-500">目标语言:</span>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="bg-transparent text-sm font-semibold text-gray-900 outline-none cursor-pointer py-0.5"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-3 h-full min-h-0 items-stretch">
        {/* Source Text */}
        <div className="flex-1 flex flex-col h-full min-h-[200px]">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">原文 (中文)</label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none text-gray-800 text-sm leading-relaxed custom-scrollbar transition-all hover:bg-white"
            placeholder="等待视频识别结果，或手动输入..."
          />
        </div>

        {/* Center Action Button */}
        <div className="flex items-center justify-center flex-shrink-0 md:px-0 py-2 md:py-0">
          <button
            onClick={onTranslate}
            disabled={!sourceText || isProcessing}
            className="group relative w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-primary-600 hover:border-primary-300 hover:shadow-primary-500/20 hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none z-10"
            title="立即翻译"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            ) : (
              <ArrowRightLeft className="w-5 h-5 stroke-[1.5]" />
            )}

            {/* Tooltip on hover */}
            <span className="absolute -top-9 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
              立即翻译
            </span>
          </button>
        </div>

        {/* Translated Text */}
        <div className="flex-1 flex flex-col h-full min-h-[200px] relative">
          <div className="flex justify-between items-center mb-2 px-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">译文</label>
          </div>

          <div className="flex-1 relative group">
            <textarea
              value={translatedText}
              onChange={(e) => setTranslatedText(e.target.value)}
              className="w-full h-full p-4 bg-white border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none text-gray-800 text-sm leading-relaxed custom-scrollbar shadow-sm transition-all"
              placeholder="翻译结果将显示在这里..."
            />

            {isProcessing && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10 border border-gray-100">
                <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-xl border border-gray-50">
                  <Sparkles className="w-4 h-4 text-primary-500 animate-spin" />
                  <span className="text-sm font-medium text-gray-700">AI 正在思考...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Hint */}
      <div className="mt-4 flex justify-between items-center border-t border-gray-100 pt-3 flex-shrink-0">
        <span className="text-xs text-gray-400">提示: 建议人工校对译文，以获得最佳的口型同步效果。</span>
      </div>
    </div>
  );
};

export default Step2Script;