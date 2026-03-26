import os
import uuid
import subprocess
import moviepy.editor as mpe
from app.core.config import settings


def normalize_video_to_mp4(video_path: str) -> str:
    """
    Normalize uploaded video to MP4 (H.264/AAC) for downstream compatibility.
    Returns MP4 path. If already mp4, returns the original path.
    """
    if not video_path or not os.path.exists(video_path):
        raise FileNotFoundError("Video file not found")

    extension = os.path.splitext(video_path)[1].lower()
    if extension == ".mp4":
        return video_path

    target_path = os.path.splitext(video_path)[0] + ".mp4"

    # Prefer direct ffmpeg conversion first. It is more robust for browser-recorded webm/mp4 variants.
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-fflags",
                "+genpts",
                "-i",
                video_path,
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-movflags",
                "+faststart",
                target_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )

        if os.path.exists(video_path):
            os.remove(video_path)
        print(f"Converted video to MP4: {target_path}")
        return target_path
    except Exception as e:
        print(f"ffmpeg conversion failed, fallback to moviepy: {e}")

    video_clip = None
    try:
        video_clip = mpe.VideoFileClip(video_path)
        video_clip.write_videofile(
            target_path,
            codec="libx264",
            audio_codec="aac",
            ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart", "-fflags", "+genpts"],
            verbose=False,
            logger=None,
        )
        if os.path.exists(video_path):
            os.remove(video_path)
        print(f"Converted video to MP4 via moviepy: {target_path}")
        return target_path
    except Exception as e:
        print(f"Error converting video to MP4: {e}")
        raise e
    finally:
        if video_clip:
            video_clip.close()

def extract_audio_from_video(video_path: str) -> str:
    """
    Extract audio from video and save as mp3.
    """
    if not video_path or not os.path.exists(video_path):
        raise FileNotFoundError("Video file not found")

    print(f"Starting audio extraction from: {video_path}")
    video_clip = None
    try:
        video_clip = mpe.VideoFileClip(video_path)
        
        if video_clip.audio is None:
            raise ValueError("Video does not contain audio track")

        base_name = os.path.splitext(os.path.basename(video_path))[0]
        output_audio_path = os.path.join(settings.TEMP_DIR, f"{base_name}_{uuid.uuid4().hex[:6]}.mp3")
        
        video_clip.audio.write_audiofile(output_audio_path, codec='mp3')
        
        print(f"Audio extracted to: {output_audio_path}")
        return output_audio_path
    except Exception as e:
        print(f"Error extracting audio: {e}")
        raise e
    finally:
        if video_clip:
            video_clip.close()

def convert_mp3_to_wav(mp3_path: str) -> str:
    """
    Convert MP3 file to WAV format using moviepy (ffmpeg).
    """
    if not mp3_path or not os.path.exists(mp3_path):
        raise FileNotFoundError("MP3 file not found")
        
    try:
        audio_clip = mpe.AudioFileClip(mp3_path)
        wav_path = mp3_path.replace(".mp3", ".wav")
        audio_clip.write_audiofile(wav_path, codec='pcm_s16le')
        audio_clip.close()
        print(f"Converted to WAV: {wav_path}")
        return wav_path
    except Exception as e:
        print(f"Error converting audio format: {e}")
        raise e
