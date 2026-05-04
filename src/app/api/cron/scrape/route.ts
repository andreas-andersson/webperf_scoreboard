import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { scrapeScoreboard, scrapeSiteDetails } from '@/lib/scraper';
import { upsertSite, createScan } from '@/lib/site.service';

export const maxDuration = 300; // Allow 5 minutes for scraping if there are many sites

export async function GET(request: Request) {
    // Basic auth check for cron (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (
        process.env.NODE_ENV !== 'development' &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {

        console.log('Starting scheduled scrape...');
        const scrapedSites = await scrapeScoreboard();
        console.log(`Found ${scrapedSites.length} sites to process.`);

        for (const siteData of scrapedSites) {

            let categories: Record<string, number> = {};
            let testsData: Record<string, number> = {};

            try {
                const details = await scrapeSiteDetails(siteData.detailsUrl);
                categories = details.categories;
                testsData = details.testsData;
                siteData.url = details.url;
            } catch (e) {
                console.error(`Failed to scrape details for ${siteData.name}`, e);

                // Proceed without details
                continue
            }

            const urlWithoutProtocol = siteData.url.replace(/^https?:\/\//, '');
            const siteId = await upsertSite(urlWithoutProtocol, siteData.name);
            await createScan({ siteId, totalScore: siteData.totalScore, categories, testsData });
        }

        revalidateTag('leaderboard');
        revalidateTag('site');

        return NextResponse.json({ success: true, sitesProcessed: scrapedSites.length });
    } catch (error) {
        console.error('Scrape failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
