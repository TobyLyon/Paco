const fs = require('fs');
const path = require('path');

console.log('🏗️ Building Paco\'s Chicken Palace for deployment...');

const publicDir = path.join(__dirname, 'public');
const sourceDir = path.join(__dirname, 'Public');

// Clean up existing public directory
if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, { recursive: true, force: true });
    console.log('🗑️ Removed existing public directory');
}

// Create fresh public directory
fs.mkdirSync(publicDir, { recursive: true });
console.log('✅ Created fresh public directory');

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

// Copy ALL files from Public to public directory
if (fs.existsSync(sourceDir)) {
    console.log('📂 Copying all assets from Public to public...');
    
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
    
    // Copy all contents from Public to public
    const files = fs.readdirSync(sourceDir);
    files.forEach(file => {
        const srcPath = path.join(sourceDir, file);
        const destPath = path.join(publicDir, file);
        copyRecursive(srcPath, destPath);
    });
} else {
    console.log('❌ Source Public directory not found');
    process.exit(1);
}

console.log('🎉 Build complete! All assets copied to public/ directory for deployment');