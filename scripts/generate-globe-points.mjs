#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');

// Support loading dependencies from frontend/node_modules or standard paths
let topojson, d3Geo;
try {
  topojson = await import('topojson-client');
  d3Geo = await import('d3-geo');
} catch {
  const topoPath = pathToFileURL(path.join(frontendDir, 'node_modules/topojson-client/src/index.js')).href;
  const d3Path = pathToFileURL(path.join(frontendDir, 'node_modules/d3-geo/src/index.js')).href;
  topojson = await import(topoPath);
  d3Geo = await import(d3Path);
}

// 1. Parse CLI argument for N (default 16000)
const args = process.argv.slice(2);
let N = 16000;
for (const arg of args) {
  if (arg.startsWith('--points=')) {
    N = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('-n=')) {
    N = parseInt(arg.split('=')[1], 10);
  } else if (!isNaN(parseInt(arg, 10))) {
    N = parseInt(arg, 10);
  }
}

console.log(`[generate-globe-points] Starting Fibonacci lattice generation with N = ${N} points...`);

// 2. Load world-atlas land-50m dataset
let land50mPath = path.resolve(frontendDir, 'node_modules/world-atlas/land-50m.json');
if (!fs.existsSync(land50mPath)) {
  land50mPath = path.resolve(rootDir, 'node_modules/world-atlas/land-50m.json');
}

if (!fs.existsSync(land50mPath)) {
  console.error(`Error: Could not find land-50m.json at ${land50mPath}`);
  process.exit(1);
}

const worldData = JSON.parse(fs.readFileSync(land50mPath, 'utf8'));
const landFeature = topojson.feature(worldData, worldData.objects.land);

// Pre-decompose MultiPolygon into bounded polygon features for high-performance containment testing
const polygons = [];
const geom = landFeature.features ? landFeature.features[0].geometry : landFeature.geometry;

for (const coords of geom.coordinates) {
  const polyFeature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: coords } };
  const bounds = d3Geo.geoBounds(polyFeature);
  polygons.push({
    feature: polyFeature,
    bounds: bounds // [[minLon, minLat], [maxLon, maxLat]]
  });
}

console.log(`[generate-globe-points] Pre-indexed ${polygons.length} land polygons.`);

// 3. Generate Fibonacci lattice points on unit sphere
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const landPoints = [];
let indiaPointsCount = 0;

for (let i = 0; i < N; i++) {
  // Uniform sampling along z-axis (latitudinal distribution)
  const z = 1 - (2 * i + 1) / N;
  const lat = Math.asin(z) * (180 / Math.PI);

  // Longitude incremented by golden angle
  const lonRad = (i * goldenAngle) % (2 * Math.PI);
  let lon = (lonRad * (180 / Math.PI));
  if (lon > 180) lon -= 360;

  const point = [lon, lat];

  // Test containment against bounded land polygons
  let isLand = false;
  for (let j = 0; j < polygons.length; j++) {
    const b = polygons[j].bounds;
    let inLon = false;
    if (b[0][0] <= b[1][0]) {
      inLon = point[0] >= b[0][0] && point[0] <= b[1][0];
    } else {
      // Handles antimeridian crossing
      inLon = point[0] >= b[0][0] || point[0] <= b[1][0];
    }

    if (inLon && point[1] >= b[0][1] && point[1] <= b[1][1]) {
      if (d3Geo.geoContains(polygons[j].feature, point)) {
        isLand = true;
        break;
      }
    }
  }

  if (isLand) {
    const rLon = Math.round(lon * 100) / 100;
    const rLat = Math.round(lat * 100) / 100;
    landPoints.push([rLon, rLat]);

    // Check India bounding box (lon: 68 to 97, lat: 8 to 35)
    if (rLon >= 68 && rLon <= 97 && rLat >= 8 && rLat <= 35) {
      indiaPointsCount++;
    }
  }
}

// 4. Verify Indian Ocean point (lon 80, lat -20)
const oceanPointCheck = d3Geo.geoContains(landFeature, [80, -20]);
const oceanPointsInDataset = landPoints.filter(([lon, lat]) => Math.abs(lon - 80) < 0.5 && Math.abs(lat - (-20)) < 0.5).length;

// 5. Output file
const outputDir = path.resolve(frontendDir, 'src/assets');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.resolve(outputDir, 'globe-land-points.json');
const jsonContent = JSON.stringify(landPoints);
fs.writeFileSync(outputPath, jsonContent, 'utf8');

const fileSizeBytes = fs.statSync(outputPath).size;
const fileSizeKB = (fileSizeBytes / 1024).toFixed(2);

console.log('\n--- Generation Summary ---');
console.log(`Total sample points generated (N): ${N}`);
console.log(`Land points kept: ${landPoints.length}`);
console.log(`Output file: ${outputPath}`);
console.log(`File size: ${fileSizeKB} KB (${fileSizeBytes} bytes)`);
console.log(`India bounding box (lon 68-97, lat 8-35) points count: ${indiaPointsCount}`);
console.log(`Indian Ocean [80, -20] land containment: ${oceanPointCheck} (points kept near [80, -20]: ${oceanPointsInDataset})`);
