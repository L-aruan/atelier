export interface PlatformPreset {
  id: string;
  label: string;
  category: 'ecommerce' | 'social' | 'common';
  width: number;
  height: number;
  platform: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  // E-commerce
  { id: 'taobao-main', label: '淘宝主图', category: 'ecommerce', width: 800, height: 800, platform: '淘宝' },
  { id: 'jd-main', label: '京东主图', category: 'ecommerce', width: 800, height: 800, platform: '京东' },
  { id: 'pdd-main', label: '拼多多主图', category: 'ecommerce', width: 750, height: 750, platform: '拼多多' },
  { id: 'douyin-goods', label: '抖音商品图', category: 'ecommerce', width: 750, height: 1000, platform: '抖音' },
  { id: 'taobao-detail', label: '淘宝详情', category: 'ecommerce', width: 750, height: 1000, platform: '淘宝' },

  // Social media
  { id: 'xiaohongshu', label: '小红书', category: 'social', width: 1080, height: 1440, platform: '小红书' },
  { id: 'bilibili-cover', label: 'B站封面', category: 'social', width: 1920, height: 1080, platform: 'B站' },
  { id: 'douyin-cover', label: '抖音封面', category: 'social', width: 1080, height: 1920, platform: '抖音' },
  { id: 'wechat-cover', label: '公众号封面', category: 'social', width: 900, height: 500, platform: '微信' },
  { id: 'weibo', label: '微博配图', category: 'social', width: 1200, height: 900, platform: '微博' },

  // Common ratios
  { id: 'square', label: '1:1 正方形', category: 'common', width: 1, height: 1, platform: '' },
  { id: 'landscape-4-3', label: '4:3 横版', category: 'common', width: 4, height: 3, platform: '' },
  { id: 'landscape-16-9', label: '16:9 横版', category: 'common', width: 16, height: 9, platform: '' },
  { id: 'portrait-3-4', label: '3:4 竖版', category: 'common', width: 3, height: 4, platform: '' },
  { id: 'portrait-9-16', label: '9:16 竖版', category: 'common', width: 9, height: 16, platform: '' },
];

export const PRESET_CATEGORIES = [
  { id: 'ecommerce', label: '电商平台' },
  { id: 'social', label: '社交媒体' },
  { id: 'common', label: '通用比例' },
] as const;
