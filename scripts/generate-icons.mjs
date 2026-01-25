import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  const inputImage = 'public/LogoPlanA.png';
  const outputDir = 'public/icons';

  await fs.mkdir(outputDir, { recursive: true });

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    await sharp(inputImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 245, g: 245, b: 240, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    
    console.log(`Generated: ${outputPath}`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
