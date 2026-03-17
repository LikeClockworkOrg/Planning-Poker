export const FIBONACCI_VALUES = [1, 2, 3, 5, 8, 13, 21] as const;
export type FibonacciValue = (typeof FIBONACCI_VALUES)[number];

export const ROOM_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

export const ROOM_TTL_SECONDS = 24 * 60 * 60; // 24 hours
export const MAX_PARTICIPANTS = 50;
export const MAX_DISPLAY_NAME_LENGTH = 30;
export const MAX_TOPIC_LENGTH = 200;
