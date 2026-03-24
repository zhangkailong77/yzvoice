import os
import requests
import json
import uuid
import subprocess
from gradio_client import Client, handle_file
from app.core.config import settings
from app.services.media_service import convert_mp3_to_wav

def call_stt_api(audio_path: str) -> str:
    if not audio_path or not os.path.exists(audio_path):
        raise ValueError("Audio file not found")
        
    print(f"Calling STT API for: {audio_path}")
    headers = {"Authorization": f"Bearer {settings.STT_API_KEY}"}
    payload_data = {'model': "FunAudioLLM/SenseVoiceSmall", 'language': 'zh'}
    
    try:
        with open(audio_path, 'rb') as audio_file:
            files = {'file': (os.path.basename(audio_path), audio_file)}
            response = requests.post(settings.SILICONFLOW_STT_URL, headers=headers, data=payload_data, files=files, timeout=120)
            response.raise_for_status()
            
        result_text = response.json().get("text", "")
        return result_text
    except Exception as e:
        print(f"STT API Error: {e}")
        raise e

def call_translation_api(text: str, target_language_name: str) -> str:
    if not text:
        return ""
        
    print(f"Calling Translation API: {text} -> {target_language_name}")
    headers = {"Authorization": f"Bearer {settings.STT_API_KEY}", "Content-Type": "application/json"}
    
    system_prompt = f"你是一个专业的翻译引擎。将输入的文本翻译成语句通顺准确地{target_language_name}，只输出翻译后的{target_language_name}内容，不添加任何解释或注释。/no_think"
    
    payload = {
        "model": "Qwen/Qwen3-8B",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ],
        "stream": False, "max_tokens": 2048, "temperature": 0.1, "top_p": 0.7,
        "frequency_penalty": 0.5, "response_format": {"type": "text"}
    }
    
    try:
        response = requests.post(settings.SILICONFLOW_CHAT_URL, headers=headers, json=payload, timeout=90)
        response.raise_for_status()
        translated_text = response.json()["choices"][0]["message"]["content"]
        return translated_text.strip()
    except Exception as e:
        print(f"Translation API Error: {e}")
        raise e

def call_tts_api(text: str, voice_name: str, speed: float, target_language_name: str) -> str:
    if not text:
        raise ValueError("No text provided for TTS")
        
    # voice_name passed from frontend is the ID (e.g. "danya_xuejie")
    # But MINIMAX_VOICES keys are Chinese names (e.g. "温柔女声") and values are IDs.
    # We need to find if the input matches a value directly, or if it's a key.
    
    voice_id = None
    
    # Check if input is a value (ID) - This is what frontend sends
    if voice_name in settings.MINIMAX_VOICES.values():
        voice_id = voice_name
    # Check if input is a key (Name)
    elif voice_name in settings.MINIMAX_VOICES:
        voice_id = settings.MINIMAX_VOICES[voice_name]
        
    if not voice_id:
        # Fallback to default
        voice_id = "presenter_male"
    # The frontend sends the language name (e.g., "Thai"), but we need the value from the mapping (e.g., "Thai")
    # However, in the original code:
    # TARGET_LANGUAGES = {"泰语": "Thai", ...}
    # tts_code = TARGET_LANGUAGES.get(target_language_name)
    # If frontend sends "Thai", this lookup fails because keys are Chinese.
    
    # We need to reverse lookup or ensure frontend sends Chinese keys.
    # Let's check if the input matches a value, or a key.
    
    tts_code = None
    
    # Check if input is a key (e.g. "泰语")
    if target_language_name in settings.TARGET_LANGUAGES:
        tts_code = settings.TARGET_LANGUAGES[target_language_name]
    # Check if input is a value (e.g. "Thai")
    elif target_language_name in settings.TARGET_LANGUAGES.values():
        tts_code = target_language_name
        
    if not tts_code:
        # Fallback: try to find case-insensitive match in values
        for lang_code in settings.TARGET_LANGUAGES.values():
            if lang_code.lower() == target_language_name.lower():
                tts_code = lang_code
                break
    
    if not tts_code:
        raise ValueError(f"Invalid language for TTS: {target_language_name}")
        
    print(f"Calling TTS API: {text}, Voice: {voice_id}, Speed: {speed}, Lang: {tts_code}")
    
    url = f"{settings.MINIMAX_TTS_URL}?GroupId={settings.MINIMAX_GROUP_ID}"
    headers = {
        "Authorization": f"Bearer {settings.MINIMAX_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "speech-02-hd",
        "text": text,
        "voice_setting": {
            "voice_id": voice_id,
            "speed": speed
        },
        "audio_setting": {
            "format": "mp3"
        },
        "language_boost": tts_code
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=90)
        response.raise_for_status()
        result_json = response.json()
        
        if result_json.get("base_resp", {}).get("status_code") != 0:
            raise Exception(f"Minimax API Error: {result_json.get('base_resp', {}).get('status_msg')}")
            
        hex_audio_data = result_json.get('data', {}).get('audio')
        if not hex_audio_data:
            raise Exception("No audio data received from Minimax API")
            
        binary_audio_data = bytes.fromhex(hex_audio_data)
        file_name = f"{uuid.uuid4()}.mp3"
        output_path = os.path.join(settings.TEMP_DIR, file_name)
        
        with open(output_path, 'wb') as audio_file:
            audio_file.write(binary_audio_data)
            
        return output_path
    except Exception as e:
        print(f"TTS API Error: {e}")
        raise e

def call_lipsync_api(video_path: str, audio_path: str, guidance_scale: float, inference_steps: int, seed: int) -> str:
    if not video_path or not os.path.exists(video_path):
        raise ValueError("Video file not found")
    if not audio_path or not os.path.exists(audio_path):
        raise ValueError("Audio file not found")
        
    # Convert mp3 to wav for lipsync compatibility
    wav_path = convert_mp3_to_wav(audio_path)
    
    print(f"Calling LipSync API: Video={video_path}, Audio={wav_path}")
    
    try:
        client = Client(settings.LIPSYNC_API_URL)
        result = client.predict(
            video_path={"video": handle_file(video_path)},
            audio_path=handle_file(wav_path),
            guidance_scale=guidance_scale,
            inference_steps=inference_steps,
            seed=seed,
            api_name="/process_video",
        )
        
        video_file_path = result.get('video')
        if not video_file_path:
            raise Exception("LipSync API returned no video file")
            
        return video_file_path
    except Exception as e:
        raise e

def call_indextts_api(text: str, ref_audio_path: str, speed: float = 1.0, emotion_type: str = None, emotion_alpha: float = None) -> str:
    if not text:
        raise ValueError("No text provided for TTS")
    if not ref_audio_path or not os.path.exists(ref_audio_path):
        raise ValueError("Reference audio file not found")

    print(f"Calling IndexTTS via script: Text={text}, Ref={ref_audio_path}, Speed={speed}, Emotion={emotion_type}, Alpha={emotion_alpha}")
    
    try:
        # Generate a unique output filename
        output_filename = f"clone_{uuid.uuid4()}.wav"
        output_path = os.path.join(settings.TEMP_DIR, output_filename)
        # Ensure output path is absolute for the subprocess
        output_path = os.path.abspath(output_path)
        ref_audio_path = os.path.abspath(ref_audio_path)

        # Construct the python script to run inference
        # We need to map our emotion types to the vectors or logic used in IndexTTS
        # Based on webui.py, emotion control method 2 uses vectors.
        # But for simplicity, let's use the "Python Script Call" example from the user which seems to use a simpler API or we can adapt.
        # The user provided example:
        # from indextts.infer_v2 import IndexTTS2
        # tts = IndexTTS2(cfg_path="model/config.yaml", model_dir="model", use_fp16=False)
        # tts.infer(spk_audio_prompt='...', text=text, output_path='...')
        
        # We need to handle emotion. The infer method has emo_vector, emo_text, etc.
        # If emotion_type is provided, we might want to use emo_text or map it to a vector.
        # Let's use emo_text for simplicity if emotion_type is present, or just default.
        
        script_content = f"""
import sys
import os
sys.path.append(os.getcwd()) # Ensure current dir is in path for indextts imports

from indextts.infer_v2 import IndexTTS2

def run_inference():
    # Initialize TTS
    # Assuming we are running this from the indextts2 directory
    # Based on webui.py default args: model_dir="./checkpoints", cfg_path is joined with model_dir
    model_dir = "checkpoints" 
    cfg_path = "checkpoints/config.yaml"
    
    tts = IndexTTS2(cfg_path=cfg_path, model_dir=model_dir, use_fp16=False)
    
    text = "{text}"
    ref_audio = r"{ref_audio_path}"
    output_path = r"{output_path}"
    
    # Emotion handling
    emo_text = "{emotion_type}" if "{emotion_type}" != "None" else None
    emo_alpha = {emotion_alpha} if {emotion_alpha} is not None else 1.0
    
    # If emotion_type is provided, we use it as emo_text (description)
    # webui.py logic: use_emo_text=(emo_control_method==3)
    use_emo_text = True if emo_text else False
    
    print(f"Generating TTS to {{output_path}}...")
    
    tts.infer(
        spk_audio_prompt=ref_audio,
        text=text,
        output_path=output_path,
        use_emo_text=use_emo_text,
        emo_text=emo_text,
        emo_alpha=emo_alpha
    )
    print("Generation complete.")

if __name__ == "__main__":
    run_inference()
"""
        
        # Write script to a temp file
        script_name = f"run_tts_{uuid.uuid4()}.py"
        # We should write this script into the indextts2 directory to avoid path issues with imports
        indextts_dir = os.path.join(settings.BASE_DIR, "indextts2")
        # Ensure absolute path
        indextts_dir = os.path.abspath(indextts_dir)
        
        script_path = os.path.join(indextts_dir, script_name)
        
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(script_content)
            
        # Run the script using the python executable from the .venv created by uv
        # This avoids the 'uv run' encoding issues while using the correct environment
        venv_python = os.path.join(indextts_dir, ".venv", "Scripts", "python.exe")
        
        # Fallback to system python if venv python doesn't exist (though it should if uv sync worked)
        if not os.path.exists(venv_python):
            print(f"Warning: venv python not found at {venv_python}, falling back to system python")
            cmd = ["python", script_name]
        else:
            cmd = [venv_python, script_name]
        
        # We need to set PYTHONPATH to include current dir
        env = os.environ.copy()
        env["PYTHONPATH"] = f"{env.get('PYTHONPATH', '')}{os.pathsep}."
        # Force UTF-8 encoding for Python to avoid UnicodeDecodeError on Windows
        env["PYTHONUTF8"] = "1"
        
        import subprocess
        
        print(f"Executing command: {' '.join(cmd)} in {indextts_dir}")
        
        result = subprocess.run(
            cmd,
            cwd=indextts_dir,
            env=env,
            capture_output=True,
            text=True,
            check=True,
            encoding='utf-8' # Explicitly set encoding for capturing output
        )
        
        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)
        
        # Clean up script
        if os.path.exists(script_path):
            os.remove(script_path)
            
        if not os.path.exists(output_path):
            raise Exception("Output file was not generated.")
            
        return output_path
        
    except subprocess.CalledProcessError as e:
        print(f"IndexTTS Script Error (STDERR): {e.stderr}")
        print(f"IndexTTS Script Output (STDOUT): {e.stdout}")
        raise Exception(f"IndexTTS generation failed: {e.stderr}")
    except Exception as e:
        print(f"IndexTTS API Error: {e}")
        raise e
