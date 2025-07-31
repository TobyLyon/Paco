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

// Copy all media files from root directory
console.log('📂 Copying all media files from root...');
const mediaFiles = [
    'bg 2048.png', 'bg.png', 'PACO-BANNER.png', 'PACO-THE-CHICKEN.png',
    'abstract.png', 'PACO-MUY-GUAPO.png', 'TURN-ABSTRACT-YELLOW.png',
    'PACO-pfp.png', 'PACO-TEXT-N-FIELD.png', 'PACO-shortbus-ASIAN.png',
    'shortbus-paco.png', 'PACO-TEXT.png', 'PACO-W-TEXT.png', 'PACO-MANIA.png',
    'favicon-16x16.png', 'favicon-32x32.png', 'favicon.ico', 'favicon.png',
    'apple-touch-icon.png'
];

mediaFiles.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(publicDir, file);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied media: ${file}`);
    }
});

// Copy ASSETS folder if it exists
const assetsDir = path.join(__dirname, 'public', 'ASSETS');
const destAssetsDir = path.join(publicDir, 'ASSETS');
if (fs.existsSync(assetsDir)) {
    console.log('📂 Copying ASSETS folder...');
    function copyRecursive(src, dest) {
        const stat = fs.statSync(src);
        if (stat.isDirectory()) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }
            const files = fs.readdirSync(src);
            files.forEach(file => {
                const srcPath = path.join(src, file);
                const destPath = path.join(dest, file);
                copyRecursive(srcPath, destPath);
            });
        } else {
            fs.copyFileSync(src, dest);
            console.log(`✅ Copied asset: ${path.basename(src)}`);
        }
    }
    copyRecursive(assetsDir, destAssetsDir);
}

console.log('🎉 Build complete! Files ready in public directory for deployment.');