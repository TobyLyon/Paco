// ===== PACO'S CHICKEN PALACE - RESTAURANT SCRIPT =====

// === GLOBAL VARIABLES ===
let audioEnabled = true;
let audioContext;
let clickCount = 0;
let konamiCode = [];
let ordersServed = 0;
let easterEggFound = false;
let isLoaded = false;
let orderNumber = 1;

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
        { id: 'crack-pipe', name: 'Crispy Chips', description: 'Addictively crunchy side snack', price: 1.00, emoji: '🍟' },
        { id: 'cash', name: 'Money Munchies', description: 'Green bills made of lettuce', price: 1.00, emoji: '💰' },
        { id: 'abs-coin', name: 'Crypto Coins', description: 'Golden onion rings, digital delicious', price: 1.00, emoji: '🪙' },
        { id: 'joint', name: 'Joint Ventures', description: 'Twisted breadsticks, business style', price: 1.00, emoji: '🥖' },
        { id: 'wand', name: 'Magic Sticks', description: 'Enchanted drumsticks with special powers', price: 1.00, emoji: '✨' },
        { id: 'chicken-sandwich', name: 'Mini-Me Sandwich', description: 'Chicken sandwich for your chicken', price: 1.00, emoji: '🥪' },
        { id: 'knife', name: 'Cutting Edge Cutlery', description: 'Premium dining utensils', price: 1.00, emoji: '🍴' },
        { id: 'fork', name: 'Fine Dining Fork', description: 'Elegant eating experience', price: 1.00, emoji: '🍽️' }
    ]
};

// Canvas and layer management
const canvas = document.getElementById('pfpCanvas');
const ctx = canvas?.getContext('2d');

// Layer images storage
const layers = {
    base: null,
    hat: null,
    item: null
};

// Current order
const currentOrder = {
    hat: '',
    item: '',
    hatName: '',
    itemName: ''
};

// === LOADING SYSTEM ===

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.remove();
            }, 500);
        }, 1000);
    }
}

function updateOrderNumber() {
    const orderNumEl = document.getElementById('orderNumber');
    if (orderNumEl) {
        orderNumEl.textContent = String(orderNumber).padStart(4, '0');
    }
}

function updateOrdersServed() {
    const ordersEl = document.getElementById('ordersServed');
    if (ordersEl) {
        ordersEl.textContent = ordersServed;
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
        
        oscillator.frequency.value = frequency;
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
    playTone(800, 0.1, 'square');
    setTimeout(() => playTone(600, 0.1, 'triangle'), 150);
    setTimeout(() => playTone(900, 0.2, 'sine'), 300);
}

function playOrderSound() {
    if (!audioEnabled) return;
    playTone(600, 0.15);
    setTimeout(() => playTone(700, 0.15), 100);
}

function playCompleteOrderSound() {
    if (!audioEnabled) return;
    // Cash register sound
    playTone(800, 0.1);
    setTimeout(() => playTone(1000, 0.1), 100);
    setTimeout(() => playTone(1200, 0.2), 200);
}

function playKitchenSound() {
    if (!audioEnabled) return;
    // Sizzling sound
    playTone(400, 0.3, 'sawtooth', 0.05);
}

function playPartySound() {
    if (!audioEnabled) return;
    const notes = [262, 294, 330, 349, 392, 440, 494, 523];
    notes.forEach((note, i) => {
        setTimeout(() => playTone(note, 0.1, 'triangle'), i * 100);
    });
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    const toggle = document.querySelector('.audio-toggle');
    if (toggle) {
        toggle.textContent = audioEnabled ? '🔊' : '🔇';
        toggle.title = audioEnabled ? 'Turn restaurant sounds off' : 'Turn restaurant sounds on';
    }
    
    if (audioEnabled) {
        playCompleteOrderSound();
        showNotification('🔊 Restaurant sounds enabled!');
    } else {
        showNotification('🔇 Restaurant sounds disabled');
    }
    
    localStorage.setItem('pacoAudioEnabled', audioEnabled);
}

// === NOTIFICATION SYSTEM ===

function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    if (notification.classList.contains('show')) {
        setTimeout(() => showNotification(message, duration), 1000);
        return;
    }
    
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// === MENU GENERATION ===

function createMenuItem(category, item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';
    menuItem.setAttribute('data-category', category);
    menuItem.setAttribute('data-value', item.id);
    menuItem.setAttribute('role', 'button');
    menuItem.setAttribute('tabindex', '0');
    menuItem.setAttribute('aria-label', `Add ${item.name} to order`);
    
    menuItem.innerHTML = `
        <div class="item-image">${item.emoji}</div>
        <div class="item-name">${item.name}</div>
    `;
    
    menuItem.onclick = () => selectMenuItem(category, item, menuItem);
    menuItem.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectMenuItem(category, item, menuItem);
        }
    };
    
    return menuItem;
}

function initializeMenu() {
    // Initialize hat menu items
    const hatContainer = document.getElementById('hatMenuItems');
    if (hatContainer) {
        menuItems.hats.forEach(hat => {
            hatContainer.appendChild(createMenuItem('hat', hat));
        });
    }
    
    // Initialize item menu items
    const itemContainer = document.getElementById('itemMenuItems');
    if (itemContainer) {
        menuItems.items.forEach(item => {
            itemContainer.appendChild(createMenuItem('item', item));
        });
    }
    
    console.log('✅ Restaurant menu initialized with emojis');
}

// === ORDER MANAGEMENT ===

function selectMenuItem(category, item, element) {
    playOrderSound();
    
    // Remove selected class from all items in this category
    const categoryContainer = element.parentNode;
    categoryContainer.querySelectorAll('.menu-item').forEach(menuItem => {
        menuItem.classList.remove('selected');
    });
    
    // Select this item
    element.classList.add('selected');
    
    // Update current order
    if (category === 'hat') {
        currentOrder.hat = item.id;
        currentOrder.hatName = item.name;
        loadLayer('hat', item.id);
    } else if (category === 'item') {
        currentOrder.item = item.id;
        currentOrder.itemName = item.name;
        loadLayer('item', item.id);
    }
    
    updateOrderSummary();
    updateOrderTotal();
    
    // Visual feedback
    showNotification(`✅ Added ${item.name} to your order!`);
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
        layers[type].src = `Public/ASSETS/${type}/${value}.png`;
    }
}

function updateOrderSummary() {
    // Update hat order item
    const hatOrderItem = document.getElementById('orderHat');
    if (currentOrder.hatName) {  // Show if any hat is selected, including "No Topping"
        hatOrderItem.style.display = 'flex';
        hatOrderItem.querySelector('.item-name').textContent = currentOrder.hatName;
    } else {
        hatOrderItem.style.display = 'none';
    }
    
    // Update item order item
    const itemOrderItem = document.getElementById('orderItem');
    if (currentOrder.itemName) {  // Show if any item is selected, including "No Side"
        itemOrderItem.style.display = 'flex';
        itemOrderItem.querySelector('.item-name').textContent = currentOrder.itemName;
    } else {
        itemOrderItem.style.display = 'none';
    }
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
    layers.base.src = 'Public/ASSETS/base/PACO.png';
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
    playKitchenSound();
    
    // Find the menu items
    const hatItem = menuItems.hats.find(h => h.id === hatId);
    const itemItem = menuItems.items.find(i => i.id === itemId);
    
    // Clear current selections
    document.querySelectorAll('.menu-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Apply selections
    if (hatItem) {
        const hatElement = document.querySelector(`[data-category="hat"][data-value="${hatId}"]`);
        if (hatElement) {
            hatElement.classList.add('selected');
            currentOrder.hat = hatId;
            currentOrder.hatName = hatItem.name;
            loadLayer('hat', hatId);
        }
    }
    
    if (itemItem) {
        const itemElement = document.querySelector(`[data-category="item"][data-value="${itemId}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
            currentOrder.item = itemId;
            currentOrder.itemName = itemItem.name;
            loadLayer('item', itemId);
        }
    }
    
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
    
    // Apply random selections
    if (randomHat) {
        const hatElement = document.querySelector(`[data-category="hat"][data-value="${randomHat.id}"]`);
        if (hatElement) {
            hatElement.classList.add('selected');
            currentOrder.hat = randomHat.id;
            currentOrder.hatName = randomHat.name;
            loadLayer('hat', randomHat.id);
        }
    } else {
        // Select "No Topping"
        const noHatElement = document.querySelector(`[data-category="hat"][data-value=""]`);
        if (noHatElement) {
            noHatElement.classList.add('selected');
            currentOrder.hat = '';
            currentOrder.hatName = '';
            loadLayer('hat', '');
        }
    }
    
    if (randomItem) {
        const itemElement = document.querySelector(`[data-category="item"][data-value="${randomItem.id}"]`);
        if (itemElement) {
            itemElement.classList.add('selected');
            currentOrder.item = randomItem.id;
            currentOrder.itemName = randomItem.name;
            loadLayer('item', randomItem.id);
        }
    } else {
        // Select "No Side"
        const noItemElement = document.querySelector(`[data-category="item"][data-value=""]`);
        if (noItemElement) {
            noItemElement.classList.add('selected');
            currentOrder.item = '';
            currentOrder.itemName = '';
            loadLayer('item', '');
        }
    }
    
    updateOrderSummary();
    updateOrderTotal();
    
    showNotification('🎲 Surprise order prepared by our chef!');
}

// === ORDER COMPLETION ===

function downloadPFP() {
    if (!canvas) return;
    
    try {
        playCompleteOrderSound();
        
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
        
        // Track orders
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

function clearOrder() {
    playTone(300, 0.2);
    
    // Clear selections
    document.querySelectorAll('.menu-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Select "none" options
    const noHatElement = document.querySelector(`[data-category="hat"][data-value=""]`);
    const noItemElement = document.querySelector(`[data-category="item"][data-value=""]`);
    
    if (noHatElement) noHatElement.classList.add('selected');
    if (noItemElement) noItemElement.classList.add('selected');
    
    // Reset order to "none" options
    const noHatItem = menuItems.hats.find(h => h.id === '');
    const noItemItem = menuItems.items.find(i => i.id === '');
    
    currentOrder.hat = '';
    currentOrder.item = '';
    currentOrder.hatName = noHatItem ? noHatItem.name : '';
    currentOrder.itemName = noItemItem ? noItemItem.name : '';
    
    // Reset display
    loadLayer('hat', '');
    loadLayer('item', '');
    updateOrderSummary();
    updateOrderTotal();
    
    showNotification('🗑️ Order cleared - start fresh!');
}

// === INTERACTIVE ELEMENTS ===

function canvasClicked() {
    playChickenSound();
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
    playChickenSound();
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
    playCompleteOrderSound();
    showNotification('🚀 Redirecting to franchise opportunities...');
    setTimeout(() => {
        showNotification('💡 Add your DEX link in the buyPaco() function');
    }, 2000);
}

function copyContract() {
    const contractAddress = '0x1234567890abcdef1234567890abcdef12345678';
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(contractAddress).then(() => {
            playCompleteOrderSound();
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
            playCompleteOrderSound();
            showNotification('📋 Franchise contract copied!');
        } catch (err) {
            showNotification('❌ Failed to copy contract');
        }
        
        document.body.removeChild(textArea);
    }
}

function openTelegram() {
    playTone(500, 0.2);
    showNotification('📱 Opening Telegram Kitchen...');
}

function openTwitter() {
    playTone(600, 0.2);
    showNotification('🐦 Opening Twitter Updates...');
}

function openDEX() {
    playCompleteOrderSound();
    showNotification('💱 Opening franchise opportunities...');
}

// === UTILITY FUNCTIONS ===

function savePreferences() {
    const prefs = {
        audioEnabled,
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
            audioEnabled = prefs.audioEnabled !== false;
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

// === INITIALIZATION ===

function initializeRestaurant() {
    console.log('🍗 Opening Paco\'s Chicken Palace...');
    
    // Load preferences first
    loadPreferences();
    
    // Initialize canvas
    if (!canvas || !ctx) {
        console.error('Canvas not found');
        return;
    }
    
    // Set up audio toggle
    const toggle = document.querySelector('.audio-toggle');
    if (toggle) {
        toggle.textContent = audioEnabled ? '🔊' : '🔇';
        toggle.title = audioEnabled ? 'Turn restaurant sounds off' : 'Turn restaurant sounds on';
    }
    
    // Initialize restaurant systems
    loadBaseImage();
    initializeMenu();
    setupKonamiCode();
    
    // Set initial selections to "none" options after menu is created
    setTimeout(() => {
        const noHatElement = document.querySelector(`[data-category="hat"][data-value=""]`);
        const noItemElement = document.querySelector(`[data-category="item"][data-value=""]`);
        
        if (noHatElement) {
            noHatElement.classList.add('selected');
            // Set up the initial order with "No Topping"
            const noHatItem = menuItems.hats.find(h => h.id === '');
            if (noHatItem) {
                currentOrder.hat = '';
                currentOrder.hatName = noHatItem.name;
            }
        }
        
        if (noItemElement) {
            noItemElement.classList.add('selected');
            // Set up the initial order with "No Side"
            const noItemItem = menuItems.items.find(i => i.id === '');
            if (noItemItem) {
                currentOrder.item = '';
                currentOrder.itemName = noItemItem.name;
            }
        }
        
        updateOrderSummary();
        updateOrderTotal();
    }, 100); // Small delay to ensure menu is created
    
    // Start particle system
    setInterval(createParticle, 4000);
    
    // Hide loading screen
    hideLoadingScreen();
    
    // Welcome message
    setTimeout(() => {
        showNotification('🍗 Welcome to Paco\'s Chicken Palace!');
        isLoaded = true;
    }, 1500);
    
    console.log('🎉 Restaurant is now open for business!');
}

// Save preferences before page unload
window.addEventListener('beforeunload', savePreferences);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRestaurant);
} else {
    initializeRestaurant();
} 