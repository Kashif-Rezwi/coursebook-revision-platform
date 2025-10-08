/**
 * Application constants - only truly configurable values
 * Simple values are inlined where used
 */

export const CACHE_TTL = {
  SHORT: 2 * 60 * 1000,    // 2 minutes
  MEDIUM: 5 * 60 * 1000,   // 5 minutes
  LONG: 30 * 60 * 1000,    // 30 minutes
  VERY_LONG: 60 * 60 * 1000 // 1 hour
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100
} as const;

export const QUIZ_LIMITS = {
  MAX_MCQ: 20,
  MAX_SAQ: 10,
  MAX_LAQ: 5,
  DEFAULT_MCQ: 5,
  DEFAULT_SAQ: 3,
  DEFAULT_LAQ: 2
} as const;

export const FILE_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_PAGE_COUNT: 1000,
  CHUNK_SIZE: 1000,
  OVERLAP_SIZE: 200
} as const;

export const AI_LIMITS = {
  MAX_CHAT_HISTORY: 10,
  DEFAULT_CONTEXT_LIMIT: 5,
  MAX_BATCH_SIZE: 10,
  MAX_TEXT_LENGTH: 10000
} as const;

export const VALIDATION_LIMITS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
  MAX_EMAIL_LENGTH: 254
} as const;
