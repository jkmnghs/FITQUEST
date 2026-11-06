import { describe, it, expect } from 'vitest';
import { findFoodReference } from '../foodReference';

describe('findFoodReference', () => {
  it('matches plain staples', () => {
    expect(findFoodReference('White rice', 'steamed')?.calories).toBe(130);
    expect(findFoodReference('Grilled chicken breast', 'grilled')?.protein).toBe(31);
    expect(findFoodReference('Fried egg', 'fried')).not.toBeNull();
    expect(findFoodReference('Protein shake', '')).not.toBeNull();
  });

  it('keeps a plain staple beside a sauced dish', () => {
    expect(findFoodReference('Rice', 'adobo')?.calories).toBe(130);
  });

  it.each([
    ['Garlic Fried Rice', 'fried'],
    ['Egg fried rice', 'fried'],
    ['Sinangag', 'fried'],
    ['Rice cake', ''],
    ['Rice noodles', 'boiled'],
    ['Potato chips', ''],
    ['French fries', 'deep-fried'],
    ['Banana cue', 'fried'],
    ['Milk tea', ''],
    ['Orange juice', ''],
    ['Orange chicken', 'fried'],
    ['Dried mango', ''],
    ['Garlic bread', 'toasted'],
    ['Tuna mayo sandwich', ''],
  ])('gives no plain-item value for %s', (name, method) => {
    expect(findFoodReference(name, method)).toBeNull();
  });
});
