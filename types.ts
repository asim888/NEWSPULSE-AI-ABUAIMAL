// Using const enum for better performance and tree-shaking
export const enum Category {
  AZAD_STUDIO = 'Azad Studio',
  HYDERABAD = 'Hyderabad',
  TELANGANA = 'Telangana',
  INDIA = 'India',
  INTERNATIONAL = 'International',
  SPORTS = 'Sports',
  FOUNDERS = 'Founders'
}

export interface Article {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  imageUrl?: string;
  description: string;
  summaryShort?: string;
  descriptionRomanUrdu?: string;
  descriptionUrdu?: string;
  descriptionHindi?: string;
  descriptionTelugu?: string;
  content?: string;
  category: Category;
  url: string;
}

export interface EnhancedArticleContent {
  fullArticle: string;
  summaryShort: string;
  summaryRomanUrdu: string;
  summaryUrdu: string;
  summaryHindi: string;
  summaryTelugu: string;
  fullArticleRomanUrdu?: string;
  fullArticleUrdu?: string;
  fullArticleHindi?: string;
  fullArticleTelugu?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
}

export interface UserState {
  hasEntered: boolean;
  isPremium: boolean;
  viewedArticles: string[];
}

export type SubscriptionPlan = 'free' | 'trial' | 'premium';

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  expiry: number | null;
  autoRenew: boolean;
}

export interface ToastMessage {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

// Add environment variable types for Vite
export interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GOOGLE_AI_KEY: string;
  readonly VITE_APP_TITLE: string;
  readonly MODE: 'development' | 'production';
}

export interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Helper function to safely access environment variables
export const getEnv = (key: keyof ImportMetaEnv): string => {
  if (import.meta.env[key] === undefined) {
    console.warn(`Environment variable ${key} is not defined`);
    return '';
  }
  return import.meta.env[key] as string;
};
