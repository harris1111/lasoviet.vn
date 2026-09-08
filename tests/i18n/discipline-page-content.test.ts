import { describe, expect, it } from 'vitest';

import {
  DISCIPLINE_KEYS,
  getDisciplineContent,
  type DisciplineKey,
} from '../../apps/web/src/features/discipline-pages/discipline-page-content';

describe('discipline page content and i18n contract', () => {
  it('defines all 4 flagship discipline keys', () => {
    expect(DISCIPLINE_KEYS).toEqual(['bat-tu', 'kinh-dich', 'chiem-tinh', 'than-so-hoc']);
  });

  it('provides structural parity between VI and EN for every discipline', () => {
    for (const key of DISCIPLINE_KEYS) {
      const vi = getDisciplineContent(key, 'vi');
      const en = getDisciplineContent(key, 'en');

      expect(vi, `VI content must exist for ${key}`).toBeDefined();
      expect(en, `EN content must exist for ${key}`).toBeDefined();

      // Hero section parity
      expect(vi.hero.title).toBeTruthy();
      expect(en.hero.title).toBeTruthy();
      expect(vi.hero.eyebrow).toBeTruthy();
      expect(en.hero.eyebrow).toBeTruthy();
      expect(vi.hero.previewDisclaimer).toBeTruthy();
      expect(en.hero.previewDisclaimer).toBeTruthy();

      // Free items
      expect(vi.freeValue.items.length).toBeGreaterThan(0);
      expect(en.freeValue.items.length).toBe(vi.freeValue.items.length);

      // Glossary
      expect(vi.glossary.items.length).toBeGreaterThan(0);
      expect(en.glossary.items.length).toBe(vi.glossary.items.length);

      // Method rows
      expect(vi.method.rows.length).toBeGreaterThan(0);
      expect(en.method.rows.length).toBe(vi.method.rows.length);

      // Limitations
      expect(vi.limitations.items.length).toBeGreaterThan(0);
      expect(en.limitations.items.length).toBe(vi.limitations.items.length);

      // FAQ
      expect(vi.knowledgeFaq.faqs.length).toBeGreaterThan(0);
      expect(en.knowledgeFaq.faqs.length).toBe(vi.knowledgeFaq.faqs.length);

      // Required illustrative disclaimer
      expect(vi.sampleResult.disclosure).toBeTruthy();
      expect(en.sampleResult.disclosure).toBeTruthy();
    }
  });

  it('rejects unknown discipline keys with an error or undefined', () => {
    // @ts-expect-error testing invalid key
    expect(() => getDisciplineContent('unknown-discipline', 'vi')).toThrow();
  });
});
