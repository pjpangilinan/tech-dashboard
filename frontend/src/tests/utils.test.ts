import { describe, it, expect } from 'vitest';
import { formatTimeAgo, getSourceConfig } from '../components/ArticleCard';

describe('formatTimeAgo', () => {
  it('returns "Recently" for null date', () => {
    expect(formatTimeAgo(null)).toBe('Recently');
  });

  it('returns minutes ago for recent dates', () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatTimeAgo(fiveMinsAgo)).toBe('5m');
  });

  it('returns hours ago for dates within 24 hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(threeHoursAgo)).toBe('3h');
  });

  it('returns days ago for dates within a week', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(twoDaysAgo)).toBe('2d');
  });

  it('returns formatted date for older dates', () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatTimeAgo(oldDate);
    expect(result).toMatch(/[A-Za-z]+ \d+/);
  });
});

describe('getSourceConfig', () => {
  it('returns Hacker News config', () => {
    const config = getSourceConfig('Hacker News');
    expect(config.icon).toBe('Y');
    expect(config.bg).toContain('ff6600');
  });

  it('returns The Verge config', () => {
    const config = getSourceConfig('The Verge');
    expect(config.icon).toBe('V');
    expect(config.bg).toContain('d32f2f');
  });

  it('returns default config for unknown sources', () => {
    const config = getSourceConfig('Unknown Source');
    expect(config.icon).toBe('UN');
    expect(config.bg).toContain('gradient-accent');
  });
});