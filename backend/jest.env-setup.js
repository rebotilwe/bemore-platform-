// Runs before any module imports — used to seed env vars that modules read at import time.
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

if (!process.env.UPLOAD_DIR) {
  process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bemore-test-uploads-'));
}
