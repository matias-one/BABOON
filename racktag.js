/* --------------------------------------------------
   LOAD LOCATION DATA (with cache fallback)
-------------------------------------------------- */

let locations = {};
let dataLoaded = false;

async function loadLocations() {
    const loadingMsg = document.getElementById('loading-msg');
    loadingMsg.style.display = 'block';

    try {
        const response = await fetch('data/locations.json');
        if (!response.ok) throw new Error('Network response not ok');
        locations = await response.json();
        localStorage.setItem('locations_cache', JSON.stringify(locations));
        console.log('✅ Locations loaded from network');
    } catch (err) {
        console.warn('⚠️ Fetch failed, using cached data:', err);
        const cached = localStorage.getItem('locations_cache');
        if (cached) {
            locations = JSON.parse(cached);
            console.log('✅ Locations loaded from cache');
        } else {
            alert('No location data available. Please connect to the internet once to load data.');
            return;
        }
    }

    dataLoaded = true;
    loadingMsg.style.display = 'none';
    updateGenerateButton();
}

loadLocations();

/* --------------------------------------------------
   RACKTAG STATE (with localStorage persistence)
-------------------------------------------------- */

const state = {
    warehouse: localStorage.getItem('rt_warehouse') || '',
    floor: localStorage.getItem('rt_floor') || '',
    section: localStorage.getItem('rt_section') || '',
    subsection: localStorage.getItem('rt_subsection') || '',
    labelSize: localStorage.getItem('rt_labelSize') || '4x2'
};

function saveState() {
    localStorage.setItem('rt_warehouse', state.warehouse);
    localStorage.setItem('rt_floor', state.floor);
    localStorage.setItem('rt_section', state.section);
    localStorage.setItem('rt_subsection', state.subsection);
    localStorage.setItem('rt_labelSize', state.labelSize);
}

// Restore UI
document.getElementById('sel-warehouse').innerText = state.warehouse;
document.getElementById('sel-floor').innerText = state.floor;
document.getElementById('sel-section').innerText = state.section;
document.getElementById('sel-subsection').innerText = state.subsection;
document.getElementById('label-size').value = state.labelSize;

/* --------------------------------------------------
   LABEL SIZE CONFIG
-------------------------------------------------- */

const LABEL_SIZES = {
    '4x2': {
        bodyClass: 'page-4x2',
        fontClass: 'label-small',
        pageCss: 'size: 4in 2in; margin: 0;',
        previewMaxWidth: '4in',
        qrSizePx: 600,      // high-res for print
        qrSizePreviewPx: 300 // preview size
    },
    '4x6': {
        bodyClass: 'page-4x6',
        fontClass: 'label-medium',
        pageCss: 'size: 4in 6in; margin: 0;',
        previewMaxWidth: '4in',
        qrSizePx: 600,
        qrSizePreviewPx: 300
    },
    'letter': {
        bodyClass: 'page-letter',
        fontClass: 'label-large',
        pageCss: 'size: letter; margin: 0;',
        previewMaxWidth: '4in',
        qrSizePx: 800,      // bigger for letter paper
        qrSizePreviewPx: 400
    }
};

function setPageSize(size) {
    const cfg = LABEL_SIZES[size] || LABEL_SIZES['4x2'];

    let styleTag = document.getElementById('dynamic-page-size');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-page-size';
        document.head.appendChild(styleTag);
    }
    styleTag.textContent = `@page { ${cfg.pageCss} }`;

    document.body.classList.remove('page-4x2', 'page-4x6', 'page-letter');
    document.body.classList.add(cfg.bodyClass);
    console.log('📐 Page size set to:', size);
}

/* --------------------------------------------------
   SCREEN HANDLING
-------------------------------------------------- */

const screens = {
    home: document.getElementById('screen-home'),
    selector: document.getElementById('screen-selector'),
    preview: document.getElementById('screen-preview'),
    confirm: document.getElementById('screen-confirm')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) {
        screens[name].classList.add('active');
        console.log('🖥️ Switched to screen:', name);
    } else {
        console.error('❌ Screen not found:', name);
    }
}

/* --------------------------------------------------
   SELECTOR OPENING
-------------------------------------------------- */

document.querySelectorAll('.pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        openSelector(target);
    });
});

/* --------------------------------------------------
   SELECTOR GRID GENERATION
-------------------------------------------------- */

function openSelector(type) {
    if (!dataLoaded) {
        alert('Location data is still loading. Please wait.');
        return;
    }

    showScreen('selector');
    document.getElementById('selector-title').innerText = 'Select ' + type;

    const grid = document.getElementById('selector-grid');
    grid.innerHTML = '';

    let options = [];
    if (type === 'warehouse') options = locations.warehouses;
    else if (type === 'floor') options = locations.floors;
    else if (type === 'section') options = locations.sections;
    else if (type === 'subsection') options = locations.subsections;

    options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'selector-item';
        div.innerText = opt;
        div.setAttribute('role', 'button');
        div.setAttribute('tabindex', '0');

        const select = () => {
            state[type] = opt;
            document.getElementById('sel-' + type).innerText = opt;
            saveState();
            showScreen('home');
            updateGenerateButton();
            console.log('📍 Selected', type, ':', opt);
        };

        div.addEventListener('click', select);
        div.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select();
            }
        });

        grid.appendChild(div);
    });
}

/* --------------------------------------------------
   BACK BUTTON
-------------------------------------------------- */

document.getElementById('selector-back').addEventListener('click', () => {
    showScreen('home');
});

/* --------------------------------------------------
   GENERATE BUTTON VALIDATION
-------------------------------------------------- */

function updateGenerateButton() {
    const btn = document.getElementById('btn-generate');
    const allFilled = state.warehouse && state.floor && state.section && state.subsection;
    btn.disabled = !allFilled;
    console.log('🔘 Generate button enabled:', allFilled);
}

updateGenerateButton();

document.getElementById('label-size').addEventListener('change', (e) => {
    state.labelSize = e.target.value;
    saveState();
    console.log('📏 Label size changed to:', state.labelSize);
});

/* --------------------------------------------------
   GENERATE LABEL – FIXED QR CODE
-------------------------------------------------- */

function renderQrCode(container, text, pixelSize) {
    container.innerHTML = '';

    // Use the global QRCode library
    if (typeof QRCode === 'undefined') {
        console.error('❌ QRCode library not loaded');
        container.innerHTML = '<p style="color:red;">QR library missing</p>';
        return;
    }

    try {
        // Generate QR with LOW error correction (fewer modules = larger cells)
        new QRCode(container, {
            text: text,
            width: pixelSize,
            height: pixelSize,
            correctLevel: QRCode.CorrectLevel.L   // L = lowest error correction
        });

        // The library creates a canvas; we keep it as-is, no CSS scaling
        const canvas = container.querySelector('canvas');
        if (canvas) {
            // Remove any inline styles that might cause scaling
            canvas.style.width = '';
            canvas.style.height = '';
            // Ensure crisp edges on print
            canvas.style.imageRendering = 'pixelated';
            canvas.style.imageRendering = 'crisp-edges';
        }
        console.log('✅ QR code generated (size:', pixelSize, 'px)');
    } catch (err) {
        console.error('❌ QR generation error:', err);
        container.innerHTML = '<p style="color:red;">QR Error</p>';
    }
}

document.getElementById('btn-generate').addEventListener('click', () => {
    console.log('🟢 GENERATE button clicked!');

    if (!state.warehouse || !state.floor || !state.section || !state.subsection) {
        alert('Please select all location fields.');
        return;
    }

    console.log('✅ All fields are filled');

    const shelfID = `${state.warehouse}-${state.floor}-${state.section}-${state.subsection}`;
    document.getElementById('shelf-id').innerText = shelfID;
    document.getElementById('location-string').innerText =
        `${state.warehouse} / ${state.floor} / ${state.section} / ${state.subsection}`;

    const size = state.labelSize;
    const cfg = LABEL_SIZES[size] || LABEL_SIZES['4x2'];
    const label = document.getElementById('label');

    label.style.maxWidth = cfg.previewMaxWidth;

    label.classList.remove('label-small', 'label-medium', 'label-large');
    label.classList.add(cfg.fontClass);

    // Choose QR pixel size: larger for print, smaller for preview
    // We'll always use the high-res size for both, but preview container will clamp it visually.
    const qrSize = cfg.qrSizePx; // 600 or 800
    const qrBox = document.getElementById('qr-container');

    // Set the container's size to match the QR canvas size (in pixels) to avoid scaling
    // But we need to respect the preview's max-width; we'll just let the container be as wide as it wants.
    // We set the canvas size directly via the QR generator, and the container will wrap it.
    renderQrCode(qrBox, shelfID, qrSize);

    // Now force the container to size itself to the canvas (no extra padding)
    // We'll add a CSS rule for this later.

    setPageSize(size);
    showScreen('preview');
    console.log('👀 Preview screen should be visible now');
});

/* --------------------------------------------------
   PRINT LABEL
-------------------------------------------------- */

document.getElementById('btn-print').addEventListener('click', () => {
    console.log('🖨️ Print button clicked');
    setPageSize(state.labelSize);
    window.print();
    showScreen('confirm');
});

/* --------------------------------------------------
   DOWNLOAD PNG (fallback for Bluetooth printing)
-------------------------------------------------- */

document.getElementById('btn-download').addEventListener('click', () => {
    const qrCanvas = document.querySelector('#qr-container canvas');
    if (!qrCanvas) {
        alert('Generate a label first.');
        return;
    }

    const PNG_DPI = 300;
    const PNG_DIMENSIONS_IN = {
        '4x2': { w: 4, h: 2 },
        '4x6': { w: 4, h: 6 },
        'letter': { w: 8.5, h: 11 }
    };
    const dims = PNG_DIMENSIONS_IN[state.labelSize] || PNG_DIMENSIONS_IN['4x2'];
    const widthPx = dims.w * PNG_DPI;
    const heightPx = dims.h * PNG_DPI;
    const isLetter = state.labelSize === 'letter';
    const is4x6 = state.labelSize === '4x6';

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Use the actual QR canvas (which is already high-res)
    const qrSize = Math.min(widthPx, heightPx) * (isLetter ? 0.35 : 0.6);
    const qrX = (widthPx - qrSize) / 2;
    const qrY = (heightPx - qrSize) / 2 - (is4x6 || isLetter ? 50 : 0);
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = '#2F4F2F';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const shelfID = document.getElementById('shelf-id').innerText;
    const locationStr = document.getElementById('location-string').innerText;

    const fontSize = is4x6 || isLetter ? 60 : 40;
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.fillText(shelfID, widthPx / 2, qrY + qrSize + 20);

    ctx.font = `${fontSize * 0.5}px system-ui, sans-serif`;
    ctx.fillText(locationStr, widthPx / 2, qrY + qrSize + 20 + fontSize + 10);

    const link = document.createElement('a');
    link.download = `${shelfID}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    console.log('⬇️ PNG downloaded');
});

/* --------------------------------------------------
   NEW LABEL & REPRINT
-------------------------------------------------- */

document.getElementById('btn-new').addEventListener('click', () => {
    showScreen('home');
});

document.getElementById('btn-reprint').addEventListener('click', () => {
    setPageSize(state.labelSize);
    window.print();
});