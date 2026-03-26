
import os
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env explicitly so runtime always picks local config.
BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env")

class Settings:
    # API Keys
    STT_API_KEY = "sk-sfdmpvgqaudzbcgxyxyrtdewjdmlupusemjhfvhzwsitqjum"
    MINIMAX_GROUP_ID = "1922837262983238024"
    MINIMAX_API_KEY = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiLlvKDmpbfpvpkiLCJVc2VyTmFtZSI6IuW8oOalt-m-mSIsIkFjY291bnQiOiIiLCJTdWJqZWN0SUQiOiIxOTIyODM3MjYyOTkxNjI2NjMyIiwiUGhvbmUiOiIxODI1MDYzNjg2NSIsIkdyb3VwSUQiOiIxOTIyODM3MjYyOTgzMjM4MDI0IiwiUGFnZU5hbWUiOiIiLCJNYWlsIjoiIiwiQ3JlYXRlVGltZSI6IjIwMjUtMDUtMjIgMDk6NTE6MjMiLCJUb2tlblR5cGUiOjEsImlzcyI6Im1pbmltYXgifQ.W2mdcOc1JIpP50aKJ95BXIU21K2X-Ivat04t1cY50dvneTw0KsrK2gjm3Pu0Pvb0eqkw8BGRmD4_NZY4L1DgA1nkWjprOZUWQpqiTShR_HKil-Ku4jYskAmdZpyALPyE1FjRPIR_DQIHTsVxHFCJ9VA_ViqaQbgrnsePmtdddVTC5mWKkf5IcO5XwMduQ03EibeuH3a0srbxZ0bfL5mMxKD_ADD2BXUURLTNc8AAjW_-IoOPR29rJBZ-kJWTdc5L83ldAoWVdQfCikX9bcoPuMq1pWYghSvyVwAhdtmuIfrzHVA2smpI0PP9a0gKlrTijSLtN5bf6krTVRAGe5wuIQ"
    
    # URLs
    LIPSYNC_API_URL = "http://192.168.150.2:7860"
    SILICONFLOW_STT_URL = "https://api.siliconflow.cn/v1/audio/transcriptions"
    SILICONFLOW_CHAT_URL = "https://api.siliconflow.cn/v1/chat/completions"
    MINIMAX_TTS_URL = "https://api.minimax.chat/v1/t2a_v2"
    INDEXTTS_API_URL = "http://localhost:8001/api/clone"
    PIXVERSE_API_BASE_URL = os.getenv("PIXVERSE_API_BASE_URL", "https://app-api.pixverse.ai")
    PIXVERSE_API_KEY = os.getenv("PIXVERSE_API_KEY", "")
    PIXVERSE_POLL_INTERVAL_SECONDS = float(os.getenv("PIXVERSE_POLL_INTERVAL_SECONDS", "5"))
    PIXVERSE_POLL_TIMEOUT_SECONDS = int(os.getenv("PIXVERSE_POLL_TIMEOUT_SECONDS", "300"))
    PIXVERSE_HTTP_RETRIES = int(os.getenv("PIXVERSE_HTTP_RETRIES", "5"))
    PIXVERSE_HTTP_BACKOFF_SECONDS = float(os.getenv("PIXVERSE_HTTP_BACKOFF_SECONDS", "1.0"))

    # Paths
    BASE_DIR = os.getcwd()
    TEMP_DIR = os.path.join(BASE_DIR, "temp_audio")
    
    # Constants
    MINIMAX_VOICES = {
        "标准男声 (通用)": "presenter_male",
        "标准女声 (通用)": "presenter_female",
        "磁性男声": "junlang_nanyou",
        "温柔女声": "danya_xuejie",
        "成熟女声": "female-chengshu",
        "活力女声": "female-shaonv-jingpin",
        # "nanzhi克隆音色01": "nanzhi_voice_woman_01",
        # "nanzhi克隆音色02": "nanzhi_voice_0817",
        # "QDPEC": "qdpec_woman_01"
    }

    TARGET_LANGUAGES = {
        "中文": "Chinese",
        "泰语": "Thai",
        "英语": "English",
        "日语": "Japanese",
        "韩语": "Korean",
        "马来语": "Malay",
        "越南语": "Vietnamese",
        "俄语": "Russian",
        "法语": "French",
        "德语": "German",
        "西班牙语": "Spanish",
        "阿拉伯语": "Arabic",
        "印尼语": "Indonesian",
        "意大利语": "Italian"
    }

settings = Settings()

# Ensure temp directory exists
os.makedirs(settings.TEMP_DIR, exist_ok=True)
