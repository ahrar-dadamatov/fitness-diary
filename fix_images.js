const { Jimp } = require('jimp');

const files = [
  './assets/images/icon.png',
  './assets/images/android-icon-foreground.png',
  './assets/images/splash-icon.png',
];

async function fixImages() {
  for (const file of files) {
    try {
      console.log(`Processing ${file}...`);
      const image = await Jimp.read(file);
      await image.write(file);
      console.log(`Successfully converted ${file} to a valid PNG.`);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
}

fixImages();
