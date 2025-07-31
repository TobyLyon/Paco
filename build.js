const fs = require('fs-extra');
const path = require('path');

console.log("🏗️ Starting the definitive build for Paco's Chicken Palace...");

const rootDir = __dirname;
const outputDir = path.join(rootDir, 'public');
const sourcePublicDir = path.join(rootDir, 'Public');
const generatorAssetsDir = path.join(rootDir, 'assets', 'images', 'ASSETS');

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

        // 3. Copy all essential files from the root directory.
        console.log(`📄  Copying files from root to ${outputDir}...`);
        const rootFiles = await fs.readdir(rootDir);
        const filesToCopy = rootFiles.filter(file => {
            // Include essential web files, all images, favicons, and other specific files.
            return (
                file.endsWith('.html') ||
                file.endsWith('.css') ||
                file.endsWith('.js') ||
                file.endsWith('.png') ||
                file.endsWith('.ico') ||
                file.endsWith('.svg') ||
                file.endsWith('.jpg') ||
                file.endsWith('.jpeg') ||
                file === 'vercel.json' ||
                file === 'database-schema.sql' ||
                file === 'enable-realtime.sql'
            );
        });

        for (const file of filesToCopy) {
            // Exclude the build script itself from being copied.
            if (file === 'build.js') continue;
            
            const srcPath = path.join(rootDir, file);
            const destPath = path.join(outputDir, file);
            await fs.copy(srcPath, destPath);
            console.log(`    -> Copied: ${file}`);
        }
        console.log('✅  Root files copied.');

        // 4. Recursively copy everything from the source 'Public' directory (for general assets).
        if (await fs.pathExists(sourcePublicDir)) {
            console.log(`🏞️  Copying assets from ${sourcePublicDir} to ${outputDir}...`);
            await fs.copy(sourcePublicDir, outputDir, {
                overwrite: true,
                errorOnExist: false,
                recursive: true
            });
            console.log('✅  Assets from Public directory copied.');
        } else {
            console.log(`⚠️  Source 'Public' directory not found, skipping.`);
        }
        
        // 5. Recursively copy the generator assets.
        if (await fs.pathExists(generatorAssetsDir)) {
            console.log(`🎨  Copying generator assets from ${generatorAssetsDir} to ${path.join(outputDir, 'ASSETS')}...`);
            await fs.copy(generatorAssetsDir, path.join(outputDir, 'ASSETS'), {
                overwrite: true,
                errorOnExist: false,
                recursive: true
            });
            console.log('✅  Generator assets copied.');
        } else {
            console.log(`⚠️  Generator assets directory not found at ${generatorAssetsDir}, skipping.`);
        }

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
