
from pydantic import BaseModel
from typing import Optional

class STTResponse(BaseModel):
    text: str
    audio_path: str

class TranslationRequest(BaseModel):
    text: str
    target_language: str

class TranslationResponse(BaseModel):
    translated_text: str

class TTSRequest(BaseModel):
    text: str
    voice: str
    speed: float
    target_language: str

class TTSResponse(BaseModel):
    audio_path: str

class LipSyncRequest(BaseModel):
    video_path: str
    audio_path: str
    guidance_scale: float = 1.5
    inference_steps: int = 20
    seed: int = 1247

class LipSyncResponse(BaseModel):
    video_path: str
