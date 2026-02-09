
export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type Quality = "Standard" | "High";
export type ProductContext = "LISTING" | "CONTENT_A_PLUS";

export interface Scene {
  id: number;
  title: string;
  prompt: string;
  imageUrl?: string;
  isGenerating?: boolean;
  isSuggesting?: boolean; // New state for AI Prompt suggestion
  error?: string;
}

export interface AssetData {
  data: string;
  mimeType: string;
}

export interface Assets {
  product?: AssetData;
  lid?: AssetData;
  sticker?: AssetData;
  stickerBack?: AssetData;
  box?: AssetData;
  thankYouCard?: AssetData;
}

export interface GenerationSettings {
  aspectRatio: AspectRatio;
  quality: Quality;
  productContext: ProductContext;
}
