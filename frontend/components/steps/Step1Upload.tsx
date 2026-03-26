import React, { useEffect, useRef, useState } from 'react';
import { UploadCloud, FileVideo, Loader2, Video, Camera, Square, CheckCircle2, RotateCcw } from 'lucide-react';

interface Step1Props {
  onFileSelect: (file: File) => void;
  videoPreview: string | null;
  isProcessing: boolean;
  canAnalyze: boolean;
  processingStage: string;
  onAnalyze: () => void;
}

const Step1Upload: React.FC<Step1Props> = ({
  onFileSelect,
  videoPreview,
  isProcessing,
  canAnalyze,
  processingStage,
  onAnalyze,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartAtRef = useRef<number>(0);
  const [dragActive, setDragActive] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const pickVideoConstraint = () => {
    return {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    } as MediaTrackConstraints;
  };

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

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const mapCameraError = (error: unknown) => {
    if (!(error instanceof DOMException)) {
      return '无法访问摄像头，请稍后重试。';
    }
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return '摄像头权限被拒绝，请在浏览器中允许摄像头权限。';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return '未检测到可用摄像头设备。';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return '摄像头可能被其他应用占用，请关闭后重试。';
    }
    return `无法访问摄像头（${error.name}）。`;
  };

  const openCamera = async () => {
    setCameraError(null);
    setRecordedFile(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }

    try {
      const videoConstraint = pickVideoConstraint();

      // Try with both video+audio first.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: true });
      } catch (error) {
        try {
          // Some devices/environments don't have audio input; fall back to video-only capture.
          stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false });
        } catch {
          // Last fallback: let browser choose any available camera.
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      streamRef.current = stream;
      setCameraOpen(true);

      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== 'live') {
        stopStream();
        setCameraOpen(false);
        setCameraError('摄像头视频流不可用，请检查摄像头是否被占用或更换设备后重试。');
      }
    } catch (error) {
      console.error(error);
      setCameraError(mapCameraError(error));
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  const validateRecordedVideo = async (url: string) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;

    return new Promise<{ ok: boolean; reason?: string }>((resolve) => {
      let settled = false;
      const done = (result: { ok: boolean; reason?: string }) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      video.onloadedmetadata = () => {
        const validDuration = Number.isFinite(video.duration) && video.duration > 0;
        const validSize = video.videoWidth > 0 && video.videoHeight > 0;
        if (validDuration && validSize) {
          done({ ok: true });
        } else {
          done({ ok: false, reason: '录制结果无有效视频帧，请重试。' });
        }
      };
      video.onerror = () => done({ ok: false, reason: '录制结果无法解析，请重试。' });

      window.setTimeout(() => done({ ok: false, reason: '录制结果读取超时，请重试。' }), 2000);
    });
  };

  const getPreferredRecordingMimeType = () => {
    const ua = navigator.userAgent;
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Edg|OPR/.test(ua);

    const safariCandidates = [
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
      'video/mp4',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];

    const otherCandidates = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
      'video/mp4',
    ];

    const candidates = isSafari ? safariCandidates : otherCandidates;
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    if (!liveVideoRef.current || liveVideoRef.current.videoWidth === 0 || liveVideoRef.current.videoHeight === 0) {
      setCameraError('当前摄像头画面未就绪（可能是设备断连或被占用），请重新拍摄。');
      return;
    }
    setCameraError(null);
    chunksRef.current = [];
    recordingStartAtRef.current = Date.now();

    const mimeType = getPreferredRecordingMimeType();

    const recorder = mimeType ? new MediaRecorder(streamRef.current, { mimeType }) : new MediaRecorder(streamRef.current);
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      const durationMs = Date.now() - recordingStartAtRef.current;
      if (durationMs < 400) {
        setCameraError('录制时间过短，请至少录制 1 秒。');
        setRecording(false);
        setRecordingElapsedMs(0);
        stopStream();
        return;
      }

      if (chunksRef.current.length === 0) {
        setCameraError('录制失败：未采集到有效视频数据，请重试。');
        setRecording(false);
        setRecordingElapsedMs(0);
        stopStream();
        return;
      }

      const chunkMime = chunksRef.current[0]?.type || '';
      const finalMime = recorder.mimeType || mimeType || chunkMime || 'video/webm';
      const containerMime = finalMime.split(';')[0] || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: finalMime });
      const extension = containerMime.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `capture_${Date.now()}.${extension}`, { type: finalMime });
      const url = URL.createObjectURL(blob);
      const valid = await validateRecordedVideo(url);
      if (!valid.ok) {
        URL.revokeObjectURL(url);
        setCameraError(valid.reason || '录制结果不可播放，请重试。');
        setRecordedFile(null);
        setRecordedUrl(null);
        setRecording(false);
        setRecordingElapsedMs(0);
        stopStream();
        return;
      }

      setRecordedFile(file);
      setRecordedUrl(url);
      setRecording(false);
      setRecordingElapsedMs(0);
      stopStream();
    };

    // Avoid tiny fragmented chunks: some browser/device combos can produce audio-only previews.
    recorder.start(1000);
    setRecording(true);
  };

  const closeCamera = () => {
    stopRecording();
    stopStream();
    setCameraOpen(false);
    setRecording(false);
    setRecordingElapsedMs(0);
  };

  const useRecordedVideo = () => {
    if (!recordedFile) return;
    onFileSelect(recordedFile);
    setCameraOpen(false);
  };

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !liveVideoRef.current) return;

    const videoEl = liveVideoRef.current;
    videoEl.srcObject = streamRef.current;
    let disposed = false;

    const tryPlay = async () => {
      try {
        await videoEl.play();
        window.setTimeout(() => {
          if (disposed) return;
          if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
            setCameraError('摄像头已连接但没有视频画面，请切换系统摄像头后重试。');
            stopStream();
          }
        }, 1200);
      } catch (error) {
        console.error('Failed to autoplay camera preview', error);
        setCameraError('摄像头预览启动失败，请重试。');
      }
    };

    tryPlay();
    return () => {
      disposed = true;
    };
  }, [cameraOpen]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setRecordingElapsedMs(Math.max(0, Date.now() - recordingStartAtRef.current));
    }, 200);
    return () => window.clearInterval(timer);
  }, [recording]);

  const formatRecordingTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      stopStream();
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

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
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openCamera();
            }}
            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full hover:scale-110 border border-white/10 shadow-lg"
            title="拍摄视频"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full hover:scale-110 border border-white/10 shadow-lg"
            title="更换视频"
          >
            <UploadCloud className="w-4 h-4" />
          </button>
        </div>

        {/* 识别语音按钮 - 悬浮在底部 */}
        {!isProcessing && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onAnalyze}
              disabled={!canAnalyze}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-full shadow-lg font-medium flex items-center space-x-2 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <FileVideo className="w-4 h-4" />
              <span>1. 识别语音</span>
            </button>
          </div>
        )}

        {/* 隐藏的文件输入框，用于更换视频 */}
        <input ref={inputRef} type="file" className="hidden" accept="video/mp4,video/quicktime,video/webm" onChange={handleChange} />
      </div>
    );
  }

  if (cameraOpen) {
    return (
      <div className="relative w-full h-full min-h-0 border border-gray-200 rounded-xl overflow-hidden bg-black">
        {!recordedUrl ? (
          <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <video src={recordedUrl} playsInline controls className="w-full h-full object-cover" />
        )}

        <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full border border-white/10">
          {recording ? `录制中 ${formatRecordingTime(recordingElapsedMs)}` : recordedUrl ? '录制完成' : '摄像头预览'}
        </div>
        {cameraError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-xs px-3 py-1.5 rounded-full border border-white/10 max-w-[90%] text-center">
            {cameraError}
          </div>
        )}

        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
          {!recordedUrl && !recording && (
            <button
              onClick={startRecording}
              disabled={!streamRef.current}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Video className="w-4 h-4" />
              开始录制
            </button>
          )}
          {recording && (
            <button
              onClick={stopRecording}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              停止录制
            </button>
          )}
          {recordedUrl && (
            <>
              <button
                onClick={openCamera}
                className="bg-white/90 hover:bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                重新拍摄
              </button>
              <button
                onClick={useRecordedVideo}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                使用该视频
              </button>
            </>
          )}
          <button
            onClick={closeCamera}
            className="bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  // 上传前的状态
  return (
    <div
      className={`relative w-full h-full min-h-0 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${dragActive ? 'border-primary-500 bg-primary-50 scale-[0.99]' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'
        }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" className="hidden" accept="video/mp4,video/quicktime,video/webm" onChange={handleChange} />

      <div className={`p-5 rounded-full shadow-sm mb-4 transition-colors ${dragActive ? 'bg-primary-100' : 'bg-white'}`}>
        <UploadCloud className={`w-10 h-10 ${dragActive ? 'text-primary-600' : 'text-gray-400'}`} />
      </div>

      <p className="text-lg font-medium text-gray-700">点击或拖拽上传视频</p>
      <p className="text-sm text-gray-400 mt-2">支持 MP4, MOV, WEBM (最大 500MB)</p>

      <button
        onClick={(e) => {
          e.stopPropagation();
          openCamera();
        }}
        className="mt-4 px-4 py-2 text-sm rounded-full border border-primary-200 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors flex items-center gap-2"
      >
        <Camera className="w-4 h-4" />
        直接拍摄视频
      </button>

      {cameraError && <p className="text-xs text-red-500 mt-3">{cameraError}</p>}
    </div>
  );
};

export default Step1Upload;
