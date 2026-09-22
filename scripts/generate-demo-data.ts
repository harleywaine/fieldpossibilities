#!/usr/bin/env node
/**
 * Generates the synthetic internal dataset and builds its indexes (brief §53).
 * Deterministic: the same seed produces the same corpus every run.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { generateDataset } from '../lib/demo/generate.ts';
import { writeDemoDataset, buildDocumentIndexes } from '../ingestion/documents.ts';
import { makeLogger } from '../ingestion/logger.ts';
import { sealForReadOnly } from '../ingestion/storage.ts';

const log = makeLogger('demo-data');

const data = generateDataset();
mkdirSync('data/demo', { recursive: true });
writeFileSync(join('data/demo', 'dataset.json'), JSON.stringify(data, null, 1));

mkdirSync('data/catalogue', { recursive: true });
const db = new DatabaseSync('data/demo/demo.db');
db.exec('PRAGMA journal_mode = WAL;');

writeDemoDataset(db, data);
await buildDocumentIndexes(db);
sealForReadOnly(db);
db.close();

log.info(
  `seed=${data.seed} customers=${data.customers.length} employees=${data.employees.length} ` +
  `suppliers=${data.suppliers.length} rfqs=${data.rfqs.length} quotes=${data.quotes.length} ` +
  `documents=${data.documents.length}`,
);
