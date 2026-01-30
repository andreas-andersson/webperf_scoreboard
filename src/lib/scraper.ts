import * as cheerio from 'cheerio';
import { scoreTextToFloat } from './utils';

interface ScrapedSite {
  url?: string;
  name: string;
  totalScore: number;
  detailsUrl: string; // URL to the specific tests page for this site
  categories?: Record<string, number>;
  testsData?: Record<string, number>;
}

// TODO: Replace with the actual URL of the scoreboard you want to scrape
const TARGET_BOARD_URL = process.env.TARGET_BOARD_URL || ''; 

if (!TARGET_BOARD_URL) {
  throw new Error("TARGET_BOARD_URL is not defined in environment variables");
} 

export async function scrapeScoreboard() {
  console.log(`Fetching ${TARGET_BOARD_URL}...`);
  // In a real scenario, you might need headers or cookies
  const response = await fetch(TARGET_BOARD_URL);
  const html = await response.text();
  const $ = cheerio.load(html);

  const results: ScrapedSite[] = [];

  // TODO: Update these selectors based on the actual HTML structure of the target site
  // This is a hypothetical example
  $('main#content table.table tbody tr').each((_, element) => {
    const linkEl = $(element).find('a');
    const name = linkEl.text().trim();
    const detailsUrl = linkEl.attr('href') || '';
    const scoreText = $(element).find('td').eq(2).text().trim();
    const totalScore = scoreTextToFloat(scoreText);

    if (name && detailsUrl) {
      results.push({
        name,
        totalScore,
        detailsUrl: new URL(detailsUrl, TARGET_BOARD_URL).toString(),
      });
    }
  });

  return results;
}

export async function scrapeSiteDetails(detailsUrl: string) {
    console.log(`Fetching details from ${detailsUrl}...`);
    const response = await fetch(detailsUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    /**
     * Find the category scores table and extract scores and the site url
     */
    const rows = $('main#content table.table tbody tr');
    const url = rows.find('td').eq(0).text().trim();

    const catStartIndex = 4;
    const catEndIndex = rows.length - 1;

    const categories: Record<string, number> = {};
    const testsData: Record<string, number> = {};

    for (let i = catStartIndex; i < catEndIndex; i++) {
        const categoryName = rows.eq(i).find('th').text().trim().replace(':', '');
        const categoryScoreText = rows.eq(i).find('td').text().trim();
        const categoryScore = scoreTextToFloat(categoryScoreText);

        categories[categoryName] = categoryScore;
    }

    /**
     * Find individual test results
     */
    $('main#content ol.linklist li').each((_, element) => {
        const testName = $(element).find('a').text().trim();
        const testResultText = $(element).find('span').text().trim();
        const testResult = scoreTextToFloat(testResultText);

        testsData[testName] = testResult;
    });

    return { categories, testsData, url };
}
