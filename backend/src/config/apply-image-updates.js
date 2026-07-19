import fs from 'fs';
import path from 'path';

const updatesPath = process.argv[2] || 'updates.json';
const baseDir = path.resolve(process.cwd(), 'backend', 'src', 'config');
const imageMapFile = path.join(baseDir, 'image-map.json');
const updatesFile = path.resolve(process.cwd(), 'backend', updatesPath);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`Failed to read JSON from ${file}:`, err.message);
    process.exit(1);
  }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

if (!fs.existsSync(imageMapFile)) {
  console.error('image-map.json not found at', imageMapFile);
  process.exit(1);
}

if (!fs.existsSync(updatesFile)) {
  console.error('Updates file not found at', updatesFile);
  console.error('Create a JSON file with the mapping: { "Item Name": "https://...", ... }');
  process.exit(1);
}

const imageMap = readJson(imageMapFile);
const updates = readJson(updatesFile);

let changed = 0;
for (const [key, url] of Object.entries(updates)) {
  if (!url || typeof url !== 'string') continue;
  if (imageMap[key] !== url) {
    imageMap[key] = url;
    changed++;
  }
}

if (changed === 0) {
  console.log('No changes to apply.');
  process.exit(0);
}

writeJson(imageMapFile, imageMap);
console.log(`Applied ${changed} image update(s) to backend/src/config/image-map.json`);
console.log('Restart backend (if running) to pick up changes.');
