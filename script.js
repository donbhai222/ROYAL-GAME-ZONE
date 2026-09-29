// ================= ADMIN SHEET URL =================
const ADMIN_URL = 'https://script.google.com/macros/s/AKfycbzbZwYvAae-eMqoqDJfOCZ61LeVWuDRbVzLJzp-CAqPiEXQw5aYubvVFI5Fsodma9ws/exec';

// ================= CONFIG =================
const CONFIG = { dailyLimit: 20, startingPoints: 1000, adReward: 50, resultDuration: 3000, timerDuration: 30 };

// ================= USER DATA =================
let userData = JSON.parse(localStorage.getItem('royalGamesData') || 'null');

function saveUserData() { localStorage.setItem('royalGamesData', JSON.stringify(userData)); }

function createNewUser(name, mobile) {
    return { name, mobile, points: CONFIG.startingPoints, wins: 0, losses: 0, todayGames: 0, todayKey: new Date().toISOString().slice(0, 10), history: [], playHistory: [] };
}

function updatePoints(change) {
    userData.points += change;
    if (userData.points < 0) userData.points = 0;
    if (change > 0) userData.wins++;
    else if (change < 0) userData.losses++;
    saveUserData();
    updateUI();
}

function updateUI() {
    if (!userData) return;
    const els = { headerPoints: userData.points, statPoints: userData.points, statToday: userData.todayGames + '/' + CONFIG.dailyLimit, statWins: userData.wins, welcomeName: userData.name, welcomeAvatar: userData.name.charAt(0).toUpperCase() };
    for (const id in els) { const el = document.getElementById(id); if (el) el.innerText = els[id]; }
}

function canPlay() {
    if (userData.todayGames >= CONFIG.dailyLimit) { showToast("⚠️ Aaj ke " + CONFIG.dailyLimit + " games khatam!", "error"); return false; }
    return true;
}

function incrementGame(gameName, bet, won, winAmount) {
    userData.todayGames++;
    userData.playHistory.unshift({ game: gameName, bet, won, amount: winAmount || 0, time: new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
    if (userData.playHistory.length > 50) userData.playHistory.pop();
    saveUserData();
    updateUI();
    sendToAdminSheet({ action: 'game', name: userData.name, mobile: userData.mobile, game: gameName, points: userData.points });
}

// ================= ADMIN SHEET SYNC =================
function sendToAdminSheet(data) {
    const params = new URLSearchParams();
    for (const key in data) params.append(key, data[key]);
    fetch(ADMIN_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() })
        .then(() => console.log('✅ Sheet synced'))
        .catch(err => console.log('⚠️ Sheet error:', err));
}

// ================= LOGIN =================
function doLogin() {
    const name = document.getElementById('loginName').value.trim();
    const mobile = document.getElementById('loginMobile').value.trim();
    if (!name || name.length < 2) return showToast("⚠️ Sahi naam likho!", "error");
    if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) return showToast("⚠️ 10 digit mobile number daalo!", "error");
    sendToAdminSheet({ action: 'login', name: name, mobile: mobile, game: 'Login', points: '1000' });
    const users = JSON.parse(localStorage.getItem('royalAllUsers') || '{}');
    if (users[mobile]) userData = users[mobile];
    else { userData = createNewUser(name, mobile); users[mobile] = userData; localStorage.setItem('royalAllUsers', JSON.stringify(users)); }
    const todayKey = new Date().toISOString().slice(0, 10);
    if (userData.todayKey !== todayKey) { userData.todayKey = todayKey; userData.todayGames = 0; }
    saveUserData();
    document.getElementById('loginOverlay').classList.add('hide');
    document.getElementById('profileBtn').classList.add('show');
    updateUI();
    showToast("🎉 Welcome " + name + "!");
    launchConfetti();
}

function logout() {
    if (!confirm("Logout karna hai?")) return;
    userData = null;
    localStorage.removeItem('royalGamesData');
    document.getElementById('profileBtn').classList.remove('show');
    document.getElementById('loginOverlay').classList.remove('hide');
    goHome();
}

// ================= ROUTER =================
const GAME_TITLES = { home: '🎮 ROYAL GAMES', color: '🎨 Color / Number', aviator: '✈️ Aviator', wheel: '🎡 Wheel', keno: '🔢 Keno', hilo: '🃏 Hilo', slot: '🎰 Slot', dice: '🎲 Dice', mines: '💎 Mines', basketball: '🏀 Basketball', lucky: '🎪 Lucky Draw', profile: '👤 My Profile' };

function goToGame(gameId) {
    if (!userData) return;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-' + gameId);
    if (!page) return showToast("⚠️ Ye game jald aa raha hai!", "info");
    page.classList.add('active');
    document.getElementById('headerTitle').innerText = GAME_TITLES[gameId] || '🎮 ROYAL GAMES';
    document.getElementById('backBtn').classList.add('show');
    document.getElementById('profileBtn').classList.remove('show');
    window.scrollTo(0, 0);
    const inits = { color: initColor, aviator: initAviator, wheel: initWheel, keno: initKeno, hilo: initHilo, slot: initSlot, dice: initDice, mines: initMines, basketball: initBasketball, lucky: initLucky };
    if (inits[gameId]) inits[gameId]();
}

function goToProfile() {
    if (!userData) return;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-profile').classList.add('active');
    document.getElementById('headerTitle').innerText = GAME_TITLES.profile;
    document.getElementById('backBtn').classList.add('show');
    document.getElementById('profileBtn').classList.remove('show');
    window.scrollTo(0, 0);
    renderProfile();
}

function goHome() {
    if (!userData) return;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-home').classList.add('active');
    document.getElementById('headerTitle').innerText = GAME_TITLES.home;
    document.getElementById('backBtn').classList.remove('show');
    document.getElementById('profileBtn').classList.add('show');
    window.scrollTo(0, 0);
    updateUI();
    clearInterval(winnerFeedInterval);
    if (colorState.interval) clearInterval(colorState.interval);
}

// ================= PROFILE =================
function renderProfile() {
    if (!userData) return;
    document.getElementById('profileAvatar').innerText = userData.name.charAt(0).toUpperCase();
    document.getElementById('profileName').innerText = userData.name;
    document.getElementById('profileMobile').innerText = '📱 ' + userData.mobile;
    document.getElementById('psPoints').innerText = userData.points;
    document.getElementById('psWins').innerText = userData.wins;
    document.getElementById('psLosses').innerText = userData.losses;
    const total = userData.wins + userData.losses;
    const rate = total > 0 ? Math.round((userData.wins / total) * 100) : 0;
    document.getElementById('psWinRate').innerText = rate + '%';
    let rank = '⭐ BRONZE PLAYER';
    if (userData.points >= 5000) rank = '👑 LEGEND';
    else if (userData.points >= 3000) rank = '💎 DIAMOND';
    else if (userData.points >= 1500) rank = '🥇 GOLD';
    else if (userData.points >= 800) rank = '🥈 SILVER';
    document.getElementById('profileRank').innerText = rank;
    const log = document.getElementById('historyLog');
    if (!userData.playHistory || userData.playHistory.length === 0) { log.innerHTML = '<div style="text-align:center;color:#94a3b8;font-size:12px;">Koi history nahi</div>'; return; }
    log.innerHTML = userData.playHistory.slice(0, 20).map(h => `<div class="history-log-item ${h.won ? '' : 'lose'}"><div><div class="hl-game">${h.game}</div><div class="hl-time">${h.time} • Bet: ${h.bet}</div></div><div class="hl-amount">${h.won ? '+' + h.amount : '-' + h.bet}</div></div>`).join('');
}

// ================= LIVE WINNER FEED =================
const SAMPLE_NAMES = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikas', 'Anjali', 'Rohit', 'Kavita', 'Suresh', 'Neha', 'Arjun', 'Pooja'];
const SAMPLE_GAMES = [{ name: 'Color Predict', icon: '🎨' }, { name: 'Number Predict', icon: '🔢' }, { name: 'Aviator', icon: '✈️' }, { name: 'Wheel', icon: '🎡' }, { name: 'Slot', icon: '🎰' }, { name: 'Dice', icon: '🎲' }];
let winnerFeedInterval = null;
let winnerCount = 0;

function startWinnerFeed() {
    const list = document.getElementById('wfList');
    if (!list) return;
    list.innerHTML = '';
    winnerCount = 0;
    for (let i = 0; i < 6; i++) addWinnerEntry(true);
    clearInterval(winnerFeedInterval);
    winnerFeedInterval = setInterval(() => addWinnerEntry(false), 4000 + Math.random() * 3000);
}

function addWinnerEntry(initial) {
    const list = document.getElementById('wfList');
    if (!list) return;
    const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
    const game = SAMPLE_GAMES[Math.floor(Math.random() * SAMPLE_GAMES.length)];
    const amounts = [50, 100, 150, 200, 250, 300, 500, 750, 1000, 1500, 2000];
    const amount = amounts[Math.floor(Math.random() * amounts.length)];
    const timeAgo = initial ? (Math.floor(Math.random() * 15) + 1) + 'm ago' : 'just now';
    const item = document.createElement('div');
    item.className = 'wf-item';
    item.innerHTML = `<div class="wf-avatar">${name.charAt(0)}</div><div class="wf-info"><div class="wf-name">${name}***</div><div class="wf-game">${game.icon} ${game.name} • ${timeAgo}</div></div><div class="wf-amount">+₹${amount}</div>`;
    if (initial) list.appendChild(item);
    else { list.insertBefore(item, list.firstChild); while (list.children.length > 15) list.removeChild(list.lastChild); }
    winnerCount++;
    const counter = document.getElementById('wfCount');
    if (counter) counter.innerText = winnerCount + ' wins';
}

// ================= GAME 1: COLOR + NUMBER =================
let colorState = { mode: 'color', selectedColor: null, selectedNumber: null, bet: 50, timer: CONFIG.timerDuration, interval: null, canBet: true, history: [], lastColorResult: null, lastNumberResult: null };

function initColor() {
    colorState.mode = 'color';
    colorState.selectedColor = null;
    colorState.selectedNumber = null;
    colorState.canBet = true;
    document.getElementById('colorResult').className = 'game-result-box';
    document.getElementById('colorPlayBtn').disabled = false;
    document.getElementById('colorPlayBtn').innerText = '🎯 PLACE BET';
    document.querySelectorAll('#page-color .color-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.mode-tab')[0].classList.add('active');
    document.getElementById('colorMode').style.display = 'block';
    document.getElementById('numberMode').style.display = 'none';
    updateColorPreview();
    loadPreviousResults();
    startColorTimer();
    startWinnerFeed();
}

function loadPreviousResults() {
    if (colorState.history.length > 0) {
        const last = colorState.history[0];
        const colorResult = last.startsWith('num') ? colorState.lastColorResult || 'green' : last;
        const numberResult = last.startsWith('num') ? last.replace('num', '') : colorState.lastNumberResult || '0';
        updateDualResult(colorResult, numberResult, false, false);
        renderColorHistory();
        return;
    }
    const colors = ['green', 'red', 'violet'];
    const generated = [];
    let lastColor = null, lastNum = null;
    for (let i = 0; i < 10; i++) {
        const rand = Math.random();
        if (i % 2 === 0) { const color = rand < 0.45 ? 'green' : rand < 0.90 ? 'red' : 'violet'; generated.push(color); if (i === 0) lastColor = color; }
        else { const num = Math.floor(Math.random() * 10); generated.push('num' + num); if (i === 0) lastNum = num; }
    }
    colorState.history = generated;
    if (lastColor) colorState.lastColorResult = lastColor;
    if (lastNum !== null) colorState.lastNumberResult = lastNum;
    const displayColor = colorState.lastColorResult || 'green';
    const displayNumber = colorState.lastNumberResult !== null ? colorState.lastNumberResult : Math.floor(Math.random() * 10);
    updateDualResult(displayColor, displayNumber, false, false);
    renderColorHistory();
}

function switchMode(mode, btn) {
    colorState.mode = mode;
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('colorMode').style.display = mode === 'color' ? 'block' : 'none';
    document.getElementById('numberMode').style.display = mode === 'number' ? 'block' : 'none';
    updateColorPreview();
}

function startColorTimer() {
    colorState.timer = CONFIG.timerDuration;
    clearInterval(colorState.interval);
    updateColorTimer();
    colorState.interval = setInterval(() => {
        colorState.timer--;
        updateColorTimer();
        if (colorState.timer <= 0) { clearInterval(colorState.interval); colorResolve(); }
    }, 1000);
}

function updateColorTimer() {
    document.getElementById('colorTimer').innerText = '00:' + String(colorState.timer).padStart(2, '0');
    document.getElementById('colorProgress').style.width = (colorState.timer / CONFIG.timerDuration * 100) + '%';
}

function colorSelect(color, btn) {
    if (!colorState.canBet) return;
    colorState.selectedColor = color;
    colorState.selectedNumber = null;
    document.querySelectorAll('#page-color .color-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    updateColorPreview();
}

function numberSelect(num, btn) {
    if (!colorState.canBet) return;
    colorState.selectedNumber = num;
    colorState.selectedColor = null;
    document.querySelectorAll('#page-color .color-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    updateColorPreview();
}

function colorBet(bet, btn) {
    if (!colorState.canBet) return;
    colorState.bet = bet;
    document.querySelectorAll('#page-color .bet-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    updateColorPreview();
}

function updateColorPreview() {
    const bet = colorState.bet;
    let selection = '-', mult = 2.0;
    if (colorState.mode === 'color' && colorState.selectedColor) { selection = colorState.selectedColor.toUpperCase(); mult = colorState.selectedColor === 'violet' ? 4.5 : 2.0; }
    else if (colorState.mode === 'number' && colorState.selectedNumber !== null) { selection = 'NUMBER ' + colorState.selectedNumber; mult = 9.0; }
    const win = Math.floor(bet * mult);
    document.getElementById('cpBet').innerText = bet;
    document.getElementById('cpColor').innerText = selection;
    document.getElementById('cpWin').innerText = win;
    document.getElementById('cpMult').innerText = 'x' + mult;
    document.getElementById('cpProfit').innerText = '+' + (win - bet);
}

function colorPlaceBet() {
    if (colorState.mode === 'color' && !colorState.selectedColor) return showToast("⚠️ Color choose karo!", "error");
    if (colorState.mode === 'number' && colorState.selectedNumber === null) return showToast("⚠️ Number choose karo!", "error");
    if (userData.points < colorState.bet) return showToast("⚠️ Points kam hai!", "error");
    if (!canPlay()) return;
    colorState.canBet = false;
    updatePoints(-colorState.bet);
    document.getElementById('colorPlayBtn').disabled = true;
    document.getElementById('colorPlayBtn').innerText = '⏳ WAITING...';
    showToast("✅ Bet placed!");
}

function colorResolve() {
    const colors = ['green', 'red', 'violet'];
    const rand = Math.random();
    const colorResult = rand < 0.45 ? 'green' : rand < 0.90 ? 'red' : 'violet';
    const numberResult = Math.floor(Math.random() * 10);
    colorState.lastColorResult = colorResult;
    colorState.lastNumberResult = numberResult;
    const userHadBet = !colorState.canBet;
    let won = false, change = 0;
    if (userHadBet) {
        if (colorState.mode === 'color' && colorState.selectedColor) {
            won = colorState.selectedColor === colorResult;
            const mult = colorResult === 'violet' ? 4.5 : 2.0;
            change = won ? Math.floor(colorState.bet * mult) : 0;
            if (won) { userData.points += change; userData.wins++; } else userData.losses++;
            incrementGame('Color Predict', colorState.bet, won, change);
            showResultModal(won, won ? '+' + change + ' Points!' : '-' + colorState.bet + ' Points');
        } else if (colorState.mode === 'number' && colorState.selectedNumber !== null) {
            won = colorState.selectedNumber === numberResult;
            change = won ? Math.floor(colorState.bet * 9) : 0;
            if (won) { userData.points += change; userData.wins++; } else userData.losses++;
            incrementGame('Number Predict', colorState.bet, won, change);
            showResultModal(won, won ? '+' + change + ' Points!' : '-' + colorState.bet + ' Points');
        }
    }
    updateDualResult(colorResult, numberResult, userHadBet, won);
    colorState.history.unshift('dual_' + colorResult + '_' + numberResult);
    if (colorState.history.length > 10) colorState.history.pop();
    renderColorHistory();
    setTimeout(() => addWinnerEntry(false), 300);
    setTimeout(() => addWinnerEntry(false), 800);
    setTimeout(() => {
        colorState.selectedColor = null;
        colorState.selectedNumber = null;
        colorState.canBet = true;
        document.querySelectorAll('#page-color .color-btn').forEach(b => b.classList.remove('selected'));
        document.querySelectorAll('.number-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('colorPlayBtn').disabled = false;
        document.getElementById('colorPlayBtn').innerText = '🎯 PLACE BET';
        updateColorPreview();
        startColorTimer();
    }, CONFIG.resultDuration);
}

function updateDualResult(color, number, userHadBet, won) {
    const colorBox = document.getElementById('dualColorBox');
    const colorValue = document.getElementById('dualColorValue');
    const colorSub = document.getElementById('dualColorSub');
    const numberBox = document.getElementById('dualNumberBox');
    const numberValue = document.getElementById('dualNumberValue');
    const numberSub = document.getElementById('dualNumberSub');
    colorBox.classList.remove('active-win', 'active-lose');
    numberBox.classList.remove('active-win', 'active-lose');
    const colorEmoji = color === 'green' ? '🟢' : color === 'red' ? '🔴' : '🟣';
    colorValue.className = 'dual-value color-' + color;
    colorValue.innerText = colorEmoji;
    if (userHadBet && colorState.mode === 'color') { colorSub.innerText = won ? '🎉 YOU WON!' : '😢 YOU LOST'; colorBox.classList.add(won ? 'active-win' : 'active-lose'); }
    else colorSub.innerText = color.toUpperCase();
    numberValue.className = 'dual-value number-val';
    numberValue.innerText = number;
    if (userHadBet && colorState.mode === 'number') { numberSub.innerText = won ? '🎉 YOU WON!' : '😢 YOU LOST'; numberBox.classList.add(won ? 'active-win' : 'active-lose'); }
    else numberSub.innerText = 'NUMBER ' + number;
    if (won && userHadBet) launchConfetti();
}

function renderColorHistory() {
    const el = document.getElementById('colorHistory');
    if (colorState.history.length === 0) { el.innerHTML = '<div style="color:#94a3b8;font-size:11px;width:100%;text-align:center;">Abhi tak koi result nahi</div>'; return; }
    el.innerHTML = colorState.history.map(c => {
        if (c.startsWith('dual_')) {
            const parts = c.replace('dual_', '').split('_');
            const color = parts[0], num = parts[1];
            const colorEmoji = color === 'green' ? '🟢' : color === 'red' ? '🔴' : '🟣';
            return `<div class="history-item" style="background:linear-gradient(135deg, ${color === 'green' ? '#10b981,#059669' : color === 'red' ? '#ef4444,#dc2626' : '#a855f7,#7c3aed'});width:auto;padding:0 8px;border-radius:12px;font-size:12px;gap:4px;display:flex;align-items:center;"><span>${colorEmoji}</span><span style="color:#fff;font-weight:900;font-size:11px;">${num}</span></div>`;
        }
        if (c.startsWith('num')) { const num = c.replace('num', ''); return `<div class="history-item" style="background:linear-gradient(135deg,#f59e0b,#f97316);color:#0a0e27;">${num}</div>`; }
        return `<div class="history-item ${c}">${c === 'green' ? '🟢' : c === 'red' ? '🔴' : '🟣'}</div>`;
    }).join('');
}

// ================= GAME 2: AVIATOR =================
let aviState = { bet: 50, running: false, mult: 1.0, interval: null, crashAt: 1.0 };

function initAviator() {
    aviState.running = false; aviState.mult = 1.0;
    clearInterval(aviState.interval);
    document.getElementById('aviMultiplier').innerText = '1.00x';
    document.getElementById('aviMultiplier').style.color = '#fff';
    document.getElementById('aviMult').innerText = '1.00x';
    document.getElementById('aviPlane').style.bottom = '20px';
    document.getElementById('aviPlane').style.left = '20px';
    document.getElementById('aviBtn').style.display = 'block';
    document.getElementById('aviBtn').disabled = false;
    document.getElementById('aviBtn').innerText = '✈️ START FLIGHT';
    document.getElementById('aviCashBtn').style.display = 'none';
    document.getElementById('aviResult').className = 'game-result-box';
    aviUpdatePreview();
}

function aviUpdatePreview() {
    document.getElementById('aviPreviewBet').innerText = aviState.bet;
    document.getElementById('aviPreview2x').innerText = Math.floor(aviState.bet * 2);
    document.getElementById('aviPreview5x').innerText = Math.floor(aviState.bet * 5);
    document.getElementById('aviPreview10x').innerText = Math.floor(aviState.bet * 10);
}

function aviBet(bet, btn) {
    if (aviState.running) return;
    aviState.bet = bet;
    document.querySelectorAll('#page-aviator .bet-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('aviBetDisplay').innerText = bet;
    aviUpdatePreview();
}

function aviStart() {
    if (aviState.running) return;
    if (userData.points < aviState.bet) return showToast("⚠️ Points kam hai!", "error");
    if (!canPlay()) return;
    aviState.running = true;
    aviState.mult = 1.0;
    aviState.crashAt = 1.5 + Math.random() * 8;
    updatePoints(-aviState.bet);
    document.getElementById('aviBtn').style.display = 'none';
    document.getElementById('aviCashBtn').style.display = 'block';
    const plane = document.getElementById('aviPlane');
    const multEl = document.getElementById('aviMultiplier');
    aviState.interval = setInterval(() => {
        aviState.mult += 0.02 + aviState.mult * 0.01;
        multEl.innerText = aviState.mult.toFixed(2) + 'x';
        document.getElementById('aviMult').innerText = aviState.mult.toFixed(2) + 'x';
        const progress = Math.min((aviState.mult - 1) / 10, 1);
        plane.style.bottom = (20 + progress * 200) + 'px';
        plane.style.left = (20 + progress * 60) + '%';
        if (aviState.mult >= aviState.crashAt) aviCrash();
    }, 50);
}

function aviCashOut() {
    if (!aviState.running) return;
    clearInterval(aviState.interval);
    aviState.running = false;
    const win = Math.floor(aviState.bet * aviState.mult);
    userData.points += win;
    userData.wins++;
    incrementGame('Aviator', aviState.bet, true, win);
    document.getElementById('aviResult').className = 'game-result-box show win';
    document.getElementById('aviResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">🎉</div>Cashed at ${aviState.mult.toFixed(2)}x! +${win} Points!`;
    launchConfetti();
    document.getElementById('aviCashBtn').style.display = 'none';
    document.getElementById('aviBtn').style.display = 'block';
}

function aviCrash() {
    clearInterval(aviState.interval);
    aviState.running = false;
    userData.losses++;
    incrementGame('Aviator', aviState.bet, false, 0);
    document.getElementById('aviMultiplier').innerText = 'CRASHED!';
    document.getElementById('aviMultiplier').style.color = '#ef4444';
    document.getElementById('aviResult').className = 'game-result-box show lose';
    document.getElementById('aviResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">💥</div>Crashed at ${aviState.mult.toFixed(2)}x! -${aviState.bet}`;
    document.getElementById('aviCashBtn').style.display = 'none';
    document.getElementById('aviBtn').style.display = 'block';
}

// ================= GAME 3: WHEEL =================
let wheelState = { spins: 0, spinning: false };

function initWheel() {
    wheelState.spins = 0; wheelState.spinning = false;
    document.getElementById('wheelSpins').innerText = '0/3';
    document.getElementById('wheelSpin').style.transform = 'rotate(0deg)';
    document.getElementById('wheelBtn').disabled = false;
    document.getElementById('wheelBtn').innerText = '🎡 SPIN NOW';
    document.getElementById('wheelResult').className = 'game-result-box';
}

function spinWheel() {
    if (wheelState.spinning || wheelState.spins >= 3) return;
    if (userData.points < 50) return showToast("⚠️ Points kam hai!", "error");
    if (!canPlay()) return;
    wheelState.spinning = true;
    wheelState.spins++;
    document.getElementById('wheelSpins').innerText = wheelState.spins + '/3';
    document.getElementById('wheelBtn').disabled = true;
    updatePoints(-50);
    const rewards = [10, 20, 30, 50, 100, 200, 300, 500, 20, 50];
    const randomIdx = Math.floor(Math.random() * rewards.length);
    const finalAngle = 5 * 360 + (randomIdx * 36) + 18;
    document.getElementById('wheelSpin').style.transform = `rotate(${finalAngle}deg)`;
    setTimeout(() => {
        const pts = rewards[randomIdx];
        userData.points += pts; userData.wins++;
        incrementGame('Wheel', 50, true, pts);
        document.getElementById('wheelResult').className = 'game-result-box show win';
        document.getElementById('wheelResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">🎉</div>+${pts} Points!`;
        launchConfetti();
        wheelState.spinning = false;
        if (wheelState.spins >= 3) document.getElementById('wheelBtn').innerText = '✅ Done!';
        else document.getElementById('wheelBtn').disabled = false;
    }, 4200);
}

// ================= GAME 4: KENO =================
let kenoState = { selected: [], drawn: [] };

function initKeno() {
    kenoState.selected = []; kenoState.drawn = [];
    document.getElementById('kenoCount').innerText = '0/5';
    document.getElementById('kenoBtn').disabled = true;
    document.getElementById('kenoResult').className = 'game-result-box';
    let html = '';
    for (let i = 1; i <= 40; i++) html += `<div class="keno-num" data-num="${i}" onclick="kenoToggle(${i}, this)">${i}</div>`;
    document.getElementById('kenoGrid').innerHTML = html;
}

function kenoToggle(num, el) {
    if (kenoState.selected.includes(num)) { kenoState.selected = kenoState.selected.filter(n => n !== num); el.classList.remove('selected'); }
    else { if (kenoState.selected.length >= 5) return; kenoState.selected.push(num); el.classList.add('selected'); }
    document.getElementById('kenoCount').innerText = kenoState.selected.length + '/5';
    document.getElementById('kenoBtn').disabled = kenoState.selected.length !== 5;
}

function kenoPlay() {
    if (kenoState.selected.length !== 5) return;
    if (userData.points < 50) return showToast("⚠️ Points kam hai!", "error");
    if (!canPlay()) return;
    updatePoints(-50);
    document.getElementById('kenoBtn').disabled = true;
    kenoState.drawn = [];
    while (kenoState.drawn.length < 10) { const n = Math.floor(Math.random() * 40) + 1; if (!kenoState.drawn.includes(n)) kenoState.drawn.push(n); }
    document.querySelectorAll('.keno-num').forEach(el => {
        const n = parseInt(el.dataset.num);
        if (kenoState.drawn.includes(n)) { el.classList.add('drawn'); if (kenoState.selected.includes(n)) el.classList.add('hit'); }
    });
    const hits = kenoState.selected.filter(n => kenoState.drawn.includes(n)).length;
    const rewards = { 0: 0, 1: 5, 2: 20, 3: 100, 4: 300, 5: 500 };
    const pts = rewards[hits]; const won = pts > 0;
    setTimeout(() => {
        if (won) { userData.points += pts; userData.wins++; } else userData.losses++;
        incrementGame('Keno', 50, won, pts);
        document.getElementById('kenoResult').className = 'game-result-box show ' + (won ? 'win' : 'lose');
        document.getElementById('kenoResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">${won ? '🎉' : '❌'}</div>${hits} hits! ${won ? '+' + pts + ' Points!' : 'Try again!'}`;
        if (won) launchConfetti();
        document.getElementById('kenoBtn').innerText = '✅ Done!';
    }, 800);
}

// ================= GAME 5: HILO =================
let hiloState = { bet: 50, current: 7, streak: 0 };

function initHilo() {
    hiloState.current = Math.floor(Math.random() * 13) + 1;
    hiloState.streak = 0;
    document.getElementById('hiloStreak').innerText = '0';
    document.getElementById('hiloMult').innerText = '1.00x';
    document.getElementById('hiloValue').innerText = hiloState.current;
    document.getElementById('hiloSuit').innerText = ['♥','♦','♠','♣'][Math.floor(Math.random()*4)];
    document.getElementById('hiloResult').className = 'game-result-box';
    document.getElementById('hiloHigher').disabled = false;
    document.getElementById('hiloLower').disabled = false;
    hiloUpdatePreview();
}

function hiloUpdatePreview() {
    document.getElementById('hiloPreviewBet').innerText = hiloState.bet;
    document.getElementById('hiloPreview1').innerText = Math.floor(hiloState.bet * 1.5);
    document.getElementById('hiloPreview2').innerText = Math.floor(hiloState.bet * 2.0);
    document.getElementById('hiloPreview5').innerText = Math.floor(hiloState.bet * 3.5);
}

function hiloBet(bet, btn) {
    hiloState.bet = bet;
    document.querySelectorAll('#page-hilo .bet-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    hiloUpdatePreview();
}

function hiloGuess(direction) {
    if (userData.points < hiloState.bet) return showToast("⚠️ Points kam hai!", "error");
    if (!canPlay()) return;
    updatePoints(-hiloState.bet);
    document.getElementById('hiloHigher').disabled = true;
    document.getElementById('hiloLower').disabled = true;
    const next = Math.floor(Math.random() * 13) + 1;
    const won = direction === 'higher' ? next > hiloState.current : next < hiloState.current;
    setTimeout(() => {
        hiloState.current = next;
        document.getElementById('hiloValue').innerText = next;
        document.getElementById('hiloSuit').innerText = ['♥','♦','♠','♣'][Math.floor(Math.random()*4)];
        if (won) {
            hiloState.streak++;
            const mult = 1 + hiloState.streak * 0.5;
            const win = Math.floor(hiloState.bet * mult);
            userData.points += win; userData.wins++;
            incrementGame('Hilo', hiloState.bet, true, win);
            document.getElementById('hiloStreak').innerText = hiloState.streak;
            document.getElementById('hiloMult').innerText = mult.toFixed(2) + 'x';
            document.getElementById('hiloResult').className = 'game-result-box show win';
            document.getElementById('hiloResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">🎉</div>Correct! +${win} Points! Streak: ${hiloState.streak}`;
            launchConfetti();
            document.getElementById('hiloHigher').disabled = false;
            document.getElementById('hiloLower').disabled = false;
        } else {
            userData.losses++;
            incrementGame('Hilo', hiloState.bet, false, 0);
            document.getElementById('hiloResult').className = 'game-result-box show lose';
            document.getElementById('hiloResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">❌</div>Wrong! Card was ${next}`;
            hiloState.streak = 0;
            document.getElementById('hiloStreak').innerText = '0';
            document.getElementById('hiloMult').innerText = '1.00x';
            setTimeout(() => {
                hiloState.current = Math.floor(Math.random() * 13) + 1;
                document.getElementById('hiloValue').innerText = hiloState.current;
                document.getElementById('hiloHigher').disabled = false;
                document.getElementById('hiloLower').disabled = false;
            }, 1500);
        }
    }, 500);
}

// ================= GAME 6: SLOT =================
let slotState = { spins: 0 };

function initSlot() {
    slotState.spins = 0;
    document.getElementById('slotCount').innerText = '0/3';
    document.getElementById('reel1').innerText = '🍒';
    document.getElementById('reel2').innerText = '🍒';
    document.getElementById('reel3').innerText = '🍒';
    document.getElementById('slotBtn').disabled = false;
    document.getElementById('slotBtn').innerText = '🎰 SPIN';
    document.getElementById('slotResult').className = 'game-result-box';
}

function spinSlot() {
    if (slotState.spins >= 3) return;
    if (userData.points < 50) return showToast("⚠️ Points kam hai!", "error");
    if (!canPlay()) return;
    slotState.spins++;
    document.getElementById('slotCount').innerText = slotState.spins + '/3';
    document.getElementById('slotBtn').disabled = true;
    updatePoints(-50);
    const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐'];
    let ticks = 0;
    const interval = setInterval(() => {
        document.getElementById('reel1').innerText = symbols[Math.floor(Math.random() * symbols.length)];
        document.getElementById('reel2').innerText = symbols[Math.floor(Math.random() * symbols.length)];
        document.getElementById('reel3').innerText = symbols[Math.floor(Math.random() * symbols.length)];
        ticks++;
        if (ticks > 20) {
            clearInterval(interval);
            const r1 = symbols[Math.floor(Math.random() * symbols.length)];
            const r2 = symbols[Math.floor(Math.random() * symbols.length)];
            const r3 = symbols[Math.floor(Math.random() * symbols.length)];
            document.getElementById('reel1').innerText = r1;
            document.getElementById('reel2').innerText = r2;
            document.getElementById('reel3').innerText = r3;
            let pts = 0, msg = '';
            if (r1 === r2 && r2 === r3) { pts = 500; msg = '🎉 JACKPOT! +500!'; }
            else if (r1 === r2 || r2 === r3 || r1 === r3) { pts = 100; msg = '🎊 2 Match! +100!'; }
            else msg = '❌ No match';
            if (pts > 0) { userData.points += pts; userData.wins++; } else userData.losses++;
            incrementGame('Slot', 50, pts > 0, pts);
            document.getElementById('slotResult').className = 'game-result-box show ' + (pts > 0 ? 'win' : 'lose');
            document.getElementById('slotResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">${pts > 0 ? '🎉' : '❌'}</div>${msg}`;
            if (pts > 0) launchConfetti();
            if (slotState.spins >= 3) document.getElementById('slotBtn').innerText = '✅ Done!';
            else document.getElementById('slotBtn').disabled = false;
        }
    }, 80);
}

// ================= GAME 7: DICE =================
let diceState = { guess: null, rolls: 0 };

function initDice() {
    diceState.guess = null; diceState.rolls = 0;
    document.getElementById('diceCount').innerText = '0/3';
    document.getElementById('dice1').innerText = '⚀';
    document.getElementById('dice2').innerText = '⚀';
    document.getElementById('diceBtn').disabled = true;
    document.getElementById('diceBtn').innerText = '🎲 ROLL';
    document.getElementById('diceResult').className = 'game-result-box';
    let html = '';
    for (let i = 2; i <= 12; i++) html += `<button class="dice-sum-btn" data-sum="${i}" onclick="dicePick(${i}, this)">${i}</button>`;
    document.getElementById('diceSumBtns').innerHTML = html;
}

function dicePick(n, btn) {
    if (diceState.rolls >= 3) return;
    diceState.guess = n;
    document.querySelectorAll('.dice-sum-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('diceBtn').disabled = false;
}

function rollDice() {
    if (!diceState.guess || diceState.rolls >= 3) return;
    if (userData.points < 50) return showToast("⚠️ Points kam hai!", "error");
    if (!canPlay()) return;
    diceState.rolls++;
    document.getElementById('diceCount').innerText = diceState.rolls + '/3';
    document.getElementById('diceBtn').disabled = true;
    updatePoints(-50);
    const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    const d1 = document.getElementById('dice1');
    const d2 = document.getElementById('dice2');
    d1.classList.add('rolling'); d2.classList.add('rolling');
    let ticks = 0;
    const interval = setInterval(() => {
        d1.innerText = faces[Math.floor(Math.random() * 6)];
        d2.innerText = faces[Math.floor(Math.random() * 6)];
        ticks++;
        if (ticks > 15) {
            clearInterval(interval);
            d1.classList.remove('rolling'); d2.classList.remove('rolling');
            const v1 = Math.floor(Math.random() * 6) + 1;
            const v2 = Math.floor(Math.random() * 6) + 1;
            d1.innerText = faces[v1 - 1]; d2.innerText = faces[v2 - 1];
            const sum = v1 + v2;
            let pts = 0, msg = '';
            if (sum === diceState.guess) { pts = 300; msg = `🎉 EXACT! Sum ${sum} = +300!`; }
            else if (Math.abs(sum - diceState.guess) === 1) { pts = 100; msg = `👍 Close! Sum ${sum} = +100!`; }
            else msg = `❌ Sum was ${sum}`;
            if (pts > 0) { userData.points += pts; userData.wins++; } else userData.losses++;
            incrementGame('Dice', 50, pts > 0, pts);
            document.getElementById('diceResult').className = 'game-result-box show ' + (pts > 0 ? 'win' : 'lose');
            document.getElementById('diceResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">${pts > 0 ? '🎉' : '❌'}</div>${msg}`;
            if (pts > 0) launchConfetti();
            if (diceState.rolls >= 3) document.getElementById('diceBtn').innerText = '✅ Done!';
            else document.getElementById('diceBtn').disabled = false;
        }
    }, 80);
}

// ================= GAME 8: MINES =================
let minesState = { mines: [], revealed: 0, multiplier: 1.0, active: false };

function initMines() {
    minesState.mines = []; minesState.revealed = 0; minesState.multiplier = 1.0; minesState.active = false;
    while (minesState.mines.length < 5) { const n = Math.floor(Math.random() * 25); if (!minesState.mines.includes(n)) minesState.mines.push(n); }
    document.getElementById('minesCount').innerText = '0';
    document.getElementById('minesMult').innerText = '1.00x';
    document.getElementById('minesCashBtn').disabled = true;
    document.getElementById('minesResult').className = 'game-result-box';
    let html = '';
    for (let i = 0; i < 25; i++) html += `<div class="mine-cell" data-idx="${i}" onclick="minesReveal(${i}, this)"></div>`;
    document.getElementById('minesGrid').innerHTML = html;
}

function minesReveal(idx, el) {
    if (el.classList.contains('revealed') || el.classList.contains('mine')) return;
    if (userData.points < 50) return showToast("⚠️ Points kam hai!", "error");
    if (!canPlay()) return;
    if (!minesState.active) { minesState.active = true; updatePoints(-50); }
    if (minesState.mines.includes(idx)) {
        el.classList.add('mine'); el.innerText = '💥';
        document.querySelectorAll('.mine-cell').forEach((c, i) => { if (minesState.mines.includes(i)) c.classList.add('mine'); });
        userData.losses++;
        incrementGame('Mines', 50, false, 0);
        document.getElementById('minesResult').className = 'game-result-box show lose';
        document.getElementById('minesResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">💥</div>BOOM! Mine hit! -50`;
        minesState.active = false;
        document.getElementById('minesCashBtn').disabled = true;
    } else {
        el.classList.add('revealed'); el.innerText = '💎';
        minesState.revealed++;
        minesState.multiplier = 1 + minesState.revealed * 0.3;
        document.getElementById('minesCount').innerText = minesState.revealed;
        document.getElementById('minesMult').innerText = minesState.multiplier.toFixed(2) + 'x';
        document.getElementById('minesCashBtn').disabled = false;
    }
}

function minesCashOut() {
    if (!minesState.active) return;
    const win = Math.floor(50 * minesState.multiplier);
    userData.points += win; userData.wins++;
    incrementGame('Mines', 50, true, win);
    document.getElementById('minesResult').className = 'game-result-box show win';
    document.getElementById('minesResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">🎉</div>Cashed! +${win} Points!`;
    launchConfetti();
    minesState.active = false;
    document.getElementById('minesCashBtn').disabled = true;
}

// ================= GAME 9: BASKETBALL =================
let bbState = { score: 0, shots: 0 };

function initBasketball() {
    bbState.score = 0; bbState.shots = 0;
    document.getElementById('bbCount').innerText = '0/5';
    document.getElementById('bbScore').innerText = '0';
    document.getElementById('bbBtn').disabled = false;
    document.getElementById('bbBtn').innerText = '🏀 SHOOT';
    document.getElementById('bbResult').className = 'game-result-box';
    document.getElementById('bbBall').style.top = '30px';
    document.getElementById('bbBall').style.right = '40px';
    document.getElementById('bbPower').value = 50;
    document.getElementById('bbPowerVal').innerText = '50%';
    document.getElementById('bbPower').oninput = function() { document.getElementById('bbPowerVal').innerText = this.value + '%'; };
}

function shootBall() {
    if (bbState.shots >= 5) return;
    if (userData.points < 50) return showToast("⚠️ Points kam hai!", "error");
    if (!canPlay()) return;
    bbState.shots++;
    document.getElementById('bbCount').innerText = bbState.shots + '/5';
    document.getElementById('bbBtn').disabled = true;
    updatePoints(-50);
    const power = parseInt(document.getElementById('bbPower').value);
    const target = 50 + Math.floor(Math.random() * 20) - 10;
    const diff = Math.abs(power - target);
    let pts = 0, label = '';
    if (diff <= 3) { pts = 300; label = '🎯 PERFECT! +300'; }
    else if (diff <= 8) { pts = 150; label = '👍 GREAT! +150'; }
    else if (diff <= 15) { pts = 75; label = '😊 GOOD! +75'; }
    else { pts = 10; label = '❌ Miss! +10'; }
    bbState.score += pts;
    document.getElementById('bbScore').innerText = bbState.score;
    if (pts > 0) { userData.points += pts; userData.wins++; }
    incrementGame('Basketball', 50, pts >= 75, pts);
    const ball = document.getElementById('bbBall');
    ball.style.top = '80px'; ball.style.right = '80px'; ball.style.transform = 'scale(0.7)';
    document.getElementById('bbResult').className = 'game-result-box show ' + (pts >= 75 ? 'win' : 'lose');
    document.getElementById('bbResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">${label.split(' ')[0]}</div>${label}`;
    if (pts >= 150) launchConfetti();
    setTimeout(() => {
        ball.style.top = '30px'; ball.style.right = '40px'; ball.style.transform = 'scale(1)';
        if (bbState.shots >= 5) document.getElementById('bbBtn').innerText = '✅ Done!';
        else document.getElementById('bbBtn').disabled = false;
    }, 800);
}

// ================= GAME 10: LUCKY DRAW =================
let luckyState = { selected: [], canPick: true };

function initLucky() {
    luckyState.selected = []; luckyState.canPick = true;
    document.getElementById('luckyCount').innerText = '0/3';
    document.getElementById('luckyBtn').disabled = true;
    document.getElementById('luckyBtn').innerText = '🎪 REVEAL';
    document.getElementById('luckyResult').className = 'game-result-box';
    const values = [10, 20, 30, 50, 75, 100, 150, 200, 25, 40];
    for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
    let html = '';
    for (let i = 0; i < 10; i++) html += `<div class="lucky-ball" data-val="${values[i]}" data-idx="${i}" onclick="pickLucky(${i}, this)">${i + 1}</div>`;
    document.getElementById('luckyBalls').innerHTML = html;
}

function pickLucky(idx, el) {
    if (!luckyState.canPick) return;
    if (luckyState.selected.includes(idx)) { luckyState.selected = luckyState.selected.filter(i => i !== idx); el.classList.remove('drawn'); }
    else { if (luckyState.selected.length >= 3) return; luckyState.selected.push(idx); el.classList.add('drawn'); }
    document.getElementById('luckyCount').innerText = luckyState.selected.length + '/3';
    document.getElementById('luckyBtn').disabled = luckyState.selected.length !== 3;
}

function luckyPlay() {
    if (luckyState.selected.length !== 3) return;
    if (userData.points < 50) return showToast("⚠️ Points kam hai!", "error");
    if (!canPlay()) return;
    updatePoints(-50);
    luckyState.canPick = false;
    document.getElementById('luckyBtn').disabled = true;
    let total = 0;
    luckyState.selected.forEach(idx => { const el = document.querySelector(`.lucky-ball[data-idx="${idx}"]`); total += parseInt(el.dataset.val); });
    userData.points += total; userData.wins++;
    incrementGame('Lucky Draw', 50, true, total);
    document.getElementById('luckyResult').className = 'game-result-box show win';
    document.getElementById('luckyResult').innerHTML = `<div style="font-size:36px;margin-bottom:6px">🎉</div>+${total} Points!`;
    launchConfetti();
    document.getElementById('luckyBtn').innerText = '✅ Done!';
}

// ================= MODAL & TOAST =================
function showResultModal(won, points) {
    const overlay = document.getElementById('resultOverlay');
    if (!overlay) { showToast(won ? '🎉 YOU WON! ' + points : '😢 YOU LOST! ' + points); if (won) launchConfetti(); return; }
    const icon = document.getElementById('resultIcon');
    const title = document.getElementById('resultTitle');
    const pts = document.getElementById('resultPoints');
    if (icon) icon.innerText = won ? '🎉' : '😢';
    if (title) { title.innerText = won ? 'YOU WON!' : 'YOU LOST!'; title.className = 'result-title ' + (won ? 'win' : 'lose'); }
    if (pts) { pts.innerText = points; pts.className = 'result-points ' + (won ? 'win' : 'lose'); }
    overlay.classList.add('show');
    overlay.style.display = 'flex';
    if (won) launchConfetti();
}

function closeResult() {
    const overlay = document.getElementById('resultOverlay');
    if (overlay) { overlay.classList.remove('show'); overlay.style.display = 'none'; }
}

function watchAd() {
    showToast("📺 Ad loading...");
    setTimeout(() => {
        userData.points += CONFIG.adReward;
        saveUserData(); updateUI();
        showToast("🎉 +" + CONFIG.adReward + " Points!");
        launchConfetti();
        if (document.getElementById('page-profile').classList.contains('active')) renderProfile();
    }, 2000);
}

function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._t);
    t._t = setTimeout(() => t.className = 'toast ' + type, 2800);
}

function launchConfetti() {
    const colors = ['#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];
    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.style.cssText = `position:fixed;width:8px;height:8px;left:${Math.random()*100}vw;top:-10px;background:${colors[Math.floor(Math.random()*colors.length)]};z-index:9999;pointer-events:none;border-radius:2px;animation:confettiFall 3s linear forwards;`;
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 4000);
    }
}

// Confetti keyframe inject
const style = document.createElement('style');
style.textContent = '@keyframes confettiFall{0%{transform:translateY(-100vh) rotate(0deg);opacity:1;}100%{transform:translateY(100vh) rotate(720deg);opacity:0;}}';
document.head.appendChild(style);

// ================= INIT =================
window.addEventListener('load', () => {
    if (userData && userData.mobile) {
        document.getElementById('loginOverlay').classList.add('hide');
        document.getElementById('profileBtn').classList.add('show');
        updateUI();
    } else {
        document.getElementById('loginOverlay').classList.remove('hide');
    }
});
