/**
 * Generate macOS icon from SVG
 * Generates PNG files that electron-builder can use for macOS
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RESOURCES_DIR = path.join(__dirname, '..', 'electron', 'resources');
const SVG_PATH = path.join(RESOURCES_DIR, 'icon.svg');

async function generateMacIcon() {
  console.log('Generating macOS icon...');
  
  const svgBuffer = fs.readFileSync(SVG_PATH);
  
  // Generate 1024x1024 PNG for macOS (highest resolution needed)
  // electron-builder will use this and generate the ICNS internally
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(RESOURCES_DIR, 'icon-mac.png'));
  
  console.log('✓ Generated icon-mac.png (1024x1024)');
  
  // Also generate 512x512 as fallback
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(RESOURCES_DIR, 'icon-512.png'));
  
  console.log('✓ Generated icon-512.png');
  
  console.log('\nNote: electron-builder can use PNG files directly for macOS icons');
  console.log('The icon will be automatically converted to ICNS during build');
}

generateMacIcon().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
