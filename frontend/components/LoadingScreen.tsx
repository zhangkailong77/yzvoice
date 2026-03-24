import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [text, setText] = useState("正在加载语言模型...");

  useEffect(() => {
    const texts = [
      "连接神经语音引擎...",
      "初始化口型同步算法...",
      "加载渲染环境..."
    ];
    
    // Cycle text
    let textIdx = 0;
    const textInterval = setInterval(() => {
        textIdx = (textIdx + 1) % texts.length;
        setText(texts[textIdx]);
    }, 800);

    // Total loading duration
    const tTotal = setTimeout(() => {
      clearInterval(textInterval);
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(tTotal);
      clearInterval(textInterval);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      </div>

      {/* Sound Wave Animation */}
      <div className="relative h-24 flex items-center justify-center space-x-1.5 mb-8">
        <style>{`
          @keyframes soundwave {
            0% { height: 12px; opacity: 0.3; }
            50% { height: 48px; opacity: 1; }
            100% { height: 12px; opacity: 0.3; }
          }
        `}</style>
        
        {[0, 1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className="w-1.5 bg-gray-900 rounded-full"
            style={{ 
              animation: 'soundwave 1s ease-in-out infinite', 
              animationDelay: `${i * 0.15}s` 
            }}
          ></div>
        ))}
      </div>

      <div className="flex items-center space-x-2 text-gray-400 text-sm font-light tracking-widest uppercase">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>{text}</span>
      </div>
    </div>
  );
};

export default LoadingScreen;