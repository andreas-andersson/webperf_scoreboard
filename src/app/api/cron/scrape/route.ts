import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { scrapeScoreboard, scrapeSiteDetails } from '@/lib/scraper';
import { upsertSite, upsertSiteScores, upsertSiteTests } from '@/lib/site.service';

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
            let tests: { name: string; score: number; testedAt: string }[] = [];
            let dateModified: string | undefined;

            try {
                const details = await scrapeSiteDetails(siteData.detailsUrl);
                categories = details.categories;
                tests = details.tests;
                dateModified = details.dateModified;
                siteData.url = details.url;
            } catch (e) {
                console.error(`Failed to scrape details for ${siteData.name}`, e);

                // Proceed without details
                continue
            }

            const urlWithoutProtocol = siteData.url.replace(/^https?:\/\//, '');
            const siteId = await upsertSite(urlWithoutProtocol, siteData.name);

            await upsertSiteScores(
                siteId,
                { Totalbetyg: siteData.totalScore, ...categories },
                dateModified ? new Date(dateModified) : new Date(),
            );
            await upsertSiteTests(siteId, tests);
        }

        revalidateTag('leaderboard', { expire: 0 });
        revalidateTag('site', { expire: 0 });

        return NextResponse.json({ success: true, sitesProcessed: scrapedSites.length });
    } catch (error) {
        console.error('Scrape failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
