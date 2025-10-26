/**
 * FunTranslations API response
 */
export interface FunTranslationsResponse {
  success: {
    total: number;
  };
  contents: {
    translated: string;
    text: string;
    translation: string;
  };
}

/**
 * Translation type
 */
export enum TranslationType {
  SHAKESPEARE = 'shakespeare',
  YODA = 'yoda',
}
