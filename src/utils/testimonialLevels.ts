export interface TestimonialLevel {
  rating: 1 | 2 | 3 | 4 | 5;
  emoji: string;
  labelKey: string;
}

export const TESTIMONIAL_LEVELS: TestimonialLevel[] = [
  { rating: 1, emoji: "😞", labelKey: "testimonial_level_1" },
  { rating: 2, emoji: "🙁", labelKey: "testimonial_level_2" },
  { rating: 3, emoji: "🙂", labelKey: "testimonial_level_3" },
  { rating: 4, emoji: "😃", labelKey: "testimonial_level_4" },
  { rating: 5, emoji: "🤩", labelKey: "testimonial_level_5" },
];

export function levelFor(rating: number): TestimonialLevel {
  const value = Math.min(5, Math.max(1, Math.round(Number(rating) || 1)));
  return TESTIMONIAL_LEVELS[value - 1];
}
