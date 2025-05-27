const fs = require('fs');
const path = require('path');

// Path to the public images directory
const imagesDir = path.join(__dirname, '../public/images');

// Define the new placeholder images to create and their source images
const placeholders = [
  { source: 'product-placeholder.jpg', target: 'furniture.jpg' },
  { source: 'product-placeholder.jpg', target: 'books.jpg' },
  { source: 'product-placeholder.jpg', target: 'sports.jpg' }
];

// Create each placeholder by copying from the source image
placeholders.forEach(({ source, target }) => {
  const sourcePath = path.join(imagesDir, source);
  const targetPath = path.join(imagesDir, target);

  // Check if source exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file ${source} does not exist!`);
    return;
  }

  // Check if target already exists
  if (fs.existsSync(targetPath)) {
    console.log(`Target file ${target} already exists. Skipping.`);
    return;
  }

  // Copy the file
  try {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Created ${target} from ${source}`);
  } catch (error) {
    console.error(`Error creating ${target}:`, error);
  }
});

console.log('Placeholder image creation complete.'); 