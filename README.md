# 多语种视频翻译系统交接说明

## 1. 项目简介

这是一个“上传/拍摄视频 → 语音识别 → 文本翻译 → 语音合成 → 视频对口型合成”的多语种视频处理系统。

当前代码仓库分为：

- `frontend/`：React + Vite 前端工作台
- `backend/`：FastAPI 后端接口
- `docker-compose.prod.yml`：生产环境 Docker Compose 编排
- `nginx.conf`：前端容器内 Nginx 配置，负责 HTTPS、静态资源和 `/api` 反向代理
- `deploy/DEPLOY_DOCKER.md`：较简版 Docker 部署说明

系统主要能力：

1. 上传本地视频，或直接调用浏览器摄像头录制视频
2. 提取视频音频并做语音识别（STT）
3. 将识别文本翻译为目标语言
4. 生成目标语言语音（支持标准音色 / 克隆音色）
5. 通过 PixVerse 进行唇形同步，输出最终视频

---

## 2. 技术架构

### 前端

- 框架：React 19 + TypeScript + Vite
- 主要作用：
  - 上传/录制视频
  - 展示识别、翻译、音色、合成流程
  - 调用后端接口
  - 在浏览器 `localStorage` 中保存 API Key 和项目记录

### 后端

- 框架：FastAPI
- 主要作用：
  - 接收视频上传
  - 抽取音频、统一视频格式
  - 调用第三方 STT / 翻译 / TTS / 唇形同步服务
  - 提供生成文件访问和删除接口

### 生产部署

生产环境默认是 **两个容器**：

1. `voice-backend`
2. `voice-frontend`

其中：

- 前端容器监听 `443`
- 宿主机端口映射为 `4006:443`
- `nginx.conf` 负责把 `/api/` 和 `/files/` 转发给后端容器
- SSL 证书从宿主机 `/root/ssl` 挂载进前端容器

---

## 3. 目录说明

```text
.
├── backend/                    # FastAPI 后端
│   ├── app/
│   │   ├── api/endpoints.py    # 接口定义
│   │   ├── core/config.py      # 环境变量与系统配置
│   │   ├── schemas/            # 请求/响应模型
│   │   └── services/           # STT/TTS/翻译/媒体处理逻辑
│   ├── tests/                  # 后端测试
│   ├── requirements.txt        # Python 依赖
│   ├── Dockerfile              # 后端镜像构建
│   └── .env.production.example # 生产环境变量模板
├── frontend/                   # React 前端
│   ├── components/             # 页面组件
│   ├── App.tsx                 # 主界面入口
│   ├── api.ts                  # 前端接口封装
│   ├── constants.ts            # 语言、音色等常量
│   ├── package.json            # Node 依赖与脚本
│   └── Dockerfile              # 前端镜像构建
├── deploy/
│   └── DEPLOY_DOCKER.md        # 原始部署文档
├── docker-compose.prod.yml     # 生产编排文件
├── nginx.conf                  # Nginx 配置
└── README.md                   # 当前交接文档
```

---

## 4. 运行依赖与外部服务

本系统不是纯离线运行，依赖以下外部能力：

### 4.1 必需的第三方接口

1. **SiliconFlow**
   - 用途：语音识别（STT）+ 文本翻译
   - 变量：`STT_API_KEY`

2. **MiniMax**
   - 用途：标准音色 TTS
   - 变量：
     - `MINIMAX_GROUP_ID`
     - `MINIMAX_API_KEY`

3. **PixVerse**
   - 用途：唇形同步（Lip Sync）
   - 变量：
     - `PIXVERSE_API_BASE_URL`
     - `PIXVERSE_API_KEY`
     - `PIXVERSE_POLL_INTERVAL_SECONDS`
     - `PIXVERSE_POLL_TIMEOUT_SECONDS`
     - `PIXVERSE_HTTP_RETRIES`
     - `PIXVERSE_HTTP_BACKOFF_SECONDS`

### 4.2 可选 / 特殊依赖

4. **IndexTTS 本地工程**
   - 用途：克隆音色模式
   - 当前后端代码会尝试在仓库根目录下寻找 `indextts2/`，并调用其中的 Python 环境与推理脚本。
   - 如果不需要“克隆音色”，可以只保留标准音色链路。
   - 如果需要克隆音色，请确认：
     - 根目录存在 `indextts2/`
     - 其中模型和 `.venv` 环境完整可用

5. **FFmpeg**
   - 用途：视频格式统一、音频提取
   - Docker 镜像中已安装
   - 本地开发时也需要系统安装

---

## 5. 环境变量配置

### 5.1 后端环境变量

生产环境模板文件：`backend/.env.production.example`

建议新机器部署时：

```bash
cp backend/.env.production.example backend/.env.production
```

然后填写真实值。

示例字段如下：

```env
STT_API_KEY=your_siliconflow_api_key
MINIMAX_GROUP_ID=your_minimax_group_id
MINIMAX_API_KEY=your_minimax_api_key

PIXVERSE_API_BASE_URL=https://app-api.pixverse.ai
PIXVERSE_API_KEY=your_pixverse_api_key
PIXVERSE_POLL_INTERVAL_SECONDS=5
PIXVERSE_POLL_TIMEOUT_SECONDS=300
PIXVERSE_HTTP_RETRIES=2
PIXVERSE_HTTP_BACKOFF_SECONDS=1.0

CORS_ALLOW_ORIGINS=https://你的域名:4006
```

### 5.2 关键说明

- `CORS_ALLOW_ORIGINS` 支持逗号分隔多个来源。
- 后端代码会读取：
  - 进程环境变量
  - `backend/.env`
- Docker Compose 生产启动时使用的是 `backend/.env.production`。
- 如果线上修改了 `.env.production`，需要重建或重启容器使其生效。

### 5.3 前端环境变量

前端真正使用的变量是：

- `VITE_API_ORIGIN`

用途：指定前端请求哪个 API 域名，例如：

```bash
export VITE_API_ORIGIN=https://demo.ybystds.com:4006
```

前端构建时会把这个变量注入进去。

> 注意：`frontend/.env.local` 里现在还有一个 `GEMINI_API_KEY` 占位字段，这是历史遗留内容，当前主流程代码没有实际使用。

---

## 6. 本地开发启动方式

## 6.1 后端本地启动

建议在 `backend/` 目录创建虚拟环境：

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

启动后接口文档默认可访问：

- `http://127.0.0.1:8000/docs`

### 6.2 前端本地启动

```bash
cd frontend
npm install
VITE_API_ORIGIN=http://127.0.0.1:8000 npm run dev
```

Vite 默认会启动在本地开发端口（通常是 `5173`）。

### 6.3 本地联调说明

前端请求逻辑定义在 `frontend/api.ts`：

- 默认优先读 `VITE_API_ORIGIN`
- 未配置时，会回退到 `当前页面协议 + 当前域名 + :8000`

因此本地联调最稳妥的做法是显式设置：

```bash
VITE_API_ORIGIN=http://127.0.0.1:8000
```

---

## 7. Docker 生产部署方式

## 7.1 前置准备

### 1）准备环境变量

```bash
cp backend/.env.production.example backend/.env.production
```

填入真实 API Key。

### 2）准备证书

当前配置约定宿主机证书目录是：

```text
/root/ssl/fullchain.pem
/root/ssl/privkey.pem
```

前端容器挂载位置：

```text
/etc/nginx/ssl/fullchain.pem
/etc/nginx/ssl/privkey.pem
```

### 3）准备 Docker / Docker Compose

需要服务器已安装：

- Docker
- Docker Compose（或新版 `docker compose` 插件）

## 7.2 启动命令

在仓库根目录执行：

```bash
export VITE_API_ORIGIN=https://你的域名:4006
docker compose -f docker-compose.prod.yml up -d --build
```

## 7.3 查看运行状态

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

## 7.4 对外访问地址

默认约定：

- 前端首页：`https://你的域名:4006`
- 健康检查：`https://你的域名:4006/health`
- 后端接口文档：`https://你的域名:4006/api/docs`（注意：当前 Nginx 只转发 `/api/`，如果接口文档访问异常，需要核对 FastAPI 文档路径与代理路径）
- 文件访问：`https://你的域名:4006/files/<filename>`

## 7.5 停止服务

```bash
docker compose -f docker-compose.prod.yml down
```

## 7.6 更新发布

```bash
git pull
export VITE_API_ORIGIN=https://你的域名:4006
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 8. 系统操作说明（给运营 / 使用人）

前端页面是一个标准处理流程，建议按以下顺序操作。

### 步骤 1：上传或拍摄视频

- 支持本地上传视频文件
- 支持浏览器直接打开摄像头录制视频
- 上传成功后，前端会拿到后端返回的 `video_path`

### 步骤 2：分析视频语音

点击“分析”后，系统会：

1. 从视频中提取音频
2. 调用 STT 接口识别文本
3. 将识别结果回填到页面文本框中

### 步骤 3：翻译文案

- 选择目标语言
- 点击翻译
- 系统调用翻译接口返回目标语言文本

当前前端内置语言包含：

- 英语
- 泰语
- 马来语
- 越南语
- 俄语
- 日语
- 韩语
- 法语
- 德语
- 西班牙语
- 阿拉伯语

后端还额外支持：

- 中文
- 印尼语
- 意大利语

如需在前端显示更多语言，需要同步修改 `frontend/constants.ts`。

### 步骤 4：生成语音

有两种模式：

#### A. 标准音色

调用 MiniMax TTS，前端目前内置若干音色，例如：

- 标准男声
- 标准女声
- 磁性男声
- 温柔女声
- 成熟女声
- 活力女声

#### B. 克隆音色

- 上传参考音频 / 视频
- 后端会抽取参考音频
- 通过 IndexTTS 生成克隆声音

> 如果克隆音色不可用，优先检查 `indextts2/` 工程及其依赖是否存在。

### 步骤 5：开始合成

点击“开始合成”后：

1. 前端将原视频路径与生成音频路径发送给后端
2. 后端上传媒体到 PixVerse
3. 后端轮询合成结果
4. 成功后返回最终视频路径
5. 前端展示最终成片

---

## 9. 当前接口概览

后端路由前缀：`/api/v1`

主要接口：

- `POST /api/v1/upload`：上传视频
- `POST /api/v1/process-video`：提取音频并做 STT
- `POST /api/v1/translate`：文本翻译
- `POST /api/v1/tts`：标准音色语音生成
- `POST /api/v1/tts/clone`：克隆音色语音生成
- `POST /api/v1/lipsync`：唇形同步生成视频
- `POST /api/v1/delete-file`：删除已生成文件

静态文件访问：

- `/files/<filename>`

---

## 10. 数据与文件说明

### 10.1 临时文件目录

系统会在 `temp_audio` 目录保存中间文件和产物，例如：

- 上传后的原视频
- 提取出的音频
- TTS 生成音频
- 唇形同步后的成片

### 10.2 本地与 Docker 下的差异

- 本地运行时，后端临时目录通常是：`backend/temp_audio`
- Docker 运行时，后端工作目录是 `/app`，临时目录为：`/app/temp_audio`
- 生产 Compose 已把这个目录挂成命名卷：`temp_audio_data`

### 10.3 前端本地存储

前端会在浏览器 `localStorage` 中保存：

- `G_SYNC_STT_KEY`
- `G_SYNC_MINI_KEY`
- `G_SYNC_PROJECTS`

这意味着：

- 更换浏览器或清理缓存后，前端本地记录会丢失
- 这些内容不是服务端持久化数据

---

## 11. 常见运维操作

### 11.1 查看容器日志

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### 11.2 重启服务

```bash
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart frontend
```

### 11.3 清理临时文件

如磁盘占用变大，可进入后端容器或数据卷清理 `temp_audio` 中的历史文件。

注意：

- 清理前确认没有正在执行的任务
- 不要误删仍需回看的成片

### 11.4 检查接口健康

```bash
curl -k https://你的域名:4006/health
```

---

## 12. 常见问题排查

### 12.1 上传成功，但分析失败

优先排查：

- 后端日志是否有 FFmpeg 报错
- 上传文件格式是否异常
- `temp_audio` 目录是否可写
- STT API Key 是否失效

### 12.2 翻译失败

优先排查：

- `STT_API_KEY` 是否有效
- SiliconFlow 接口是否可访问
- 网络是否可出公网

### 12.3 标准音色生成失败

优先排查：

- `MINIMAX_GROUP_ID`
- `MINIMAX_API_KEY`
- 目标语言是否在后端映射表中

### 12.4 克隆音色失败

优先排查：

- `indextts2/` 是否存在
- `indextts2/.venv` 是否可用
- 模型文件是否完整
- 参考音频是否可正常提取

### 12.5 唇形同步失败

优先排查：

- `PIXVERSE_API_KEY` 是否有效
- PixVerse 账户是否开通对应能力
- 视频/音频上传是否成功
- 是否超时（默认 300 秒）

### 12.6 前端页面打不开或接口 404

优先排查：

- `VITE_API_ORIGIN` 是否配置正确
- `nginx.conf` 中 `/api/` 代理是否生效
- `docker compose ps` 中前后端容器是否都正常
- SSL 证书文件是否挂载成功

---

## 13. 交接建议 / 风险提示

### 13.1 建议优先做的事情

1. **立即更换并重新保管线上 API Key**
   - 交接前建议确认所有第三方密钥的归属与权限
   - 尽量不要把真实密钥继续保存在仓库文件中

2. **补一份正式的环境变量托管方案**
   - 例如：服务器 `.env.production` + 权限控制
   - 或接入统一配置中心 / 密钥管理服务

3. **确认克隆音色链路是否仍然需要维护**
   - 这部分依赖本地 `indextts2` 工程，维护成本高于标准音色
   - 如果业务用不到，可以考虑下线

4. **补充监控与清理机制**
   - 当前 `temp_audio` 会持续累积文件
   - 建议后续补自动清理任务

### 13.2 当前已知注意点

- 前端自带的 `frontend/README.md` 仍是旧模板说明，可忽略，以当前根目录 README 为准。
- `frontend/.env.local` 中的 `GEMINI_API_KEY` 不是现网主链路依赖。
- 部分说明文档里写了 `/api/docs`，但实际 FastAPI 默认文档路径与 Nginx 代理路径可能需要现场确认。

---

## 14. 验收建议

新同事接手后，建议至少做一轮完整验收：

1. 启动前后端
2. 上传一个测试视频
3. 跑通 STT
4. 选择一种语言完成翻译
5. 用标准音色生成音频
6. 跑一次唇形同步
7. 验证最终视频可播放
8. 检查 `/health` 与日志是否正常

如果要覆盖完整能力，再补一轮“克隆音色”验收。

---

## 15. 联系交接时建议口头补充的内容

README 解决的是“怎么跑、怎么配、怎么用”，但正式交接时建议再口头补充：

- 当前线上服务器 IP / 域名
- 证书续期方式
- 第三方 API Key 的购买主体和续费人
- 现网是否真的在使用克隆音色
- 常用测试视频样本放在哪里
- 哪些问题是历史遗留、哪些是明确待优化项

如果后续还需要，我可以继续帮你把这份 README 再整理成更正式的“交接文档版”，例如补上：

- 部署流程图
- 接口时序图
- 环境变量对照表
- 故障处理 SOP
