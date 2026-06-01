export type EcommerceProvider = 'packy' | 'openai' | 'volcengine' | 'aliyun';

export type EcommercePlatform = 'taobao' | 'douyin' | 'xiaohongshu' | 'pdd' | 'general';

export type EcommerceLanguage = 'zh-CN' | 'en';

export type DetailPageType =
  | 'hero'
  | 'value'
  | 'scene'
  | 'structure'
  | 'material'
  | 'specs'
  | 'accessories'
  | 'usage';

export interface DetailHotspot {
  label: string;
  description: string;
  x: number;
  y: number;
}

export interface DetailPagePlan {
  id: string;
  type: DetailPageType;
  title: string;
  subtitle: string;
  scenePrompt: string;
  productInstruction: string;
  bullets: string[];
  hotspots: DetailHotspot[];
  imageBase64?: string;
  imageAssetId?: string;
  imageUrl?: string;
}

export interface EcommerceDetailResult {
  productSummary: string;
  pages: DetailPagePlan[];
  jobId?: string;
}

export interface EcommerceReferenceImage {
  storageKey: string;
  mimeType: string;
  fileName?: string;
  size?: number;
}

export interface EcommerceDetailRequest {
  productName: string;
  sellingPoints?: string;
  platform: EcommercePlatform;
  language: EcommerceLanguage;
  style: 'professional' | 'warm' | 'premium' | 'minimal';
  imageQuality: 'low' | 'medium' | 'high' | 'auto';
  pageCount: number;
  provider: EcommerceProvider;
  apiKey?: string;
  images?: string[];
  referenceImages?: EcommerceReferenceImage[];
}
