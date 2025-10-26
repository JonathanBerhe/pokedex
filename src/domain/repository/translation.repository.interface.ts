import { TranslationType } from "../model/translation.model";

export interface ITranslationRepository {
  translate(
    text: string,
    type: TranslationType,
  ): Promise<string | null>
}

export const TRANSLATION_REPOSITORY_TOKEN = Symbol('ITranslationRepository');
