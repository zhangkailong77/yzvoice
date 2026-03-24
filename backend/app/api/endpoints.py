
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from app.schemas.video import (
    STTResponse, TranslationRequest, TranslationResponse, 
    TTSRequest, TTSResponse, LipSyncRequest, LipSyncResponse
)
from app.services.media_service import extract_audio_from_video, convert_mp3_to_wav
from app.services.ai_service import (
    call_stt_api, call_translation_api, call_tts_api, call_lipsync_api, call_indextts_api
)
from app.core.config import settings
import os
import shutil
import uuid

router = APIRouter()

@router.post("/upload", summary="Upload a video file")
async def upload_video(file: UploadFile = File(...)):
    try:
        file_extension = os.path.splitext(file.filename)[1]
        file_name = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(settings.TEMP_DIR, file_name)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"file_path": file_path, "filename": file_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-video", response_model=STTResponse, summary="Extract audio and perform STT")
async def process_video(video_path: str = Form(...)):
    """
    Equivalent to 'process_video_and_transcribe' in Gradio.
    Extracts audio from video and performs STT.
    """
    try:
        audio_path = extract_audio_from_video(video_path)
        text = call_stt_api(audio_path)
        return STTResponse(text=text, audio_path=audio_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/translate", response_model=TranslationResponse, summary="Translate text")
async def translate_text(request: TranslationRequest):
    try:
        translated_text = call_translation_api(request.text, request.target_language)
        return TranslationResponse(translated_text=translated_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tts", response_model=TTSResponse, summary="Generate speech from text")
async def generate_speech(request: TTSRequest):
    try:
        audio_path = call_tts_api(request.text, request.voice, request.speed, request.target_language)
        return TTSResponse(audio_path=audio_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tts/clone", response_model=TTSResponse, summary="Generate speech using voice cloning")
async def generate_speech_clone(
    text: str = Form(...),
    reference_audio: UploadFile = File(...),
    speed: float = Form(1.0),
    emotion_type: str = Form(None),
    emotion_alpha: float = Form(None)
):
    try:
        # Save reference audio (or video) to temp
        file_extension = os.path.splitext(reference_audio.filename)[1].lower()
        if not file_extension:
            file_extension = ".wav" # Default to wav if no extension
        ref_file_name = f"ref_{uuid.uuid4()}{file_extension}"
        ref_file_path = os.path.join(settings.TEMP_DIR, ref_file_name)
        
        with open(ref_file_path, "wb") as buffer:
            shutil.copyfileobj(reference_audio.file, buffer)
            
        # Check if it's a video file and extract audio
        if file_extension in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
            ref_audio_path = extract_audio_from_video(ref_file_path)
        else:
            ref_audio_path = ref_file_path

        # Ensure it's a WAV file for IndexTTS (it seems to prefer wav, based on previous code)
        # extract_audio_from_video returns mp3.
        if ref_audio_path.endswith('.mp3'):
            ref_audio_path = convert_mp3_to_wav(ref_audio_path)
            
        audio_path = call_indextts_api(text, ref_audio_path, speed, emotion_type, emotion_alpha)
        
        return TTSResponse(audio_path=audio_path)
    except Exception as e:
        print(f"Generate Speech Clone Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/lipsync", response_model=LipSyncResponse, summary="Generate lip-synced video")
async def generate_lipsync(request: LipSyncRequest):
    try:
        video_path = call_lipsync_api(
            request.video_path, 
            request.audio_path, 
            request.guidance_scale, 
            request.inference_steps, 
            request.seed
        )
        return LipSyncResponse(video_path=video_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
