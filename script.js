// ===== PACO'S CHICKEN PALACE - RESTAURANT SCRIPT =====

// === SUPABASE INTEGRATION ===
// Load Supabase client dynamically for live order tracking
let orderTracker = null;

async function loadSupabaseClient() {
    try {
        const module = await import('./supabase-client.js');
        orderTracker = module.default;
        console.log('✅ Supabase client loaded successfully');
        return true;
    } catch (error) {
        console.warn('⚠️ Supabase client not available:', error);
        return false;
    }
}

// === GLOBAL VARIABLES ===

// Restaurant state
let ordersServed = 0;
let audioEnabled = true;
let isLoaded = false;

// Current order state
const currentOrder = {
    base: 'PACO',
    hat: '',
    hatName: 'No Topping',
    item: '',
    itemName: 'No Side'
};

// Konami code state
let konamiCode = [];
let clickCount = 0;
let orderNumber = 1;

// Easter egg state
let easterEggFound = false;

// Audio context and audio enabled state
let audioContext;

// Constants
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

// Menu Items with restaurant names and descriptions
const menuItems = {
    hats: [
        { id: '', name: 'No Topping', description: 'Plain and simple, just like you ordered', price: 0.00, emoji: '🚫' },
        { id: 'sheriff', name: 'Sheriff Special', description: 'Smoky BBQ flavor with a badge of honor', price: 0.50, emoji: '🤠' },
        { id: 'abs-snapbck', name: 'Chain Link Crispy', description: 'Blockchain seasoned with crypto spices', price: 0.50, emoji: '🧢' },
        { id: 'crown', name: 'Royal Roast', description: 'Fit for crypto royalty, golden and tender', price: 0.50, emoji: '👑' },
        { id: 'sombrero', name: 'Fiesta Fiery', description: 'Spicy Mexican-style with jalapeño kick', price: 0.50, emoji: '🌶️' },
        { id: 'bucket-hat', name: 'Bucket o\' Bites', description: 'Classic comfort food, family sized', price: 0.50, emoji: '🪣' },
        { id: 'durag', name: 'Smooth & Savory', description: 'Silky smooth with urban flavor', price: 0.50, emoji: '🌟' },
        { id: 'rasta', name: 'Island Jerk', description: 'Caribbean spiced with reggae vibes', price: 0.50, emoji: '🌴' },
        { id: 'halo', name: 'Heavenly Herb', description: 'Angel-blessed with divine seasoning', price: 0.50, emoji: '😇' },
        { id: 'demon', name: 'Devil\'s Dare', description: 'Dangerously spicy, handle with care', price: 0.50, emoji: '😈' },
        { id: 'party-hat', name: 'Celebration Crunch', description: 'Party-time flavor with confetti crumbs', price: 0.50, emoji: '🎉' }
    ],
    items: [
        { id: '', name: 'No Side', description: 'Keep it simple, chicken only', price: 0.00, emoji: '🚫' },
        { id: 'revolver', name: 'Six-Shooter Sauce', description: 'Hot sauce that packs a punch', price: 1.00, emoji: '🌶️' },
        { id: 'blunt', name: 'Rolled Wrap', description: 'Tightly wrapped with secret herbs', price: 1.00, emoji: '🌿' },
        { id: 'crack-pipe', name: 'Crack Cola', description: 'Addictively refreshing drink', price: 1.00, emoji: '🥤' },
        { id: 'cash', name: 'Money Munchies', description: 'Green bills made of lettuce', price: 1.00, emoji: '💰' },
        { id: 'abs-coin', name: 'Crypto Coins', description: 'Golden onion rings, digital delicious', price: 1.00, emoji: '🪙' },
        { id: 'joint', name: 'Joint Ventures', description: 'Twisted breadsticks, business style', price: 1.00, emoji: '🥖' },
        { id: 'wand', name: 'Magic Sticks', description: 'Enchanted drumsticks with special powers', price: 1.00, emoji: '✨' },
        { id: 'chicken-sandwich', name: 'Mini-Me Sandwich', description: 'Chicken sandwich for your chicken', price: 1.00, emoji: '🥪' },
        { id: 'knife', name: 'Cutting Edge Cutlery', description: 'Premium dining utensils', price: 1.00, emoji: '🍴' },
        { id: 'fork', name: 'Fine Dining Fork', description: 'Elegant eating experience', price: 1.00, emoji: '🍽️' }
    ]
};

// Canvas and layer management - initialized after DOM load
let canvas = null;
let ctx = null;

// Layer images storage
const layers = {
    base: null,
    hat: null,
    item: null
};

// === LOADING SYSTEM ===

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// Update order number dynamically in HTML
function updateOrderNumber() {
    try {
        const orderNumberElement = document.querySelector('.order-number');
        if (orderNumberElement) {
            orderNumberElement.textContent = `#${String(orderNumber).padStart(4, '0')}`;
        }
    } catch (error) {
        console.error('Error updating order number:', error);
    }
}

// Initialize order number on page load
function initializeOrderNumber() {
    try {
        // Generate order number based on orders served
        orderNumber = ordersServed + 1;
        updateOrderNumber();
    } catch (error) {
        console.error('Error initializing order number:', error);
    }
}

function updateOrdersServed() {
    const orderCounter = document.getElementById('ordersServed');
    if (orderCounter) {
        orderCounter.textContent = ordersServed.toLocaleString();
    }
}

// === RESTAURANT AUDIO SYSTEM ===

function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Audio not supported in this browser');
            audioEnabled = false;
        }
    }
}

function playTone(frequency, duration, type = 'sine', volume = 0.1) {
    if (!audioEnabled) return;
    initAudio();
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
}

// Restaurant-themed sound effects
function playChickenSound() {
    if (!audioEnabled) return;
    playTone(400, 0.15);
    setTimeout(() => playTone(450, 0.1), 150);
    setTimeout(() => playTone(380, 0.1), 300);
}

function playOrderSound() {
    if (!audioEnabled) return;
    playTone(523, 0.2);
    setTimeout(() => playTone(659, 0.3), 200);
}

function playCompleteOrderSound() {
    if (!audioEnabled) return;
    // Cash register sound
    playTone(800, 0.1);
    setTimeout(() => playTone(600, 0.1), 100);
    setTimeout(() => playTone(400, 0.2), 200);
}

function playKitchenSound() {
    if (!audioEnabled) return;
    // Sizzling sound
    playTone(300, 0.3, 'sawtooth', 0.05);
}

function playPartySound() {
    if (!audioEnabled) return;
    playTone(523, 0.2);
    setTimeout(() => playTone(659, 0.2), 100);
    setTimeout(() => playTone(784, 0.2), 200);
    setTimeout(() => playTone(1047, 0.3), 300);
}

// === SUPABASE ORDER TRACKING ===

// Record order globally in Supabase
async function recordGlobalOrder(orderData) {
    try {
        if (!orderTracker) {
            console.log('📝 Order recorded locally only (Supabase not available)');
            return;
        }

        const result = await orderTracker.recordOrder(orderData);
        if (result.success) {
            console.log('✅ Global order recorded');
            // Update global stats after successful recording
            updateGlobalStats();
        } else {
            console.warn('⚠️ Failed to record global order:', result.error);
        }
    } catch (error) {
        console.warn('⚠️ Global order tracking unavailable:', error);
    }
}

// Update global statistics in navbar
async function updateGlobalStats() {
    try {
        if (!orderTracker) {
            // Update with local stats only
            const ordersServedElement = document.getElementById('ordersServed');
            if (ordersServedElement) {
                ordersServedElement.textContent = ordersServed.toLocaleString();
            }
            return;
        }

        const globalCount = await orderTracker.getGlobalOrderCount();
        if (globalCount.success) {
            ordersServed = globalCount.count;
            // Update the orders served stat in navbar
            const ordersServedElement = document.getElementById('ordersServed');
            if (ordersServedElement) {
                ordersServedElement.textContent = globalCount.count.toLocaleString();
            }
            console.log(`📊 Global order count updated: ${globalCount.count}`);
        }
    } catch (error) {
        console.warn('⚠️ Could not update global stats:', error);
    }
}

// Initialize global stats on page load (with timeout protection)
async function initializeGlobalStats() {
    try {
        // First try to load Supabase client
        const supabaseLoaded = await loadSupabaseClient();
        if (!supabaseLoaded || !orderTracker) {
            console.warn('⚠️ Supabase client not available, using local stats only');
            return;
        }

        // Test connection with timeout
        const connectionPromise = orderTracker.testConnection();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 3000)
        );
        
        const connectionTest = await Promise.race([connectionPromise, timeoutPromise]);
        
        if (connectionTest.success) {
            console.log('✅ Supabase connected successfully');
            await updateGlobalStats();
            
            // Start real-time subscription for live updates
            setupLiveOrderTracking();
        } else {
            console.warn('⚠️ Supabase connection failed, using local stats only');
        }
    } catch (error) {
        console.warn('⚠️ Supabase unavailable, using local stats only:', error);
    }
}

// Set up real-time order tracking
function setupLiveOrderTracking() {
    try {
        if (!orderTracker) {
            console.log('📡 Live order tracking not available (Supabase not loaded)');
            return;
        }

        orderTracker.subscribeToLiveOrders(
            // When someone else places an order
            (newOrder) => {
                handleLiveOrderNotification(newOrder);
                updateGlobalStats(); // Refresh the navbar count
            },
            // When an order is updated (less common)
            (updatedOrder) => {
                console.log('🔄 Order updated:', updatedOrder);
            }
        );
    } catch (error) {
        console.warn('⚠️ Could not set up live order tracking:', error);
    }
}

// Handle live order notifications from other users
function handleLiveOrderNotification(order) {
    // Don't show notification for our own orders (avoid duplicate notifications)
    const isOwnOrder = Date.now() - new Date(order.created_at).getTime() < 5000; // Within 5 seconds
    
    if (!isOwnOrder) {
        // Show live order notification
        const hatName = order.hat_name || 'No Topping';
        const itemName = order.item_name || 'No Side';
        
        showLiveOrderNotification(hatName, itemName);
        
        // Add subtle visual effect
        pulseOrderCounter();
    }
}

// Show live order notification for other users' orders
function showLiveOrderNotification(hatName, itemName) {
    const messages = [
        `🔴 LIVE: Someone ordered ${hatName} with ${itemName}!`,
        `👨‍🍳 Fresh order: ${hatName} + ${itemName}`,
        `🍗 Another customer chose ${hatName} with ${itemName}`,
        `🎉 Live order: ${hatName} & ${itemName}`,
        `👥 Someone else is enjoying ${hatName} + ${itemName}`
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    showNotification(randomMessage, 3000);
}

// Pulse the order counter when live orders come in
function pulseOrderCounter() {
    const orderCountElement = document.querySelector('.stat-item .stat-number');
    if (orderCountElement) {
        orderCountElement.style.animation = 'none';
        setTimeout(() => {
            orderCountElement.style.animation = 'pulse 0.5s ease-in-out';
        }, 10);
    }
}

// === NOTIFICATION SYSTEM ===

// Global notification timeout variable
let notificationTimeout = null;

function showNotification(message, duration = 1500) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    // Clear any existing notification timeout to prevent overlapping
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
    
    // Immediately update and show the new notification
    notification.textContent = message;
    notification.classList.remove('show');
    
    // Force reflow to ensure CSS transition resets
    notification.offsetHeight;
    
    // Show the new notification
    notification.classList.add('show');
    
    // Set new timeout to hide this notification
    notificationTimeout = setTimeout(() => {
        notification.classList.remove('show');
        notificationTimeout = null;
    }, duration);
}

// === MENU GENERATION ===

function createMenuItem(category, item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';
    menuItem.setAttribute('data-category', category);
    menuItem.setAttribute('data-value', item.id);
    menuItem.setAttribute('data-item-id', item.id); // Added data-item-id
    menuItem.setAttribute('role', 'button');
    menuItem.setAttribute('tabindex', '0');
    menuItem.setAttribute('aria-label', `Add ${item.name} to order`);
    
    menuItem.innerHTML = `
        <div class="item-image">${item.emoji}</div>
        <div class="item-name">${item.name}</div>
    `;
    
    menuItem.onclick = () => selectMenuItem(category, item.id, menuItem);
    menuItem.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectMenuItem(category, item.id, menuItem);
        }
    };
    
    return menuItem;
}

// Create and populate menu items
function createMenuItems() {
    // Initialize hat menu items
    const hatContainer = document.getElementById('hatMenuItems');
    if (hatContainer) {
        hatContainer.innerHTML = ''; // Clear existing items
        menuItems.hats.forEach(hat => {
            hatContainer.appendChild(createMenuItem('hats', hat));
        });
    }
    
    // Initialize item menu items
    const itemContainer = document.getElementById('itemMenuItems');
    if (itemContainer) {
        itemContainer.innerHTML = ''; // Clear existing items
        menuItems.items.forEach(item => {
            itemContainer.appendChild(createMenuItem('items', item));
        });
    }
    
    console.log('✅ Menu items created with emojis');
}

// Initialize menu system
function initializeMenu() {
    console.log('🍽️ Setting up menu...');
    
    // Create menu items
    createMenuItems();
    
    // Set up menu interactions
    setupMenuInteractions();
    
    console.log('✅ Menu setup complete');
}

// Set up menu interaction handlers
function setupMenuInteractions() {
    // Add keyboard navigation for menu items
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const focusedElement = document.activeElement;
            if (focusedElement && focusedElement.classList.contains('menu-item')) {
                e.preventDefault();
                focusedElement.click();
            }
        }
    });
}

// === ORDER MANAGEMENT ===

// Select menu item function
function selectMenuItem(category, itemId, element) {
    try {
        console.log(`Selecting ${category}: ${itemId}`);
        
        // Remove previous selection in this category
        document.querySelectorAll(`[data-category="${category}"]`).forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selected class to current item
        element.classList.add('selected');
        
        // Update current order
        if (category === 'hats') {
            currentOrder.hat = itemId;
            currentOrder.hatName = getMenuItemName(itemId, category) || 'No Topping';
        } else if (category === 'items') {
            currentOrder.item = itemId;
            currentOrder.itemName = getMenuItemName(itemId, category) || 'No Side';
        }
        
        // Update PFP and order summary
        loadBaseImage(); // This will reload the base and then load layers
        updateOrderSummary();
        
        // Play selection sound
        playSound('select');
        
        // Show notification
        const itemName = getMenuItemName(itemId, category) || (category === 'hats' ? 'No Topping' : 'No Side');
        showNotification(`Selected: ${itemName}`, 'success');
        
        console.log(`✅ Selected ${itemName}`);
    } catch (error) {
        console.error('Error in selectMenuItem:', error);
    }
}

function loadLayer(type, value) {
    if (value === '') {
        layers[type] = null;
        drawPFP();
    } else {
        layers[type] = new Image();
        layers[type].onload = () => drawPFP();
        layers[type].onerror = () => {
            console.error(`Failed to load ${type} image:`, value);
            showNotification(`❌ Error loading ${type}`);
        };
        layers[type].src = `ASSETS/${type}/${value}.png`;
    }
}

// Update the order summary display
function updateOrderSummary() {
    const orderItemsContainer = document.querySelector('.order-items');
    const subtotalElement = document.querySelector('.subtotal-amount');
    const totalElement = document.querySelector('.total-amount');
    
    // Clear current items
    orderItemsContainer.innerHTML = '';
    
    let subtotal = 0;
    
    // Add base chicken
    if (currentOrder.base) {
        const baseItem = document.createElement('div');
        baseItem.className = 'order-item';
        baseItem.innerHTML = `
            <div class="order-item-left">
                <div class="item-qty">1</div>
                <div class="item-name">Original Paco</div>
            </div>
            <div class="item-price">$0.00</div>
        `;
        orderItemsContainer.appendChild(baseItem);
    }
    
    // Add hat/topping
    if (currentOrder.hat) {
        const hatName = currentOrder.hatName || getMenuItemName(currentOrder.hat, 'hats');
        if (hatName && hatName !== 'No Topping') {
            const hatItem = document.createElement('div');
            hatItem.className = 'order-item';
            hatItem.innerHTML = `
                <div class="order-item-left">
                    <div class="item-qty">1</div>
                    <div class="item-name">${hatName}</div>
                </div>
                <div class="item-price">$0.50</div>
            `;
            orderItemsContainer.appendChild(hatItem);
            subtotal += 0.50;
        }
    }
    
    // Add item/side
    if (currentOrder.item) {
        const itemName = currentOrder.itemName || getMenuItemName(currentOrder.item, 'items');
        if (itemName && itemName !== 'No Side') {
            const sideItem = document.createElement('div');
            sideItem.className = 'order-item';
            sideItem.innerHTML = `
                <div class="order-item-left">
                    <div class="item-qty">1</div>
                    <div class="item-name">${itemName}</div>
                </div>
                <div class="item-price">$0.00</div>
            `;
            orderItemsContainer.appendChild(sideItem);
        }
    }
    
    // Show "No Topping" if no hat selected
    if (!currentOrder.hat || currentOrder.hatName === 'No Topping') {
        const noToppingItem = document.createElement('div');
        noToppingItem.className = 'order-item';
        noToppingItem.innerHTML = `
            <div class="order-item-left">
                <div class="item-qty">1</div>
                <div class="item-name">No Topping</div>
            </div>
            <div class="item-price">$0.50</div>
        `;
        orderItemsContainer.appendChild(noToppingItem);
        subtotal += 0.50;
    }
    
    // Show "No Side" if no item selected
    if (!currentOrder.item || currentOrder.itemName === 'No Side') {
        const noSideItem = document.createElement('div');
        noSideItem.className = 'order-item';
        noSideItem.innerHTML = `
            <div class="order-item-left">
                <div class="item-qty">1</div>
                <div class="item-name">No Side</div>
            </div>
            <div class="item-price">$0.00</div>
        `;
        orderItemsContainer.appendChild(noSideItem);
    }
    
    // Update totals
    const blockchainFee = 0.01;
    const total = subtotal + blockchainFee;
    
    if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;
    
    // Update order count
    updateOrdersServed();
}

function updateOrderTotal() {
    let subtotal = 0;
    
    // Add hat price
    if (currentOrder.hat) {
        const hatItem = menuItems.hats.find(h => h.id === currentOrder.hat);
        if (hatItem) subtotal += hatItem.price;
    }
    
    // Add item price
    if (currentOrder.item) {
        const itemItem = menuItems.items.find(i => i.id === currentOrder.item);
        if (itemItem) subtotal += itemItem.price;
    }
    
    const blockchainFee = 0.01;
    const total = subtotal + blockchainFee;
    
    // Update display
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('finalTotal');
    
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

// === PFP GENERATION ===

function loadBaseImage() {
    if (!canvas) return;
    
    layers.base = new Image();
    layers.base.onload = () => {
        drawPFP();
        console.log('✅ Base Paco chicken loaded');
    };
    layers.base.onerror = () => {
        console.error('Failed to load base image');
        showNotification('❌ Error loading base chicken');
    };
    layers.base.src = 'ASSETS/base/PACO.png';
}

function drawPFP() {
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw base chicken
    if (layers.base && layers.base.complete) {
        ctx.drawImage(layers.base, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw hat topping
    if (layers.hat && layers.hat.complete) {
        ctx.drawImage(layers.hat, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw item side
    if (layers.item && layers.item.complete) {
        ctx.drawImage(layers.item, 0, 0, canvas.width, canvas.height);
    }
    
    // Update canvas aria-label
    const hat = currentOrder.hatName || 'no topping';
    const item = currentOrder.itemName || 'no side';
    if (canvas) {
        canvas.setAttribute('aria-label', `Your custom Paco chicken with ${hat} and ${item}`);
    }
}

// === QUICK ORDERS ===

function quickOrder(hatId, itemId) {
    playChickenSound();
    
    // Find the menu items
    const hatItem = menuItems.hats.find(h => h.id === hatId);
    const itemItem = menuItems.items.find(i => i.id === itemId);
    
    // Clear current selections
    document.querySelectorAll('.menu-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Update order state immediately
    if (hatItem) {
        const hatElement = document.querySelector(`[data-category="hats"][data-value="${hatId}"]`);
        if (hatElement) {
            hatElement.classList.add('selected');
            currentOrder.hat = hatId;
            currentOrder.hatName = hatItem.name;
        }
    }
    
    if (itemItem) {
        const itemElement = document.querySelector(`[data-category="items"][data-value="${itemId}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
            currentOrder.item = itemId;
            currentOrder.itemName = itemItem.name;
        }
    }
    
    // Load base layer first, then load traits after base is ready
    if (!canvas) return;
    
    layers.base = new Image();
    layers.base.onload = () => {
        // Base loaded, now load the selected traits
        if (hatItem) {
            loadLayer('hat', hatId);
        }
        if (itemItem) {
            loadLayer('item', itemId);
        }
        drawPFP();
        console.log('✅ Quick combo loaded with base + traits');
    };
    layers.base.onerror = () => {
        console.error('Failed to load base image for quick combo');
        showNotification('❌ Error loading base chicken');
    };
    layers.base.src = 'ASSETS/base/PACO.png';
    
    updateOrderSummary();
    updateOrderTotal();
    
    showNotification(`🍽️ Quick order prepared! ${hatItem?.name} with ${itemItem?.name}`);
}

function randomizePFP() {
    playPartySound();
    
    // Random selections
    const randomHat = Math.random() < 0.7 ? menuItems.hats[Math.floor(Math.random() * menuItems.hats.length)] : null;
    const randomItem = Math.random() < 0.7 ? menuItems.items[Math.floor(Math.random() * menuItems.items.length)] : null;
    
    // Clear current selections
    document.querySelectorAll('.menu-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Update order state immediately
    if (randomHat) {
        const hatElement = document.querySelector(`[data-category="hats"][data-value="${randomHat.id}"]`);
        if (hatElement) {
            hatElement.classList.add('selected');
            currentOrder.hat = randomHat.id;
            currentOrder.hatName = randomHat.name;
        }
    } else {
        // Select "No Topping"
        const noHatElement = document.querySelector(`[data-category="hats"][data-value=""]`);
        if (noHatElement) {
            noHatElement.classList.add('selected');
            currentOrder.hat = '';
            currentOrder.hatName = '';
        }
    }
    
    if (randomItem) {
        const itemElement = document.querySelector(`[data-category="items"][data-value="${randomItem.id}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
            currentOrder.item = randomItem.id;
            currentOrder.itemName = randomItem.name;
        }
    } else {
        // Select "No Side"
        const noItemElement = document.querySelector(`[data-category="items"][data-value=""]`);
        if (noItemElement) {
            noItemElement.classList.add('selected');
            currentOrder.item = '';
            currentOrder.itemName = '';
        }
    }
    
    // Load base layer first, then load traits after base is ready
    if (!canvas) return;
    
    layers.base = new Image();
    layers.base.onload = () => {
        // Base loaded, now load the random traits
        if (randomHat) {
            loadLayer('hat', randomHat.id);
        } else {
            loadLayer('hat', ''); // No hat
        }
        
        if (randomItem) {
            loadLayer('item', randomItem.id);
        } else {
            loadLayer('item', ''); // No item
        }
        
        drawPFP();
        console.log('✅ Random combo loaded with base + traits');
    };
    layers.base.onerror = () => {
        console.error('Failed to load base image for random combo');
        showNotification('❌ Error loading base chicken');
    };
    layers.base.src = 'ASSETS/base/PACO.png';
    
    updateOrderSummary();
    updateOrderTotal();
    
    showNotification('🎲 Surprise order prepared by our chef!');
}

// === ORDER COMPLETION ===

function downloadPFP() {
    if (!canvas) return;
    
    try {
        // Play success sound
        playSound('success');
        
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const hat = currentOrder.hat || 'plain';
        const item = currentOrder.item || 'nosides';
        
        link.download = `paco-order-${orderNumber.toString().padStart(4, '0')}-${hat}-${item}-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        
        // Update statistics
        ordersServed++;
        orderNumber++;
        updateOrdersServed();
        updateOrderNumber();
        
        showNotification('🎉 Order complete! Enjoy your Paco chicken!');
        
        // Analytics
        console.log(`Order completed: ${hat} + ${item}`);
        
        // Track orders locally
        const orders = JSON.parse(localStorage.getItem('pacoOrders') || '[]');
        orders.push({
            orderNumber: orderNumber - 1,
            hat: currentOrder.hat,
            item: currentOrder.item,
            hatName: currentOrder.hatName,
            itemName: currentOrder.itemName,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('pacoOrders', JSON.stringify(orders));
        
        // Track order globally with Supabase
        recordGlobalOrder({
            hat: currentOrder.hat,
            hatName: currentOrder.hatName,
            item: currentOrder.item,
            itemName: currentOrder.itemName,
            total: calculateOrderTotal()
        });
        
        // Easter eggs
        if (ordersServed === 5) {
            setTimeout(() => {
                showNotification('🏆 5 orders served! You\'re a loyal customer!', 4000);
            }, 2000);
        } else if (ordersServed === 10) {
            setTimeout(() => {
                showNotification('🔥 10 orders! You\'ve discovered all our secrets!', 4000);
                enterPartyMode();
            }, 2000);
        }
        
    } catch (error) {
        console.error('Order failed:', error);
        showNotification('❌ Order failed - please try again');
    }
}

// Clear order function
function clearOrder() {
    console.log('🗑️ Clearing order...');
    
    // Reset selections
    document.querySelectorAll('.menu-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Reset current order to defaults
    currentOrder.base = 'PACO';
    currentOrder.hat = '';
    currentOrder.hatName = 'No Topping';
    currentOrder.item = '';
    currentOrder.itemName = 'No Side';
    
    // Select default "none" options
    setTimeout(() => {
        const noToppingElement = document.querySelector('[data-item-id=""][data-category="hats"]');
        if (noToppingElement) {
            noToppingElement.classList.add('selected');
        }
        
        const noSideElement = document.querySelector('[data-item-id=""][data-category="items"]');
        if (noSideElement) {
            noSideElement.classList.add('selected');
        }
        
        // Update PFP and order summary
        loadBaseImage();
        updateOrderSummary();
    }, 50);
    
            playKitchenSound();
    
    // Show notification
    showNotification('Order cleared! Back to basics 🐔', 'info');
    
    console.log('✅ Order cleared successfully');
}

// === INTERACTIVE ELEMENTS ===

function canvasClicked() {
    playKitchenSound();
    if (canvas) {
        canvas.style.transform = 'scale(1.05) rotate(5deg)';
        setTimeout(() => {
            canvas.style.transform = '';
        }, 300);
    }
    
    clickCount++;
    if (clickCount === 3) {
        showNotification('🐔 Your chicken loves the attention!');
        createParticleBurst(10);
        clickCount = 0;
    }
    
    setTimeout(() => {
        if (clickCount > 0) clickCount--;
    }, 1000);
}

function logoClicked() {
    playKitchenSound();
    const logo = document.querySelector('.header-logo');
    if (logo) {
        logo.style.transform = 'scale(1.2) rotate(360deg)';
        setTimeout(() => {
            logo.style.transform = '';
        }, 500);
    }
    
    createParticleBurst(5);
}

function enterPartyMode() {
    playPartySound();
    showNotification('🎉 RESTAURANT PARTY MODE!', 4000);
    
    const logo = document.querySelector('.header-logo');
    const title = document.querySelector('.palace-title');
    
    if (logo) logo.style.animation = 'float 1s ease-in-out infinite';
    if (title) title.style.animation = 'pulse 1s ease-in-out infinite';
    
    // Spawn flying chickens
    for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnFlyingChicken(), i * 800);
    }
    
    createParticleBurst(20);
    
    const originalTitle = document.title;
    document.title = '🎉 PARTY AT PACO\'S! 🍗 ' + originalTitle;
    
    setTimeout(() => {
        if (logo) logo.style.animation = '';
        if (title) title.style.animation = '';
        document.title = originalTitle;
    }, 10000);
}

function spawnFlyingChicken() {
    const chicken = document.createElement('div');
    chicken.textContent = '🍗';
    chicken.className = 'flying-chicken';
    chicken.style.top = Math.random() * 50 + 20 + '%';
    chicken.style.fontSize = Math.random() * 20 + 30 + 'px';
    chicken.style.animationDuration = (Math.random() * 2 + 3) + 's';
    
    document.body.appendChild(chicken);
    
    setTimeout(() => {
        if (document.body.contains(chicken)) {
            document.body.removeChild(chicken);
        }
    }, 5000);
}

// === PARTICLE SYSTEM ===

function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + 'vw';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
    
    const colors = ['#dc2626', '#fbbf24', '#f97316'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    const size = Math.random() * 8 + 4;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    document.body.appendChild(particle);
    
    setTimeout(() => {
        if (document.body.contains(particle)) {
            document.body.removeChild(particle);
        }
    }, 6000);
}

function createParticleBurst(count = 10) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => createParticle(), i * 100);
    }
}

// === KONAMI CODE ===

function setupKonamiCode() {
    document.addEventListener('keydown', function(e) {
        konamiCode.push(e.code);
        if (konamiCode.length > konamiSequence.length) {
            konamiCode.shift();
        }
        
        if (konamiCode.length === konamiSequence.length && 
            konamiCode.every((key, i) => key === konamiSequence[i])) {
            enterPartyMode();
            showNotification('🎮 Secret restaurant code activated!', 5000);
            konamiCode = [];
            
            setTimeout(() => {
                showNotification('🏆 You found the secret menu!', 4000);
            }, 2000);
        }
    });
}

// === BUTTON FUNCTIONS ===

function buyPaco() {
    playKitchenSound();
    showNotification('🚀 Redirecting to franchise opportunities...');
    setTimeout(() => {
        showNotification('💡 Add your DEX link in the buyPaco() function');
    }, 2000);
}

function copyContract() {
    const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(contractAddress).then(() => {
            playKitchenSound();
            showNotification('📋 Franchise contract copied!');
        }).catch(() => {
            showNotification('❌ Failed to copy contract');
        });
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = contractAddress;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            playKitchenSound();
            showNotification('📋 Franchise contract copied!');
        } catch (err) {
            showNotification('❌ Failed to copy contract');
        }
        
        document.body.removeChild(textArea);
    }
}

function openDiscord() {
    try {
        window.open('https://discord.gg/MT9Qva8r8t', '_blank');
        playKitchenSound();
        showNotification('💬 Opening Discord Kitchen...', 'info');
    } catch (error) {
        console.error('Error opening Discord:', error);
    }
}

function openTwitter() {
    try {
        window.open('https://x.com/PacoTheChicken', '_blank');
        playKitchenSound();
        showNotification('🐦 Opening Twitter Updates...', 'info');
    } catch (error) {
        console.error('Error opening Twitter:', error);
    }
}

function openDEX() {
    try {
        // Placeholder URL - can be updated with actual DEX link later
        window.open('https://app.uniswap.org/#/swap', '_blank');
        playKitchenSound();
        showNotification('💱 Opening franchise opportunities...', 'info');
    } catch (error) {
        console.error('Error opening DEX:', error);
    }
}

// === UTILITY FUNCTIONS ===

function savePreferences() {
    const prefs = {

        ordersServed,
        easterEggFound,
        orderNumber,
        timestamp: Date.now()
    };
    localStorage.setItem('pacoRestaurantPrefs', JSON.stringify(prefs));
}

function loadPreferences() {
    try {
        const saved = localStorage.getItem('pacoRestaurantPrefs');
        if (saved) {
            const prefs = JSON.parse(saved);
        
            ordersServed = prefs.ordersServed || 0;
            easterEggFound = prefs.easterEggFound || false;
            orderNumber = prefs.orderNumber || 1;
            updateOrdersServed();
            updateOrderNumber();
        }
    } catch (e) {
        console.warn('Failed to load preferences:', e);
    }
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('Restaurant error:', e.error);
    showNotification('⚠️ Kitchen hiccup, but we\'re still cooking!');
});

// Handle visibility change
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        savePreferences();
    }
});

// === PAGE INITIALIZATION ===

// Simple loading screen fix - hide after 3 seconds no matter what
setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}, 3000);

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, starting restaurant initialization...');
    
    try {
        // Initialize restaurant
        initializeRestaurant();
        console.log('✅ Restaurant initialized successfully');
    } catch (error) {
        console.error('❌ Error during restaurant initialization:', error);
    }
});



// === MAIN INITIALIZATION ===

function initializeRestaurant() {
    console.log('🏪 Initializing Paco\'s Chicken Palace...');
    
    try {
        // Set initial base selection
        currentOrder.base = 'PACO';
        
        // Initialize menu sections
        createMenuItems();
        
        // Initialize order number
        initializeOrderNumber();
        
        // Set default selections to "none" options after menu items are created
        setTimeout(() => {
            try {
                // Find and select the "No Topping" option
                const noToppingElement = document.querySelector('[data-item-id=""][data-category="hats"]');
                if (noToppingElement) {
                    noToppingElement.classList.add('selected');
                    currentOrder.hat = '';
                    currentOrder.hatName = 'No Topping';
                }
                
                // Find and select the "No Side" option  
                const noSideElement = document.querySelector('[data-item-id=""][data-category="items"]');
                if (noSideElement) {
                    noSideElement.classList.add('selected');
                    currentOrder.item = '';
                    currentOrder.itemName = 'No Side';
                }
                
                // Initial PFP generation and order summary update
                loadBaseImage();
                updateOrderSummary();
            } catch (error) {
                console.error('Error setting default selections:', error);
            }
        }, 100);
        
        // Initialize canvas
        initializeCanvas();
        
        // Load saved preferences
        loadPreferences();
        
        // Setup Konami code if function exists
        if (typeof setupKonamiCode === 'function') {
            setupKonamiCode();
        }
        
        // Initialize global stats from Supabase (non-blocking)
        initializeGlobalStats().catch(error => {
            console.warn('⚠️ Supabase initialization failed silently:', error);
        });
        
        console.log('✅ Restaurant initialized successfully!');
        
        // Hide loading screen after successful initialization
        setTimeout(() => {
            hideLoadingScreen();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error in initializeRestaurant:', error);
        // Ensure we still update the order summary even if other things fail
        try {
            updateOrderSummary();
        } catch (e) {
            console.error('❌ Error updating order summary:', e);
        }
        
        // Hide loading screen even if initialization fails
        setTimeout(() => {
            hideLoadingScreen();
        }, 1000);
    }
}

// Save preferences before page unload
window.addEventListener('beforeunload', savePreferences);

// Note: Main initialization is handled by the DOMContentLoaded event listener above
// This redundant initialization block has been removed to prevent conflicts 

// === ESSENTIAL MISSING FUNCTIONS ===

// Get menu item name by ID and category
function getMenuItemName(itemId, category) {
    try {
        if (!itemId) return null;
        
        const items = category === 'hats' ? menuItems.hats : menuItems.items;
        const item = items.find(item => item.id === itemId);
        return item ? item.name : null;
    } catch (error) {
        console.error('Error getting menu item name:', error);
        return null;
    }
}

// Initialize canvas for PFP generation
function initializeCanvas() {
    try {
        canvas = document.getElementById('pfpCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return false;
        }
        
        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Canvas context not available');
            return false;
        }
        
        // Set canvas properties to match asset resolution
        canvas.width = 1600;
        canvas.height = 1600;
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        console.log('✅ Canvas initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing canvas:', error);
        return false;
    }
}

// Show notification (simple fallback if advanced version doesn't exist)
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Try to show visual notification if container exists
    try {
        // Create simple notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Trigger show animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    } catch (e) {
        // Notification failed, just log
        console.log('Visual notification failed:', e);
    }
}

// Play sound - maps to specific restaurant sounds
function playSound(soundType) {
    if (!audioEnabled) return;
    
    try {
        switch(soundType) {
            case 'select':
                playChickenSound(); // Trait selection gets chicken sound
                break;
            case 'clear':
                playKitchenSound(); // Clear order gets kitchen sound
                break;
            case 'click':
                playOrderSound(); // Button clicks get order sound
                break;
            case 'success':
                playCompleteOrderSound(); // Success gets cash register sound
                break;
            case 'welcome':
                playCompleteOrderSound(); // Welcome gets cash register sound
                break;
            default:
                playChickenSound(); // Default to chicken sound
                break;
        }
    } catch (e) {
        console.log('Audio playback failed:', e);
    }
}

// Load base image for canvas
function loadBaseImage() {
    try {
        const canvas = document.getElementById('pfpCanvas');
        if (!canvas) {
            console.log('Canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.log('Canvas context not available');
            return;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Load base image
        const baseImg = new Image();
        baseImg.crossOrigin = 'anonymous';
        baseImg.onload = function() {
            try {
                ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
                console.log('✅ Base image loaded');
                
                // Load additional layers if needed
                loadSelectedLayers();
            } catch (error) {
                console.error('Error drawing base image:', error);
            }
        };
        baseImg.onerror = function() {
            console.error('Failed to load base image');
            // Draw fallback
            drawFallbackImage(ctx, canvas);
        };
        baseImg.src = 'ASSETS/base/PACO.png';
    } catch (error) {
        console.error('Error in loadBaseImage:', error);
    }
}

// Load selected hat and item layers
function loadSelectedLayers() {
    try {
        const canvas = document.getElementById('pfpCanvas');
        const ctx = canvas.getContext('2d');
        
        // Load hat layer if selected
        if (currentOrder.hat && currentOrder.hat !== '') {
            const hatImg = new Image();
            hatImg.crossOrigin = 'anonymous';
            hatImg.onload = function() {
                ctx.drawImage(hatImg, 0, 0, canvas.width, canvas.height);
            };
            hatImg.src = `ASSETS/hat/${currentOrder.hat}.png`;
        }
        
        // Load item layer if selected
        if (currentOrder.item && currentOrder.item !== '') {
            const itemImg = new Image();
            itemImg.crossOrigin = 'anonymous';
            itemImg.onload = function() {
                ctx.drawImage(itemImg, 0, 0, canvas.width, canvas.height);
            };
            itemImg.src = `ASSETS/item/${currentOrder.item}.png`;
        }
    } catch (error) {
        console.error('Error loading layers:', error);
    }
}

// Draw fallback image if base image fails to load
function drawFallbackImage(ctx, canvas) {
    try {
        // Draw a simple fallback
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw chicken emoji as text
        ctx.fillStyle = '#000';
        ctx.font = '100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐔', canvas.width / 2, canvas.height / 2);
        
        console.log('✅ Fallback image drawn');
    } catch (error) {
        console.error('Error drawing fallback:', error);
    }
} 

// === DOWNLOAD & ORDER FUNCTIONS ===

// Download PFP function (called by place order button)
async function downloadPFP() {
    try {
        console.log('📋 Processing order...');
        
        const canvas = document.getElementById('pfpCanvas');
        if (!canvas) {
            showNotification('Canvas not found!', 'error');
            return;
        }
        
        // Create download link
        const link = document.createElement('a');
        link.download = `paco-chicken-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Record order in Supabase database for global tracking
        await recordGlobalOrder({
            hat: currentOrder.hat,
            hatName: currentOrder.hatName,
            item: currentOrder.item,
            itemName: currentOrder.itemName,
            total: parseFloat(document.querySelector('.total-amount').textContent.replace('$', ''))
        });
        
        // Update local orders served count
        ordersServed++;
        localStorage.setItem('ordersServed', ordersServed.toString());
        
        // Update order number for next order
        orderNumber++;
        updateOrderNumber();
        
        playKitchenSound();
        
        // Show success message
        showNotification('🎉 Order complete! Your Paco has been downloaded!', 'success');
        
        console.log('✅ Order processed successfully');
    } catch (error) {
        console.error('Error downloading PFP:', error);
        showNotification('Download failed. Please try again.', 'error');
    }
}

// Copy PFP to clipboard function
async function copyPFPToClipboard() {
    try {
        console.log('📋 Copying to clipboard...');
        
        const canvas = document.getElementById('pfpCanvas');
        if (!canvas) {
            showNotification('Canvas not found!', 'error');
            return;
        }
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });
        
        if (!blob) {
            showNotification('Failed to create image', 'error');
            return;
        }
        
                    // Copy to clipboard using the Clipboard API
        if (navigator.clipboard && navigator.clipboard.write) {
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([clipboardItem]);
            
            // Record order in Supabase database for global tracking
            await recordGlobalOrder({
                hat: currentOrder.hat,
                hatName: currentOrder.hatName,
                item: currentOrder.item,
                itemName: currentOrder.itemName,
                total: parseFloat(document.querySelector('.total-amount').textContent.replace('$', ''))
            });
            
            // Update local orders served count
            ordersServed++;
            localStorage.setItem('ordersServed', ordersServed.toString());
            
            // Update order number for next order
            orderNumber++;
            updateOrderNumber();
            
            // Play success sound
            playSound('success');
            
            // Show success message
            showNotification('📋 Paco copied to clipboard!', 'success');
            console.log('✅ PFP copied to clipboard successfully');
        } else {
            // Fallback: show message to manually copy
            showNotification('🚫 Clipboard not supported. Use Download instead.', 'error');
        }
        
    } catch (error) {
        console.error('Error copying PFP to clipboard:', error);
        
        // Check if it's a permission error
        if (error.name === 'NotAllowedError') {
            showNotification('📋 Clipboard permission denied. Use Download instead.', 'error');
        } else {
            showNotification('Copy failed. Use Download instead.', 'error');
        }
    }
}

// Note: Duplicate functions have been removed - original implementations are above 