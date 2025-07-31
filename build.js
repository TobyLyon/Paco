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

// Copy all files from your existing public folder
const existingPublicDir = path.join(__dirname, 'Public');
if (fs.existsSync(existingPublicDir)) {
    console.log('📂 Copying all media files from Public...');
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
            console.log(`✅ Copied media: ${path.basename(src)}`);
        }
    }
    
    const files = fs.readdirSync(existingPublicDir);
    files.forEach(file => {
        const srcPath = path.join(existingPublicDir, file);
        const destPath = path.join(publicDir, file);
        copyRecursive(srcPath, destPath);
    });
}

console.log('🎉 Build complete! Files ready in public directory for deployment.');