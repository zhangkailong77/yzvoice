import { Language, Voice } from './types';

export const LANGUAGES: Language[] = [
  { name: "English", code: "英语", flag: "🇺🇸" },
  { name: "Thai", code: "泰语", flag: "🇹🇭" },
  { name: "Malay", code: "马来语", flag: "🇲🇾" },
  { name: "Vietnamese", code: "越南语", flag: "🇻🇳" },
  { name: "Russian", code: "俄语", flag: "🇷🇺" },
  { name: "Japanese", code: "日语", flag: "🇯🇵" },
  { name: "Korean", code: "韩语", flag: "🇰🇷" },
  { name: "French", code: "法语", flag: "🇫🇷" },
  { name: "German", code: "德语", flag: "🇩🇪" },
  { name: "Spanish", code: "西班牙语", flag: "🇪🇸" },
  { name: "Arabic", code: "阿拉伯语", flag: "🇸🇦" },
];

export const VOICES: Voice[] = [
  { id: "presenter_male", name: "标准男声", gender: "male", style: "通用", avatarSeed: "alex" },
  { id: "presenter_female", name: "标准女声", gender: "female", style: "通用", avatarSeed: "sarah" },
  { id: "junlang_nanyou", name: "磁性男声", gender: "male", style: "深情", avatarSeed: "james" },
  { id: "danya_xuejie", name: "温柔女声", gender: "female", style: "亲切", avatarSeed: "emily" },
  { id: "female-chengshu", name: "成熟女声", gender: "female", style: "商务", avatarSeed: "anna" },
  { id: "female-shaonv-jingpin", name: "活力女声", gender: "female", style: "活泼", avatarSeed: "lisa" },
  { id: "danya_xue_jie", name: "淡雅学姐", gender: "female", style: "自然", avatarSeed: "olivia" },
  { id: "Chinese (Mandarin)_Reliable_Executive", name: "沉稳高管", gender: "male", style: "商务", avatarSeed: "william" },
  { id: "Chinese (Mandarin)_News_Anchor", name: "新闻女声", gender: "female", style: "播报", avatarSeed: "grace" },
  // { id: "Chinese (Mandarin)_Mature_Woman", name: "傲娇御姐", gender: "female", style: "成熟", avatarSeed: "victoria" },
  // { id: "Chinese (Mandarin)_Unrestrained_Young_Man", name: "不羁青年", gender: "male", style: "活力", avatarSeed: "ethan" },
  // { id: "Arrogant_Miss", name: "嚣张小姐", gender: "female", style: "个性", avatarSeed: "zoe" },
  // { id: "Robot_Armor", name: "机械战甲", gender: "male", style: "科幻", avatarSeed: "atlas" },
  // { id: "Chinese (Mandarin)_Kind-hearted_Auntie", name: "热心大婶", gender: "female", style: "亲和", avatarSeed: "martha" },
  // { id: "Chinese (Mandarin)_HK_Flight_Attendant", name: "港普空姐", gender: "female", style: "港风", avatarSeed: "vivian" },
  // { id: "nanzhi_voice_0817", name: "克隆音色", gender: "male", style: "独特", avatarSeed: "david" },
];

export const PROCESSING_STEPS = [
  "初始化音频引擎...",
  "提取源视频音轨...",
  "音频降噪处理...",
  "对齐面部特征点...",
  "生成唇形网格...",
  "渲染视频帧...",
  "合成最终视频流..."
];
