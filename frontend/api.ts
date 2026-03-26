
import axios from 'axios';

const API_ORIGIN =
    import.meta.env.VITE_API_ORIGIN ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
const API_BASE_URL = `${API_ORIGIN}/api/v1`;
const FILE_BASE_URL = `${API_ORIGIN}/files`;

const extractFilename = (value: string) => {
    if (!value) return '';
    try {
        const parsed = new URL(value, window.location.origin);
        const rawName = parsed.pathname.split('/').pop() || '';
        return decodeURIComponent(rawName);
    } catch {
        const rawName = value.split(/[/\\]/).pop() || '';
        return decodeURIComponent(rawName);
    }
};

export const api = {
    uploadVideo: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data; // { file_path, filename }
    },

    processVideo: async (videoPath: string) => {
        const formData = new FormData();
        formData.append('video_path', videoPath);
        const response = await axios.post(`${API_BASE_URL}/process-video`, formData);
        return response.data; // { text, audio_path }
    },

    translate: async (text: string, targetLanguage: string) => {
        const response = await axios.post(`${API_BASE_URL}/translate`, {
            text,
            target_language: targetLanguage
        });
        return response.data; // { translated_text }
    },

    tts: async (text: string, voice: string, speed: number, targetLanguage: string) => {
        const response = await axios.post(`${API_BASE_URL}/tts`, {
            text,
            voice,
            speed,
            target_language: targetLanguage
        });
        return response.data; // { audio_path }
    },

    ttsClone: async (text: string, referenceAudio: File, speed: number, emotionType?: string, emotionAlpha?: number) => {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('reference_audio', referenceAudio);
        formData.append('speed', speed.toString());
        if (emotionType) formData.append('emotion_type', emotionType);
        if (emotionAlpha !== undefined) formData.append('emotion_alpha', emotionAlpha.toString());

        const response = await axios.post(`${API_BASE_URL}/tts/clone`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data; // { audio_path }
    },

    lipsync: async (videoPath: string, audioPath: string, guidanceScale: number, inferenceSteps: number, seed: number) => {
        const response = await axios.post(`${API_BASE_URL}/lipsync`, {
            video_path: videoPath,
            audio_path: audioPath,
            guidance_scale: guidanceScale,
            inference_steps: inferenceSteps,
            seed: seed
        });
        return response.data; // { video_path }
    },

    deleteProjectVideo: async (videoUrl: string) => {
        const fileName = extractFilename(videoUrl);
        if (!fileName) throw new Error('无效的视频地址，无法提取文件名');
        const response = await axios.post(`${API_BASE_URL}/delete-file`, {
            file_name: fileName
        });
        return response.data; // { deleted, file_name }
    },

    getFileUrl: (filePath: string) => {
        if (!filePath) return null;
        // Extract filename from path (handling both Windows and Unix separators)
        const filename = filePath.split(/[/\\]/).pop();
        return `${FILE_BASE_URL}/${filename}`;
    }
};
