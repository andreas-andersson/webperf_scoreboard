import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sites, scans } from '@/db/schema';
import { scrapeScoreboard, scrapeSiteDetails } from '@/lib/scraper';
import { eq } from 'drizzle-orm';

export const maxDuration = 300; // Allow 5 minutes for scraping if there are many sites
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Basic auth check for cron (optional but recommended)
        const authHeader = request.headers.get('authorization');
        if (
            process.env.NODE_ENV !== 'development' && 
            authHeader !== `Bearer ${process.env.CRON_SECRET}`
        ) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

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
                const url = details.url;
                siteData.url = url;
            } catch (e) {
                console.error(`Failed to scrape details for ${siteData.name}`, e);

                // Proceed without details
                continue
            }

            let siteId: string;
            const urlWithoutProtocol = siteData.url.replace(/^https?:\/\//, '');
            const existingSite = await db.select().from(sites).where(eq(sites.url, urlWithoutProtocol)).limit(1);

            if (existingSite.length > 0) {
                siteId = existingSite[0].id;
            } else {
                const insertResult = await db.insert(sites).values({
                    url: urlWithoutProtocol || '',
                    name: siteData.name,
                }).returning({ id: sites.id });
                siteId = insertResult[0].id;
            }

            // 3. Create Scan Record
            await db.insert(scans).values({
                siteId: siteId,
                totalScore: siteData.totalScore,
                categories: categories,
                testsData: testsData,
            });
        }

        return NextResponse.json({ success: true, sitesProcessed: scrapedSites.length });
    } catch (error) {
        console.error('Scrape failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
