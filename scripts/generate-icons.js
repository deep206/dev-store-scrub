const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const svgPath = path.join(__dirname, '../icons/icon.svg');
const outputDir = path.join(__dirname, '../icons');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Read the SVG file
const svgBuffer = fs.readFileSync(svgPath);

// Generate PNG files for each size
async function generateIcons() {
    try {
        for (const size of sizes) {
            const outputPath = path.join(outputDir, `icon${size}.png`);
            
            await sharp(svgBuffer)
                .resize(size, size)
                .png()
                .toFile(outputPath);
            
            console.log(`Generated ${outputPath}`);
        }
        console.log('Icon generation complete!');
    } catch (error) {
        console.error('Error generating icons:', error);
    }
}

generateIcons(); 