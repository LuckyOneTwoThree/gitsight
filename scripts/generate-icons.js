/**
 * Generate icons for all platforms from SVG source
 * Usage: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');

const RESOURCES_DIR = path.join(__dirname, '..', 'electron', 'resources');
const SVG_PATH = path.join(RESOURCES_DIR, 'icon.svg');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed.');
  console.log('Please run: npm install --save-dev sharp');
  process.exit(1);
}

async function generateIcons() {
  console.log('Generating icons from SVG...');
  
  // Read SVG
  const svgBuffer = fs.readFileSync(SVG_PATH);
  
  // Windows ICO sizes
  const icoSizes = [256, 128, 64, 48, 32, 16];
  
  // Generate PNGs for ICO
  console.log('Generating Windows ICO...');
  const pngBuffers = [];
  for (const size of icoSizes) {
    const pngBuffer = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push({ size, buffer: pngBuffer });
  }
  
  // Use png-to-ico if available
  let toIco;
  try {
    toIco = require('png-to-ico');
    const icoBuffer = await toIco(pngBuffers.map(p => p.buffer));
    fs.writeFileSync(path.join(RESOURCES_DIR, 'icon.ico'), icoBuffer);
    console.log('✓ Generated icon.ico');
  } catch (e) {
    console.log('Note: png-to-ico not available, skipping ICO generation');
    console.log('You may need to manually convert PNG to ICO');
  }
  
  // macOS ICNS sizes
  console.log('Generating macOS ICNS...');
  const icnsSizes = [512, 256, 128, 64, 32, 16];
  const icnsDir = path.join(RESOURCES_DIR, 'icon.iconset');
  
  if (!fs.existsSync(icnsDir)) {
    fs.mkdirSync(icnsDir, { recursive: true });
  }
  
  for (const size of icnsSizes) {
    // Normal size
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(icnsDir, `icon_${size}x${size}.png`));
    
    // Retina (@2x)
    if (size <= 256) {
      await sharp(svgBuffer)
        .resize(size * 2, size * 2)
        .png()
        .toFile(path.join(icnsDir, `icon_${size}x${size}@2x.png`));
    }
  }
  
  console.log('✓ Generated icon.iconset');
  console.log('Note: To create .icns file, run on macOS:');
  console.log(`  iconutil -c icns ${icnsDir}`);
  
  // Linux PNG
  console.log('Generating Linux PNG...');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(RESOURCES_DIR, 'icon.png'));
  console.log('✓ Generated icon.png (512x512)');
  
  console.log('\nDone! Icons generated in:', RESOURCES_DIR);
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
