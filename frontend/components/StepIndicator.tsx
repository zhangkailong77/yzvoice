import React from 'react';
import { Upload, FileText, Mic, Clapperboard, Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const steps = [
  { icon: Upload, label: "上传与分析" },
  { icon: FileText, label: "脚本工坊" },
  { icon: Mic, label: "配音导演" },
  { icon: Clapperboard, label: "合成渲染" },
];

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="relative flex justify-between items-center">
        {/* Connecting Line */}
        <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full">
           <div 
             className="h-full bg-teal-500 rounded-full transition-all duration-500 ease-in-out"
             style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
           ></div>
        </div>

        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div key={index} className="flex flex-col items-center group cursor-default">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                  isActive 
                    ? 'bg-white border-teal-500 shadow-md scale-110' 
                    : isCompleted 
                      ? 'bg-teal-500 border-teal-500 text-white' 
                      : 'bg-white border-gray-200 text-gray-300'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : ''}`} />
                )}
              </div>
              <span className={`mt-2 text-xs font-medium transition-colors ${
                isActive ? 'text-teal-700' : isCompleted ? 'text-teal-600' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
