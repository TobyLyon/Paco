const fs = require('fs');
const path = require('path');

console.log('🏗️ Building Paco\'s Chicken Palace for deployment...');

// Create public directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('✅ Created public directory');
}

// Files to copy to public directory
const filesToCopy = [
    'index.html',
    'styles.css', 
    'script.js',
    'abstract.png',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'apple-touch-icon.png',
    'favicon.ico'
];

// Copy main files
filesToCopy.forEach(file => {
    try {
        if (fs.existsSync(file)) {
            fs.copyFileSync(file, path.join(publicDir, file));
            console.log(`✅ Copied ${file}`);
        } else {
            console.log(`⚠️ ${file} not found, skipping`);
        }
    } catch (error) {
        console.error(`❌ Error copying ${file}:`, error.message);
    }
});

// Copy Public directory recursively
function copyDirectory(src, dest) {
    try {
        if (!fs.existsSync(src)) {
            console.log(`⚠️ ${src} directory not found, skipping`);
            return;
        }

        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const items = fs.readdirSync(src);
        
        items.forEach(item => {
            const srcPath = path.join(src, item);
            const destPath = path.join(dest, item);
            
            if (fs.statSync(srcPath).isDirectory()) {
                copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        });
        
        console.log(`✅ Copied ${src} directory`);
    } catch (error) {
        console.error(`❌ Error copying directory ${src}:`, error.message);
    }
}

// Copy the Public assets directory
copyDirectory('Public', path.join(publicDir, 'Public'));

console.log('🎉 Build complete! Files ready in public/ directory');
console.log('📁 Output directory structure:');
try {
    const files = fs.readdirSync(publicDir);
    files.forEach(file => {
        console.log(`   - ${file}`);
    });
} catch (error) {
    console.log('Could not list output files');
} 