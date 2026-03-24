import os
import requests
import gradio as gr
import uuid
import json
import moviepy.editor as mpe  # 引入 moviepy
from gradio_client import Client, handle_file # 引入gradio_client
from pydub import AudioSegment


os.environ['GRADIO_DEFAULT_TIMEOUT'] = '600' # 设置全局超时为 600秒 = 10分钟

# --- 直接在此处写入你的API密钥 ---
STT_API_KEY = "sk-sfdmpvgqaudzbcgxyxyrtdewjdmlupusemjhfvhzwsitqjum"  # <--- 在这里填入你的密钥

# 2. Minimax (用于文字转语音)
MINIMAX_GROUP_ID = "1922837262983238024" # <--- 在这里填入
MINIMAX_API_KEY = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiLlvKDmpbfpvpkiLCJVc2VyTmFtZSI6IuW8oOalt-m-mSIsIkFjY291bnQiOiIiLCJTdWJqZWN0SUQiOiIxOTIyODM3MjYyOTkxNjI2NjMyIiwiUGhvbmUiOiIxODI1MDYzNjg2NSIsIkdyb3VwSUQiOiIxOTIyODM3MjYyOTgzMjM4MDI0IiwiUGFnZU5hbWUiOiIiLCJNYWlsIjoiIiwiQ3JlYXRlVGltZSI6IjIwMjUtMDUtMjIgMDk6NTE6MjMiLCJUb2tlblR5cGUiOjEsImlzcyI6Im1pbmltYXgifQ.W2mdcOc1JIpP50aKJ95BXIU21K2X-Ivat04t1cY50dvneTw0KsrK2gjm3Pu0Pvb0eqkw8BGRmD4_NZY4L1DgA1nkWjprOZUWQpqiTShR_HKil-Ku4jYskAmdZpyALPyE1FjRPIR_DQIHTsVxHFCJ9VA_ViqaQbgrnsePmtdddVTC5mWKkf5IcO5XwMduQ03EibeuH3a0srbxZ0bfL5mMxKD_ADD2BXUURLTNc8AAjW_-IoOPR29rJBZ-kJWTdc5L83ldAoWVdQfCikX9bcoPuMq1pWYghSvyVwAhdtmuIfrzHVA2smpI0PP9a0gKlrTijSLtN5bf6krTVRAGe5wuIQ"   # <--- 在这里填入
# ------------------------------------

# --- Minimax 可选设置 ---
MINIMAX_VOICES = {
    "标准男声 (通用)": "presenter_male",
    "标准女声 (通用)": "presenter_female",
    "磁性男声": "junlang_nanyou",
    "温柔女声": "danya_xuejie",
    "成熟女声": "female-chengshu",
    "活力女声": "female-shaonv-jingpin",
    # "nanzhi克隆音色01": "nanzhi_voice_woman_01",
    "nanzhi克隆音色02": "nanzhi_voice_0817",
    "QDPEC": "qdpec_woman_01"
}

TARGET_LANGUAGES = {
    "中文": "Chinese",
    "泰语": "Thai",
    "英语": "English",
    "日语": "Japanese",
    "韩语": "Korean",
    "越南语": "Vietnamese",
    "俄语": "Russian",
    "法语": "French",
    "德语": "German",
    "西班牙语": "Spanish",
    "阿拉伯语": "Arabic",
    "印尼语": "Indonesian",
    "意大利语": "Italian"
}
# ------------------------------------

# 流程2 (LatentSync) 的Gradio API 地址
LIPSYNC_API_URL = "http://192.168.150.2:7860"
# --- 新增函数：从视频中提取音频 ---

def extract_audio_from_video(video_path: str) -> str:
    """
    从给定的视频文件路径中提取音频，并保存为mp3文件。
    返回提取出的音频文件的路径。
    """
    if not video_path or not os.path.exists(video_path):
        raise gr.Error("视频文件路径无效或文件不存在！")

    print(f"开始从视频中提取音频: {video_path}")
    try:
        video_clip = mpe.VideoFileClip(video_path)

        # 检查视频是否包含音轨
        if video_clip.audio is None:
            video_clip.close()
            raise gr.Error("上传的视频文件不包含音轨！")

        # 定义输出路径
        output_dir = "temp_audio"
        os.makedirs(output_dir, exist_ok=True)
        # 使用视频文件名作为基础，避免重名
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        output_audio_path = os.path.join(output_dir, f"{base_name}_{uuid.uuid4().hex[:6]}.mp3")

        # 提取并写入音频文件
        video_clip.audio.write_audiofile(output_audio_path, codec='mp3')

        # 关闭文件以释放资源
        video_clip.close()

        print(f"音频提取成功，已保存至: {output_audio_path}")
        return output_audio_path
    except Exception as e:
        print(f"提取音频时发生错误: {e}")
        # 尝试关闭可能未关闭的文件
        if 'video_clip' in locals() and video_clip:
            video_clip.close()
        raise gr.Error(f"处理视频文件时出错: {str(e)}")


# --- 其他API调用函数保持不变 ---

def call_stt_api(audio_path: str) -> str:
    # ... 此函数保持不变 ...
    if not audio_path or not os.path.exists(audio_path):
        raise ValueError("音频文件路径无效或文件不存在")
    print(f"调用STT API (硅基流动) 处理文件: {audio_path}")
    API_URL = "https://api.siliconflow.cn/v1/audio/transcriptions"
    MODEL_NAME = "FunAudioLLM/SenseVoiceSmall"
    headers = {"Authorization": f"Bearer {STT_API_KEY}"}
    payload_data = {'model': MODEL_NAME, 'language': 'zh'}
    try:
        with open(audio_path, 'rb') as audio_file:
            files = {'file': (os.path.basename(audio_path), audio_file)}  # 自动检测MIME类型
            response = requests.post(API_URL, headers=headers, data=payload_data, files=files, timeout=120)  # 增加超时
            response.raise_for_status()
        result_text = response.json().get("text", "")
        # print(f"STT API 返回文本: {result_text}")
        return result_text
    except requests.exceptions.RequestException as e:
        error_content = e.response.text if e.response else "No response"
        raise gr.Error(f"语音识别API请求失败: {error_content}")
    except Exception as e:
        raise gr.Error(f"处理音频时发生内部错误: {str(e)}")


def call_translation_api(text: str, target_language_name: str) -> str:
    # ... 此函数保持不变 ...
    if not text or text.strip() == "":
        return "没有需要翻译的文本。"
    print(f"调用翻译API (Qwen模型) 翻译文本: {text}")
    API_URL = "https://api.siliconflow.cn/v1/chat/completions"
    headers = {"Authorization": f"Bearer {STT_API_KEY}", "Content-Type": "application/json"}

    system_prompt = f"你是一个专业的翻译引擎。将输入的文本翻译成语句通顺准确地{target_language_name}，只输出翻译后的{target_language_name}内容，不添加任何解释或注释。/no_think"

    payload = {
        "model": "Qwen/Qwen3-8B",
        "messages": [
            {"role": "system",
             "content": system_prompt
             },
            {"role": "user", "content": text}
        ],
        "stream": False, "max_tokens": 2048, "temperature": 0.1, "top_p": 0.7,
        "frequency_penalty": 0.5, "response_format": {"type": "text"}
    }
    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=90)
        response.raise_for_status()
        result_json = response.json()
        translated_text = result_json["choices"][0]["message"]["content"]
        print(f"翻译API返回文本: {translated_text}")
        return translated_text.strip()
    except requests.exceptions.RequestException as e:
        error_content = e.response.text if e.response else "No response"
        raise gr.Error(f"翻译API请求失败: {error_content}")
    except (KeyError, IndexError) as e:
        raise gr.Error("无法从API响应中解析翻译结果。")


def call_tts_api(text: str, selected_voice_name: str, speed: float, target_language_name: str) -> str:
    """调用 Minimax TTS API，将文本动态转换为目标语言的语音"""
    if not text or text.strip() == "":
        raise gr.Error("没有文本可以转换为语音。")

    if not target_language_name:
        raise gr.Error("请先选择一个目标语言。")

    voice_id = MINIMAX_VOICES.get(selected_voice_name, "presenter_male")

    # --- 关键修复在这里 ---
    # 1. 从 TARGET_LANGUAGES 字典中查找对应的 tts_code
    tts_code = TARGET_LANGUAGES.get(target_language_name)
    if not tts_code:
        # 这是一个安全检查，防止选择了无效的语言
        raise gr.Error(f"为语言 '{target_language_name}' 找到了无效的TTS配置。")


    # 在日志中打印正确的信息
    print(f"调用 Minimax TTS API，语言: {tts_code}, 音色: {voice_id}, 语速: {speed}")

    url = f"https://api.minimax.chat/v1/t2a_v2?GroupId={MINIMAX_GROUP_ID}"
    headers = {
        "Authorization": f"Bearer {MINIMAX_API_KEY}",
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
        # 2. 使用从字典中获取的 tts_code
        "language_boost": tts_code
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=90)
        response.raise_for_status()
        result_json = response.json()
        # print("Minimax API 返回内容:", json.dumps(result_json, indent=2, ensure_ascii=False))
        if result_json.get("base_resp", {}).get("status_code") != 0:
            error_msg = result_json.get("base_resp", {}).get("status_msg", "未知错误")
            raise gr.Error(f"Minimax API 错误: {error_msg}")
        hex_audio_data = result_json.get('data', {}).get('audio')
        if not hex_audio_data:
            raise gr.Error(f"Minimax API 未在响应中返回音频数据。服务器响应: {json.dumps(result_json)}")
        binary_audio_data = bytes.fromhex(hex_audio_data)
        output_dir = "temp_audio"
        os.makedirs(output_dir, exist_ok=True)
        file_name = f"{uuid.uuid4()}.mp3"
        output_path = os.path.join(output_dir, file_name)
        with open(output_path, 'wb') as audio_file:
            audio_file.write(binary_audio_data)
        print(f"TTS音频已保存到: {output_path}")
        return output_path
    except requests.exceptions.RequestException as e:
        error_content = e.response.text if e.response else "No response"
        raise gr.Error(f"语音合成请求失败: {error_content}")
    except Exception as e:
        raise e


# --- 新增主流程处理函数 ---
def process_video_and_transcribe(video_path):
    """
    接收视频路径，先提取音频，然后调用STT API进行识别。
    """
    if video_path is None:
        return "请先上传一个视频文件。"

    # 步骤1：从视频中提取音频
    audio_path = extract_audio_from_video(video_path)

    # 步骤2：使用提取出的音频进行语音识别
    transcribed_text = call_stt_api(audio_path)

    return transcribed_text


# --- 新增函数：调用口型同步API ---
def call_lipsync_api(original_video_path, generated_audio_path, guidance_scale, inference_steps, seed):
    if not original_video_path: raise gr.Error("错误：找不到原始视频文件路径。")
    if not generated_audio_path: raise gr.Error("错误：找不到生成的泰语音频文件路径。")

    print("将MP3转换为WAV以提高兼容性...")
    try:
        audio = AudioSegment.from_mp3(generated_audio_path);
        wav_path = generated_audio_path.replace(".mp3", ".wav")
        audio.export(wav_path, format="wav");
        print(f"WAV文件已生成: {wav_path}")
    except Exception as e:
        raise gr.Error(f"音频格式转换失败: {str(e)}")

    print("开始调用口型同步API...")
    print(f"  - 视频: {original_video_path}");
    print(f"  - 音频 (WAV): {wav_path}")

    try:
        client = Client(LIPSYNC_API_URL)

        # 2. 在 predict 方法中直接设置超时时间
        result = client.predict(
            video_path={"video": handle_file(original_video_path)},
            audio_path=handle_file(wav_path),
            guidance_scale=guidance_scale,
            inference_steps=inference_steps,
            seed=seed,
            api_name="/process_video",
        )
        print("口型同步API调用成功，结果路径:", result);

        video_file_path = result.get('video')
        if not video_file_path:
            raise gr.Error("口型同步API调用成功，但返回结果中没有找到视频文件。")

        return video_file_path  # 只返回文件路径字符串

    except Exception as e:
        print(f"调用口型同步API时发生错误: {str(e)}");
        raise gr.Error(f"调用口型同步服务失败: {str(e)}")


def run_tts_and_show_next_step(text, voice, speed, language):
    audio_path = call_tts_api(text, voice, speed, language)
    return audio_path, gr.update(visible=True)

# --- 构建并启动 Gradio 界面 (已修改) ---
# ... 其他函数 ...

# --- 构建并启动 Gradio 界面 ---
if __name__ == "__main__":
    with gr.Blocks(theme=gr.themes.Soft()) as demo:
        gr.Markdown("# 中国—东盟多语种短视频合成系统")
        gr.Markdown("上传视频 -> 识别语音 -> 选择目标语言 -> 翻译 -> 生成音频 -> 生成口型同步视频")

        # 阶段1: 翻译与语音合成
        with gr.Accordion("阶段1: 翻译与语音合成", open=True):
            with gr.Row():
                video_input = gr.Video(label="上传源视频 (中文语音)", height=360, width=640)
                with gr.Column():
                    stt_button = gr.Button("1. 识别语音", variant="secondary")
                    stt_output = gr.Textbox(label="识别结果 (中文)", interactive=True)
                    with gr.Row():
                        language_dropdown = gr.Dropdown(
                            label="选择目标语言", choices=list(TARGET_LANGUAGES.keys()),
                            value="泰语", scale=1
                        )
                        translate_button = gr.Button("2. 翻译", variant="secondary", scale=1)
                    translation_output = gr.Textbox(label="翻译结果", interactive=True)

            with gr.Row(equal_height=True):
                voice_dropdown = gr.Dropdown(label="选择音色", choices=list(MINIMAX_VOICES.keys()),
                                             value=list(MINIMAX_VOICES.keys())[0], scale=2)
                speed_slider = gr.Slider(label="选择语速", minimum=0.5, maximum=2.0, step=0.1, value=1.0, scale=2)
                tts_button = gr.Button("3. 生成音频", variant="primary", scale=1)

            tts_output = gr.Audio(label="合成的目标语言音频", type="filepath", interactive=False)

        # 阶段2: 口型同步
        with gr.Accordion("阶段2: 生成最终口型同步视频", open=False):
            with gr.Row():
                with gr.Column():
                    gr.Markdown("系统将使用**上方上传的源视频**和**生成的音频**进行处理。")
                    guidance_scale = gr.Slider(minimum=1.0, maximum=2.5, value=1.5, step=0.5, label="Guidance Scale")
                    inference_steps = gr.Slider(minimum=10, maximum=50, value=20, step=1, label="Inference Steps")
                    seed = gr.Number(value=1247, label="Random Seed", precision=0)
                    lipsync_button = gr.Button("4. 生成最终视频", variant="primary", visible=False)
                final_video_output = gr.Video(label="最终生成的视频 (目标语言口型)", height=360, width=640)

        # --- 定义组件交互 ---
        stt_button.click(fn=process_video_and_transcribe, inputs=video_input, outputs=stt_output)
        translate_button.click(fn=call_translation_api, inputs=[stt_output, language_dropdown],
                               outputs=translation_output)
        tts_button.click(fn=run_tts_and_show_next_step,
                         inputs=[translation_output, voice_dropdown, speed_slider, language_dropdown],
                         outputs=[tts_output, lipsync_button])
        lipsync_button.click(fn=call_lipsync_api,
                             inputs=[video_input, tts_output, guidance_scale, inference_steps, seed],
                             outputs=final_video_output)

    print("Gradio 应用正在启动，将允许局域网访问...")
    demo.launch(server_name="0.0.0.0", server_port=7878, share=True)
