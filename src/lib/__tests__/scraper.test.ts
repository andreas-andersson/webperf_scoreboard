/**
 * Test suite for web scraper functions
 * 
 * @description Tests for scraping scoreboard and site details from a web performance scoreboard
 */

/**
 * Tests for scrapeScoreboard function
 * Verifies that the function correctly scrapes a list of sites from the scoreboard
 */

/**
 * Tests for scrapeSiteDetails function
 * Verifies that the function correctly extracts detailed information about a specific site
 */

/**
 * Timeout value in milliseconds for async test operations
 * @constant {number} 30_000
 * @description Set to 30 seconds (30,000 ms) to allow sufficient time for network requests
 * and DOM parsing operations during web scraping tests. This is necessary because web scraping
 * can be slower than typical unit tests due to network latency and page load times.
 */
import { describe, it, expect } from 'vitest'
import { scrapeScoreboard, scrapeSiteDetails } from '../scraper'

describe('scrapeScoreboard()',  async () => {
  const results = await scrapeScoreboard()

  it('returns a list of sites', () => {
    expect(results.length).toBeGreaterThan(280)
  })

  it('each site has a non-empty name', () => {
    expect(results.every(r => typeof r.name === 'string' && r.name.length > 0)).toBe(true)
  })

  it('each site has a numeric totalScore between 0 and 5', () => {
    expect(results.every(r => typeof r.totalScore === 'number' && r.totalScore >= 0 && r.totalScore <= 5)).toBe(true)
  })

  it('each site has a detailsUrl starting with TARGET_BOARD_URL', () => {
    const base = new URL(process.env.TARGET_BOARD_URL!).origin
    expect(results.every(r => r.detailsUrl.startsWith(base))).toBe(true)
  })
})

describe('scrapeSiteDetails()', async () => {
  const result = await scrapeSiteDetails(process.env.TARGET_SITE_URL!)

  it('returns a url string', () => {
    expect(typeof result.url).toBe('string')
    expect(result.url.length).toBeGreaterThan(0)
  })

  it('returns a non-empty categories object with numeric scores', () => {
    expect(Object.keys(result.categories).length).toBeGreaterThanOrEqual(4)
    for (const score of Object.values(result.categories)) {
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(5)
    }
  })

  it('returns a non-empty testsData object with numeric scores', () => {
    expect(Object.keys(result.testsData).length).toBeGreaterThanOrEqual(15)
    for (const score of Object.values(result.testsData)) {
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(5)
    }
  })

  it('category names do not contain trailing colons', () => {
    expect(Object.keys(result.categories).every(k => !k.endsWith(':'))).toBe(true)
  })
})
