const {
  isValidDateString,
  normalizePriority,
  normalizeName,
  normalizeSortBy,
  normalizeSortOrder,
  db,
} = require('../src/app');

afterAll(() => {
  if (db) {
    db.close();
  }
});

describe('Backend utility functions', () => {
  describe('isValidDateString', () => {
    it('validates ISO date format', () => {
      expect(isValidDateString('2026-02-19')).toBe(true);
      expect(isValidDateString('2026-2-19')).toBe(false);
      expect(isValidDateString('invalid')).toBe(false);
      expect(isValidDateString(null)).toBe(false);
      expect(isValidDateString('2026-02-30')).toBe(false);
    });
  });

  describe('normalizePriority', () => {
    it('normalizes valid priorities', () => {
      expect(normalizePriority('HIGH')).toBe('high');
      expect(normalizePriority(' medium ')).toBe('medium');
      expect(normalizePriority('low')).toBe('low');
    });

    it('rejects invalid priorities', () => {
      expect(normalizePriority('urgent')).toBeNull();
      expect(normalizePriority(undefined)).toBeNull();
    });
  });

  describe('normalizeName', () => {
    it('returns trimmed non-empty names', () => {
      expect(normalizeName('  Task  ')).toBe('Task');
    });

    it('returns null for invalid values', () => {
      expect(normalizeName('   ')).toBeNull();
      expect(normalizeName(123)).toBeNull();
    });
  });

  describe('sort normalizers', () => {
    it('uses allowed sort values with safe fallbacks', () => {
      expect(normalizeSortBy('priority')).toBe('priority');
      expect(normalizeSortBy('unknown')).toBe('created_at');
      expect(normalizeSortOrder('asc')).toBe('asc');
      expect(normalizeSortOrder('unknown')).toBe('desc');
    });
  });
});