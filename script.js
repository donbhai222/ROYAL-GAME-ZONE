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
    const els = {
        headerPoints: userData.points,
        statPoints: userData.points,
        statToday: userData.todayGames + '/' + CONFIG.dailyLimit,
        statWins: userData.wins,
        welcomeName: userData.name,
        welcomeAvatar: userData.name.charAt(0).toUpperCase()
    };
    for (const id in els) {
        const el = document.getElementById(id);
        if (el) el.innerText = els[id];
    }
}

function canPlay() {
    if (userData.todayGames >= CONFIG.dailyLimit) {
        showToast("⚠️ Aaj ke " + CONFIG.dailyLimit + " games khatam!", "error");
        return false;
    }
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
const GAME_TITLES = { home: '🎮 ROYAL GAMES', color: '🎨 Color / Number', profile: '👤 My Profile' };

function goToGame(gameId) {
    if (!userData) return;
    if (gameId === 'color') {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-color').classList.add('active');
        document.getElementById('headerTitle').innerText = GAME_TITLES.color;
        document.getElementById('backBtn').classList.add('show');
        document.getElementById('profileBtn').classList.remove('show');
        window.scrollTo(0, 0);
        initColor();
    } else {
        showToast("⚠️ Ye game jald aa raha hai!", "info");
    }
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
    if (!userData.playHistory || userData.playHistory.length === 0) {
        log.innerHTML = '<div style="text-align:center;color:#94a3b8;font-size:12px;">Koi history nahi</div>';
        return;
    }
    log.innerHTML = userData.playHistory.slice(0, 20).map(h => `
        <div class="history-log-item ${h.won ? '' : 'lose'}">
            <div><div class="hl-game">${h.game}</div><div class="hl-time">${h.time} • Bet: ${h.bet}</div></div>
            <div class="hl-amount">${h.won ? '+' + h.amount : '-' + h.bet}</div>
        </div>`).join('');
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

// ================= COLOR + NUMBER =================
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
        if (i % 2 === 0) {
            const color = rand < 0.45 ? 'green' : rand < 0.90 ? 'red' : 'violet';
            generated.push(color);
            if (i === 0) lastColor = color;
        } else {
            const num = Math.floor(Math.random() * 10);
            generated.push('num' + num);
            if (i === 0) lastNum = num;
        }
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
    if (colorState.mode === 'color' && colorState.selectedColor) {
        selection = colorState.selectedColor.toUpperCase();
        mult = colorState.selectedColor === 'violet' ? 4.5 : 2.0;
    } else if (colorState.mode === 'number' && colorState.selectedNumber !== null) {
        selection = 'NUMBER ' + colorState.selectedNumber;
        mult = 9.0;
    }
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
            if (won) { userData.points += change; userData.wins++; }
            else userData.losses++;
            incrementGame('Color Predict', colorState.bet, won, change);
            showResultModal(won, won ? '+' + change + ' Points!' : '-' + colorState.bet + ' Points');
        } else if (colorState.mode === 'number' && colorState.selectedNumber !== null) {
            won = colorState.selectedNumber === numberResult;
            change = won ? Math.floor(colorState.bet * 9) : 0;
            if (won) { userData.points += change; userData.wins++; }
            else userData.losses++;
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
    if (userHadBet && colorState.mode === 'color') {
        colorSub.innerText = won ? '🎉 YOU WON!' : '😢 YOU LOST';
        colorBox.classList.add(won ? 'active-win' : 'active-lose');
    } else colorSub.innerText = color.toUpperCase();
    numberValue.className = 'dual-value number-val';
    numberValue.innerText = number;
    if (userHadBet && colorState.mode === 'number') {
        numberSub.innerText = won ? '🎉 YOU WON!' : '😢 YOU LOST';
        numberBox.classList.add(won ? 'active-win' : 'active-lose');
    } else numberSub.innerText = 'NUMBER ' + number;
    if (won && userHadBet) launchConfetti();
}

function renderColorHistory() {
    const el = document.getElementById('colorHistory');
    if (colorState.history.length === 0) {
        el.innerHTML = '<div style="color:#94a3b8;font-size:11px;width:100%;text-align:center;">Abhi tak koi result nahi</div>';
        return;
    }
    el.innerHTML = colorState.history.map(c => {
        if (c.startsWith('dual_')) {
            const parts = c.replace('dual_', '').split('_');
            const color = parts[0], num = parts[1];
            const colorEmoji = color === 'green' ? '🟢' : color === 'red' ? '🔴' : '🟣';
            return `<div class="history-item" style="background:linear-gradient(135deg, ${color === 'green' ? '#10b981,#059669' : color === 'red' ? '#ef4444,#dc2626' : '#a855f7,#7c3aed'});width:auto;padding:0 8px;border-radius:12px;font-size:12px;gap:4px;display:flex;align-items:center;"><span>${colorEmoji}</span><span style="color:#fff;font-weight:900;font-size:11px;">${num}</span></div>`;
        }
        if (c.startsWith('num')) {
            const num = c.replace('num', '');
            return `<div class="history-item" style="background:linear-gradient(135deg,#f59e0b,#f97316);color:#0a0e27;">${num}</div>`;
        }
        return `<div class="history-item ${c}">${c === 'green' ? '🟢' : c === 'red' ? '🔴' : '🟣'}</div>`;
    }).join('');
}

// ================= MODAL & TOAST =================
function showResultModal(won, points) {
    const overlay = document.getElementById('resultOverlay');
    if (!overlay) {
        // Simple toast based fallback
        showToast(won ? '🎉 YOU WON! ' + points : '😢 YOU LOST! ' + points);
        if (won) launchConfetti();
        return;
    }
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
        saveUserData();
        updateUI();
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
style.textContent = '@keyframes confettiFall { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }';
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
