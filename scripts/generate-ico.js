/**
 * Generate Windows ICO from SVG
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const toIco = require('png-to-ico').default || require('png-to-ico');

const RESOURCES_DIR = path.join(__dirname, '..', 'electron', 'resources');
const SVG_PATH = path.join(RESOURCES_DIR, 'icon.svg');

async function generateIco() {
  console.log('Generating Windows ICO...');
  
  const svgBuffer = fs.readFileSync(SVG_PATH);
  const sizes = [256, 128, 64, 48, 32, 16];
  
  // Generate PNGs for each size
  const pngBuffers = [];
  for (const size of sizes) {
    const pngBuffer = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push(pngBuffer);
    console.log(`  Generated ${size}x${size}`);
  }
  
  // Convert to ICO
  const icoBuffer = await toIco(pngBuffers);
  fs.writeFileSync(path.join(RESOURCES_DIR, 'icon.ico'), icoBuffer);
  console.log('✓ Generated icon.ico');
}

generateIco().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
