import { pgTable, text, timestamp, doublePrecision, uuid, jsonb } from 'drizzle-orm/pg-core';

export const sites = pgTable('sites', {
  id: uuid('id').defaultRandom().primaryKey(),
  url: text('url').notNull().unique(), // The URL being tracked
  name: text('name'), // Optional display name
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const scans = pgTable('scans', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  scannedAt: timestamp('scanned_at').defaultNow().notNull(),
  
  // Total score extracted from the scoreboard
  totalScore: doublePrecision('total_score'), 
  
  // Breakdown of category scores (e.g., SE0, Accessibility, Performance)
  // Storing as JSON allows flexibility if categories change
  categories: jsonb('categories'), 
  
  // Details about specific tests
  testsData: jsonb('tests_data'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
