// ============ KONFIGURASI ============
const API_URL = 'https://amprem-exe.vercel.app/api/amprem';
const QUOTA_URL = 'https://amprem-exe.vercel.app/api/quota';

const BOT_AVATAR = 'https://files.catbox.moe/ezqxeq.png';
const BOT_BANNER = 'https://files.catbox.moe/ezqxeq.png';

// ============ WELCOME HTML ============
const WELCOME_HTML = `
    <div class="welcome-screen" id="welcomeScreen">
        <div class="welcome-logo">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        </div>
        <h3 class="welcome-title">Deca-Tech</h3>
        <p class="welcome-subtitle">Bot aktivasi premium otomatis</p>
        <div class="welcome-info">
            <div class="welcome-info-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Aktivasi premium tanpa ribet</span>
            </div>
            <div class="welcome-info-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Proses cepat & otomatis</span>
            </div>
        </div>
    </div>
`;

// ============ STATE ============
let state = {
    step: 'idle',
    email: null,
    serverId: null,
    serverName: null,
    idToken: null,
    servers: [],
    isProcessing: false,
    serverListOpen: false,
    serverListMsgId: null
};

// ============ INISIALISASI ============
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('botAvatar').src = BOT_AVATAR;
    loadServers();
    document.getElementById('messageInput').focus();
    
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});

// ============ LOAD SERVERS ============
async function loadServers() {
    try {
        const response = await fetch(QUOTA_URL);
        const data = await response.json();
        if (data.success) {
            state.servers = data.servers;
        }
    } catch (error) {
        console.error('Error loading servers:', error);
    }
}

// ============ MENU ============
function toggleMenu() {
    document.getElementById('menuDropdown').classList.toggle('active');
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('menuDropdown');
    const btn = document.querySelector('.menu-btn');
    if (menu && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.remove('active');
    }
});

// ============ CLEAR CHAT ============
function clearChatConfirm() {
    document.getElementById('menuDropdown').classList.remove('active');
    document.getElementById('clearModal').classList.add('active');
}

function closeClearModal() {
    document.getElementById('clearModal').classList.remove('active');
}

function clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = WELCOME_HTML;
    
    state = {
        step: 'idle',
        email: null,
        serverId: null,
        serverName: null,
        idToken: null,
        servers: state.servers,
        isProcessing: false,
        serverListOpen: false,
        serverListMsgId: null
    };
    
    closeClearModal();
}

// ============ HIDE WELCOME SCREEN ============
function hideWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        welcomeScreen.style.opacity = '0';
        welcomeScreen.style.transform = 'translateY(-30px) scale(0.9)';
        welcomeScreen.style.filter = 'blur(5px)';
        
        setTimeout(() => {
            welcomeScreen.remove();
        }, 500);
    }
}

// ============ KIRIM PESAN USER ============
function sendMessage() {
    if (state.isProcessing) return;
    
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    hideWelcomeScreen();
    
    addUserMessage(text);
    input.value = '';
    
    processCommand(text);
}

// ============ PROCESS COMMAND ============
async function processCommand(text) {
    const lowerText = text.toLowerCase().trim();
    
    if (lowerText === 'clear') {
        clearChatConfirm();
        return;
    }
    
    const verifMatch = text.match(/^verif\s+([^\s]+@[^\s]+\.[^\s]+)$/i);
    
    if (verifMatch) {
        const email = verifMatch[1];
        await handleVerif(email);
        return;
    }
    
    if (lowerText === 'verif') {
        await handleVerifNoEmail();
        return;
    }
    
    if (lowerText.startsWith('verif ')) {
        await handleVerifWrongFormat();
        return;
    }
    
    if (state.step === 'waiting_magiclink' && text.startsWith('http')) {
        await handleMagicLink(text);
        return;
    }
    
    await handleUnknownCommand();
}

// ============ HANDLE: verif email ============
async function handleVerif(email) {
    state.step = 'select_server';
    state.email = email;
    state.serverId = null;
    state.serverName = null;
    state.idToken = null;
    state.serverListOpen = false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        await sendBotMessage('Format email tidak valid!\n\nGunakan format:\nverif email@gmail.com');
        return;
    }
    
    await showTyping(1200);
    await loadServers();
    
    const message = `Email : ${email}\n\nSilakan pilih server yang tersedia.`;
    
    await sendBotMessage(message, true);
    await showOpenServerButton();
}

// ============ HANDLE: verif tanpa email ============
async function handleVerifNoEmail() {
    await showTyping(1000);
    await sendBotMessage(
        'Format salah!\n\n' +
        'Gunakan format:\n' +
        'verif email@gmail.com\n\n' +
        'Contoh:\n' +
        'verif nama@gmail.com'
    );
}

// ============ HANDLE: verif format salah ============
async function handleVerifWrongFormat() {
    await showTyping(1000);
    await sendBotMessage(
        'Format email tidak valid!\n\n' +
        'Gunakan format:\n' +
        'verif email@gmail.com\n\n' +
        'Contoh:\n' +
        'verif nama@gmail.com'
    );
}

// ============ HANDLE: magic link ============
async function handleMagicLink(rawLink) {
    state.isProcessing = true;
    state.step = 'processing';
    
    await showTyping(1000);
    await showLoadingBar('Memverifikasi magic link...', 2000);
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'verify-account',
                email: state.email,
                rawLink: rawLink,
                serverId: state.serverId
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.idToken) {
            state.idToken = data.idToken;
            state.step = 'confirm';
            
            await sendBotMessage('Magic link diterima!\n\nKlik tombol di bawah untuk konfirmasi aktivasi premium.');
            await showConfirmButton();
        } else {
            state.step = 'waiting_magiclink';
            await sendBotMessage('Magic link tidak valid!\n\n' + (data.message || 'Silakan coba lagi.'));
        }
    } catch (error) {
        state.step = 'waiting_magiclink';
        await sendBotMessage('Error: ' + error.message);
    }
    
    state.isProcessing = false;
}

// ============ HANDLE: command tidak dikenal ============
async function handleUnknownCommand() {
    await showTyping(1200);
    await sendBotMessage(
        'Command tidak terdeteksi.\n\n' +
        'Untuk memulai, gunakan format:\n' +
        'verif email@gmail.com\n\n' +
        'Ketik "clear" untuk hapus chat.'
    );
}

// ============ OPEN SERVER BUTTON (TOGGLE) ============
async function showOpenServerButton() {
    const chatMessages = document.getElementById('chatMessages');
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot';
    
    const btn = document.createElement('button');
    btn.className = 'msg-btn-action';
    btn.id = 'serverToggleBtn';
    btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
        </svg>
        <span id="serverToggleText">Lihat Server</span>
    `;
    btn.onclick = () => toggleServerList();
    
    msgDiv.appendChild(btn);
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

// ============ TOGGLE SERVER LIST ============
async function toggleServerList() {
    const btnText = document.getElementById('serverToggleText');
    
    if (state.serverListOpen) {
        const existingList = document.getElementById(state.serverListMsgId);
        if (existingList) existingList.remove();
        
        state.serverListOpen = false;
        state.serverListMsgId = null;
        
        if (btnText) btnText.textContent = 'Lihat Server';
    } else {
        await showServerList();
        
        state.serverListOpen = true;
        
        if (btnText) btnText.textContent = 'Tutup Server';
    }
}

// ============ SHOW SERVER LIST ============
async function showServerList() {
    const chatMessages = document.getElementById('chatMessages');
    
    const msgId = 'serverList-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot server-list-msg';
    msgDiv.id = msgId;
    
    const header = document.createElement('div');
    header.className = 'server-list-header';
    header.textContent = 'Pilih Server';
    msgDiv.appendChild(header);
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'server-list-buttons';
    
    state.servers.forEach((server) => {
        const status = server.status === 'active';
        const btn = document.createElement('button');
        btn.className = 'server-item-btn';
        if (!status) btn.disabled = true;
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'server-item-info';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'server-item-name';
        nameSpan.textContent = server.name;
        
        const quotaSpan = document.createElement('span');
        quotaSpan.className = 'server-item-quota';
        quotaSpan.textContent = status 
            ? `${server.remainingApi} API • ${server.remainingAccounts} Akun` 
            : 'Kuota Habis';
        
        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(quotaSpan);
        
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrow.setAttribute('width', '14');
        arrow.setAttribute('height', '14');
        arrow.setAttribute('viewBox', '0 0 24 24');
        arrow.setAttribute('fill', 'none');
        arrow.setAttribute('stroke', 'currentColor');
        arrow.setAttribute('stroke-width', '2.5');
        arrow.innerHTML = '<polyline points="9 18 15 12 9 6"></polyline>';
        
        btn.appendChild(infoDiv);
        btn.appendChild(arrow);
        btn.onclick = () => selectServer(server.id);
        
        buttonsDiv.appendChild(btn);
    });
    
    msgDiv.appendChild(buttonsDiv);
    chatMessages.appendChild(msgDiv);
    
    state.serverListMsgId = msgId;
    scrollToBottom();
}

// ============ SELECT SERVER ============
async function selectServer(serverId) {
    if (state.isProcessing) return;
    
    state.isProcessing = true;
    
    const server = state.servers.find(s => s.id === serverId);
    if (!server) {
        await sendBotMessage('Server tidak ditemukan!');
        state.isProcessing = false;
        return;
    }
    
    state.serverId = serverId;
    state.serverName = server.name;
    
    if (state.serverListOpen) {
        const existingList = document.getElementById(state.serverListMsgId);
        if (existingList) existingList.remove();
        
        state.serverListOpen = false;
        state.serverListMsgId = null;
        
        const btnText = document.getElementById('serverToggleText');
        if (btnText) btnText.textContent = 'Lihat Server';
    }
    
    addUserMessage(`Pilih ${server.name}`);
    
    await showTyping(800);
    await showLoadingBar('Meminta magic link...', 2500);
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send-magiclink',
                email: state.email,
                serverId: state.serverId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            state.step = 'waiting_magiclink';
            
            await sendBotMessage(
                `Magic link berhasil dikirim!\n\n` +
                `Email : ${state.email}\n` +
                `Server : ${server.name}\n\n` +
                `Silakan cek email Anda dan paste magic link di sini.`
            );
        } else {
            await sendBotMessage('Gagal mengirim magic link!\n\n' + (data.message || 'Coba server lain.'));
        }
    } catch (error) {
        await sendBotMessage('Error: ' + error.message);
    }
    
    state.isProcessing = false;
}

// ============ CONFIRM BUTTON ============
async function showConfirmButton() {
    const chatMessages = document.getElementById('chatMessages');
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot';
    
    const btn = document.createElement('button');
    btn.className = 'msg-btn-action confirm';
    btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Konfirmasi Aktivasi
    `;
    btn.onclick = () => confirmActivation();
    
    msgDiv.appendChild(btn);
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

// ============ CONFIRM ACTIVATION ============
async function confirmActivation() {
    if (state.isProcessing) return;
    
    state.isProcessing = true;
    state.step = 'processing';
    
    addUserMessage('Konfirmasi Aktivasi');
    
    await showTyping(1000);
    await showLoadingBar('Mengaktifkan premium...', 3000);
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'apply-premium',
                email: state.email,
                idToken: state.idToken,
                serverId: state.serverId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            await showOrderSuccess(data);
            state.step = 'done';
        } else {
            state.step = 'confirm';
            await sendBotMessage('Aktivasi gagal!\n\n' + (data.message || 'Coba lagi.'));
        }
    } catch (error) {
        state.step = 'confirm';
        await sendBotMessage('Error: ' + error.message);
    }
    
    state.isProcessing = false;
}

// ============ SHOW ORDER SUCCESS ============
async function showOrderSuccess(data) {
    const orderId = 'DECA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const now = new Date();
    const tanggal = formatDate(now);
    
    const expired = new Date(now);
    expired.setFullYear(expired.getFullYear() + 1);
    const expiredDate = formatDate(expired);
    
    const message = `PEMBELIAN BERHASIL\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `Order ID   : #${orderId}\n` +
        `Tanggal    : ${tanggal}\n` +
        `Email      : ${state.email}\n` +
        `Server     : ${state.serverName}\n` +
        `Status     : PREMIUM\n` +
        `Expired    : ${expiredDate}\n` +
        `Durasi     : 365 Hari\n` +
        `Auto Renew : Ya\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `Terima kasih telah\n` +
        `menggunakan Deca-Tech`;
    
    await sendBotMessage(message);
}

// ============ HELPER: formatDate ============
function formatDate(date) {
    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const d = date.getDate();
    const m = bulan[date.getMonth()];
    const y = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    
    return `${d} ${m} ${y}, ${h}:${min} WIB`;
}

// ============ ADD USER MESSAGE ============
function addUserMessage(text) {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = getCurrentTime();
    
    msgDiv.appendChild(textSpan);
    msgDiv.appendChild(timeSpan);
    
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

// ============ SEND BOT MESSAGE ============
async function sendBotMessage(text, withBanner = false) {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot';
    
    if (withBanner) {
        const img = document.createElement('img');
        img.src = BOT_BANNER;
        img.className = 'message-image';
        img.alt = 'Banner';
        msgDiv.appendChild(img);
    }
    
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    msgDiv.appendChild(textSpan);
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = getCurrentTime();
    msgDiv.appendChild(timeSpan);
    
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

// ============ SHOW TYPING ============
async function showTyping(duration = 1500) {
    const chatMessages = document.getElementById('chatMessages');
    
    const oldTyping = document.querySelector('.typing-indicator');
    if (oldTyping) oldTyping.remove();
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    
    await sleep(duration);
    
    typingDiv.remove();
}

// ============ SHOW LOADING BAR ============
async function showLoadingBar(text, duration = 2000) {
    const chatMessages = document.getElementById('chatMessages');
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-message';
    
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.innerHTML = `<span>${text}</span><span class="percentage">0%</span>`;
    
    const loadingBar = document.createElement('div');
    loadingBar.className = 'loading-bar';
    
    const loadingProgress = document.createElement('div');
    loadingProgress.className = 'loading-progress';
    
    loadingBar.appendChild(loadingProgress);
    loadingDiv.appendChild(loadingText);
    loadingDiv.appendChild(loadingBar);
    chatMessages.appendChild(loadingDiv);
    scrollToBottom();
    
    const percentage = loadingDiv.querySelector('.percentage');
    const steps = 20;
    const interval = duration / steps;
    
    for (let i = 1; i <= steps; i++) {
        await sleep(interval);
        const percent = Math.round((i / steps) * 100);
        loadingProgress.style.width = percent + '%';
        percentage.textContent = percent + '%';
    }
    
    await sleep(300);
    loadingDiv.remove();
}

// ============ HELPER ============
function getCurrentTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}