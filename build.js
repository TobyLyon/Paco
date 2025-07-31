const fs = require('fs');
const path = require('path');

console.log('🏗️ Building Paco\'s Chicken Palace for deployment...');

// The public directory is the OUTPUT - we should not touch it if it already exists correctly
const publicDir = path.join(__dirname, 'public');

// Since you've already set up the public directory correctly, let's just verify it exists
if (fs.existsSync(publicDir)) {
    console.log('✅ Public directory exists and contains your files');
    
    // Let's just list what's in there for verification
    console.log('📁 Current public directory contents:');
    try {
        const files = fs.readdirSync(publicDir);
        files.forEach(file => {
            const filePath = path.join(publicDir, file);
            const isDir = fs.statSync(filePath).isDirectory();
            console.log(`   ${isDir ? '📁' : '📄'} ${file}`);
            
            if (isDir && file === 'assets') {
                try {
                    const assetFiles = fs.readdirSync(filePath);
                    assetFiles.forEach(asset => {
                        console.log(`      📄 ${asset}`);
                    });
                } catch (error) {
                    console.log(`      (Could not read assets directory: ${error.message})`);
                }
            }
        });
    } catch (error) {
        console.log('Could not list public directory contents');
    }
    
    console.log('🎉 Build verification complete! Your public directory is ready for deployment.');
} else {
    console.log('❌ Public directory not found. Please ensure your files are in the public/ directory.');
}

console.log('\n📋 For deployment:');
console.log('   - Vercel: Point to the public/ directory');
console.log('   - Netlify: Set publish directory to public/');
console.log('   - GitHub Pages: Deploy from public/ directory');