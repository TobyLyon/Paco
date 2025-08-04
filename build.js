const fs = require('fs-extra');
const path = require('path');

console.log("🏗️ Starting the definitive build for Paco's Chicken Palace...");

// Function to inject environment variables into HTML files
async function injectEnvironmentVariables(outputDir) {
    const htmlFiles = ['index.html', 'auth/callback.html'];
    
    for (const htmlFile of htmlFiles) {
        const filePath = path.join(outputDir, htmlFile);
        
        if (await fs.pathExists(filePath)) {
            let content = await fs.readFile(filePath, 'utf8');
            
            // Replace environment variable placeholders
            content = content.replace('__TWITTER_CLIENT_ID__', process.env.TWITTER_CLIENT_ID || '');
            
            await fs.writeFile(filePath, content, 'utf8');
            console.log(`    ✅ Injected environment variables into ${htmlFile}`);
        }
    }
}

const rootDir = __dirname;
const outputDir = path.join(rootDir, 'public');
const sourcePublicDir = path.join(rootDir, 'Public');
// Removed old complex asset path - now using direct assets folder

async function build() {
    try {
        // 1. Clean up the old output directory to ensure a fresh start.
        console.log(`🗑️  Removing old build directory: ${outputDir}`);
        await fs.remove(outputDir);
        console.log('✅  Old build directory removed.');

        // 2. Create a new, empty output directory.
        console.log(`✨  Creating fresh build directory: ${outputDir}`);
        await fs.ensureDir(outputDir);
        console.log('✅  Fresh build directory created.');

        // 2.5. Load environment variables
        require('dotenv').config();
        console.log('📋  Environment variables loaded');

        // 3. Copy all essential files from the root directory.
        console.log(`📄  Copying files from root to ${outputDir}...`);
        const rootFiles = await fs.readdir(rootDir);
        console.log(`🔍  Found ${rootFiles.length} files in root directory`);
        
        const filesToCopy = rootFiles.filter(file => {
            const stat = fs.statSync(path.join(rootDir, file));
            if (!stat.isFile()) return false;
            
            // Include essential web files, all images, favicons, and other specific files.
            const shouldCopy = (
                file.endsWith('.html') ||
                file.endsWith('.css') ||
                file.endsWith('.js') ||
                file.endsWith('.png') ||
                file.endsWith('.gif') ||
                file.endsWith('.ico') ||
                file.endsWith('.svg') ||
                file.endsWith('.jpg') ||
                file.endsWith('.jpeg') ||
                file.endsWith('.webp') ||
                file.endsWith('.bmp') ||
                file === 'vercel.json' ||
                file === 'database-schema.sql' ||
                file === 'enable-realtime.sql'
            );
            
            if (!shouldCopy) {
                console.log(`    ⏭️  Skipping: ${file}`);
            }
            return shouldCopy;
        });

        console.log(`📋  Will copy ${filesToCopy.length} files from root`);
        
        for (const file of filesToCopy) {
            // Exclude the build script itself from being copied.
            if (file === 'build.js') continue;
            
            try {
                const srcPath = path.join(rootDir, file);
                const destPath = path.join(outputDir, file);
                await fs.copy(srcPath, destPath);
                console.log(`    ✅ Copied: ${file}`);
            } catch (error) {
                console.error(`    ❌ Failed to copy ${file}:`, error.message);
            }
        }
        console.log('✅  Root files copied.');

        // 4. Recursively copy everything from the source 'Public' directory (for general assets).
        const normalizedSourcePublic = path.resolve(sourcePublicDir).toLowerCase();
        const normalizedOutput = path.resolve(outputDir).toLowerCase();
        
        if (await fs.pathExists(sourcePublicDir) && normalizedSourcePublic !== normalizedOutput) {
            console.log(`🏞️  Copying assets from ${sourcePublicDir} to ${outputDir}...`);
            await fs.copy(sourcePublicDir, outputDir, {
                overwrite: true,
                errorOnExist: false,
                recursive: true
            });
            console.log('✅  Assets from Public directory copied.');
        } else {
            console.log(`⚠️  Source 'Public' directory not found or same as destination, skipping.`);
        }
        
        // 5. Copy organized assets directory for deployment
        const assetsSourceDir = path.join(rootDir, 'assets');
        const assetsDestDir = path.join(outputDir, 'assets');
        
        if (await fs.pathExists(assetsSourceDir)) {
            console.log(`🎨  Copying organized assets from ${assetsSourceDir} to ${assetsDestDir}...`);
            // Copy the entire organized folder structure
            await fs.copy(assetsSourceDir, assetsDestDir, {
                overwrite: true,
                errorOnExist: false,
                recursive: true
            });
            console.log('✅  Organized assets copied for production deployment.');
        } else {
            console.log(`⚠️  Assets directory not found at ${assetsSourceDir}, skipping.`);
        }

        // 6. Copy all media assets (new universal media directory)
        const mediaSourceDir = path.join(rootDir, 'media');
        if (await fs.pathExists(mediaSourceDir)) {
            console.log(`📺  Copying all media assets from ${mediaSourceDir} to ${outputDir}...`);
            await fs.copy(mediaSourceDir, outputDir, {
                overwrite: true,
                errorOnExist: false,
                recursive: true
            });
            console.log('✅  Media assets copied successfully.');
        } else {
            console.log(`ℹ️  No media directory found at ${mediaSourceDir}, skipping.`);
        }

        // 7. Copy all game assets for deployment
        const gameSourceDir = path.join(rootDir, 'game');
        if (await fs.pathExists(gameSourceDir)) {
            console.log(`🎮  Copying all game assets from ${gameSourceDir} to ${outputDir}...`);
            await fs.copy(gameSourceDir, outputDir, {
                overwrite: true,
                errorOnExist: false,
                recursive: true
            });
            console.log('✅  Game assets copied successfully.');
        } else {
            console.log(`⚠️  Game assets directory not found at ${gameSourceDir}, skipping.`);
        }

        // 8. Inject environment variables into HTML files
        console.log('🔧  Injecting environment variables into HTML files...');
        await injectEnvironmentVariables(outputDir);
        console.log('✅  Environment variables injected.');

        console.log("\n🎉 BUILD SUCCESS! 🎉");
        console.log(`🚀 Your site is ready for deployment in the '${path.basename(outputDir)}' directory.`);

    } catch (error) {
        console.error("\n❌ BUILD FAILED! ❌");
        console.error("An unexpected error occurred:");
        console.error(error);
        process.exit(1);
    }
}

build();
