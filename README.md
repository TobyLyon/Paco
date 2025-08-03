# 🍗 Paco's Chicken Palace

> The most clucking awesome memecoin restaurant on Abstract! 

Welcome to **Paco's Chicken Palace** - where crypto meets crispy! This is a fun, interactive single-page restaurant experience that doubles as a PFP (Profile Picture) generator for the $PACO memecoin community.

## 🎮 Features

- **🍗 Interactive Restaurant Menu** - Order your custom chicken like you're at KFC!
- **🎨 PFP Generator** - Create unique chicken avatars with layered assets
- **🔊 Restaurant Sounds** - Full audio experience with ordering sounds
- **📱 Fully Responsive** - Works perfectly on mobile, tablet, and desktop
- **🎯 No Scroll Design** - Everything fits in one viewport
- **🎪 Easter Eggs** - Hidden interactions and fun surprises
- **💾 Persistent Orders** - Your preferences are saved locally

## 🚀 Quick Deploy

### Vercel (Recommended)
1. Fork this repository
2. Connect to Vercel
3. Deploy automatically - no configuration needed!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TobyLyon/Paco)

### Netlify
1. Fork this repository
2. Connect to Netlify
3. Build command: `npm run build`
4. Publish directory: `public`

### GitHub Pages
1. Enable GitHub Pages in repository settings
2. Run `npm run deploy-pages`
3. Set source to `public` branch

## 🛠️ Local Development

```bash
# Install dependencies (optional - for linting/formatting)
npm install

# Start development server
npm start
# or
npm run dev

# Build for production
npm run build

# Preview built site
npm run preview
```

## 📁 Project Structure

```
PACOTHECHICKEN/
├── index.html          # Main restaurant page
├── styles.css          # All styling and animations  
├── script.js          # Interactive functionality
├── abstract.png       # Abstract blockchain logo
├── Public/            # All brand assets
│   ├── ASSETS/        # PFP generator layers
│   │   ├── base/      # Base chicken images
│   │   ├── hat/       # Hat/topping overlays
│   │   └── item/      # Item/side overlays
│   └── *.png          # Brand logos and banners
├── package.json       # Build scripts and metadata
├── vercel.json        # Vercel deployment config
├── build.js           # Build script for deployment
└── README.md          # This file
```

## 🎨 Customization

### Adding New Menu Items
1. Add PNG files to appropriate subfolder:
   - Hats/Toppings: `assets/hat/yourhat.png`
   - Items/Sides: `assets/item/youritem.png`
2. Update the `menuItems` object in `script.js`
3. Add corresponding emoji and pricing
4. Refresh browser - changes appear immediately! (No build needed)

### Styling Changes
- All styles are in `styles.css` with CSS custom properties
- Color scheme uses `--restaurant-*` variables
- Responsive breakpoints at 1200px and 768px

### Brand Assets
- Replace logos in the `Public/` directory
- Update meta tags and titles in `index.html`
- Modify the contract address in `script.js`

## 🔧 Development & Build

### Development (Dynamic Assets)
```bash
npm start    # Serves assets directly from source - instant updates!
npm run dev  # Same as npm start
```

### Production Build
```bash
npm run build    # Creates optimized build in public/ directory
npm run preview  # Preview production build locally
```

**Key Benefit**: During development, assets load directly from organized `assets/` subfolders - add files to correct category and refresh! No build steps needed!

## 🌐 Deployment Troubleshooting

### Vercel Issues
- Ensure `vercel.json` is present
- Check that build command outputs to `public/` directory
- Verify all assets are properly copied

### Asset Loading Issues
- For development: Ensure assets are in correct subfolders (`assets/hat/`, `assets/item/`, `assets/base/`)
- For production: Run `npm run build` to copy organized assets to `public/`
- Check browser console for 404 errors if images don't load
- Verify CORS settings for cross-origin requests

### Canvas/PFP Generator Issues
- Ensure all image files are in the correct directories
- Check browser console for loading errors
- Verify canvas dimensions and image sizing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the build process: `npm run build && npm run preview`
5. Submit a pull request

## 📄 License

MIT License - feel free to fork and customize for your own memecoin project!

---

**Built with ❤️ for the $PACO community on Abstract** 🐔✨ 