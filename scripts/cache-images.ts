#!/usr/bin/env node
/** Downloads catalogue imagery into public/catalogue-images for demo resilience. */
import { openDb } from '../ingestion/storage.ts';
import { cacheImages } from '../ingestion/images.ts';

const db = openDb();
const limitArg = process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1];
await cacheImages(db, { limit: limitArg ? Number(limitArg) : undefined });
db.close();
