const fs = require('fs');
const path = require('path');

console.log('🏗️ Building Paco\'s Chicken Palace for deployment...');

const publicDir = path.join(__dirname, 'public');

// Create public directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('✅ Created public directory');
}

// Copy essential files to public directory
const rootFiles = ['index.html', 'styles.css', 'script.js'];
rootFiles.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(publicDir, file);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied ${file}`);
    }
});

// Create symlink or note about Public directory
console.log('📁 Note: Using Public/ directory for assets (ensure this exists in deployment)');
console.log('🎉 Build complete! Make sure Public/ directory is deployed alongside public/');