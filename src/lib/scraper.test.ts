/**
 * Test suite for web scraper functions
 * 
 * @description Tests for scraping scoreboard and site details from a web performance scoreboard
 */

import { describe, it, expect } from 'vitest'
import { scrapeScoreboard, scrapeSiteDetails } from './scraper'

/**
 *  Test a string to see if it is a valid URL
 * @param url - The URL string to test
 * @returns boolean
 */
function testUrl(url: string) {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}


/**
 * Tests for Scoreboard Scraper
 * @description Tests for the scrapeScoreboard function
 */
describe('scrapeScoreboard()',  async () => {
  const results = await scrapeScoreboard()

  it('returns a list of sites', () => {
    expect(results.length).toBeGreaterThanOrEqual(290)
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

/**
 * Tests for Site Details Scraper
 * @description Tests for the scrapeSiteDetails function
 */
describe('scrapeSiteDetails()', async () => {
  const result = await scrapeSiteDetails(process.env.TARGET_SITE_URL!)

  it('returns a valid url string', () => {
    expect(typeof result.url).toBe('string')
    expect(result.url.length).toBeGreaterThan(0)
    expect(testUrl(result.url)).toBe(true)
  })

  it('returns a categories object with numeric scores', () => {
    expect(Object.keys(result.categories).length).toEqual(4)

    const categoryNames = Object.keys(result.categories)
    const expectedCategories = ['Tillgänglighet', 'Hastighet', 'Webbstandard', 'Integritet & säkerhet']

    categoryNames.forEach(name => {
      // console.log(name);
      expect(expectedCategories.includes(name)).toBe(true)
    });

    for (const score of Object.values(result.categories)) {
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(5)
    }
  })

  it('returns a non-empty testsData object with numeric scores', () => {
    expect(Object.keys(result.testsData).length).toEqual(16)
    const expectedTests = [
      'HTTP & tekniktest',
      'Webbprestanda enligt Sitespeed.io',
      'Mjukvara',
      'E-post',
      'Spårning och integritet',
      'HTTP statuskod 404',
      'Energieffektivitet',
      'Standardfiler',
      'Tillgänglighet enligt Pa11y',
      'HTML',
      'CSS',
      'Integritetstest med Webbkoll',
      'Sökmotoroptimering (SEO) enligt Google Lighthouse',
      'Följs praxis enligt Google Lighthouse',
      'Webbprestanda enligt Google Lighthouse',
      'Tillgänglighet enligt Axe'
    ]
    const testNames = Object.keys(result.testsData)
    testNames.forEach(name => {
      // console.log(name);
      expect( expectedTests.includes(name)).toBe(true)
    })

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
