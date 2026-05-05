// Initialize Lucide icons
lucide.createIcons();

// --- STATE MANAGEMENT ---
const defaultTasks = [
    { id: 't1', title: '5 Daily Salah', desc: 'Fajr, Dhuhr, Asr, Maghrib, Isha', completed: false },
    { id: 't2', title: 'Quran Reading', desc: 'Minimum 2 pages', completed: false },
    { id: 't3', title: 'Self-Improvement', desc: 'Read 10 pages of a book', completed: false },
    { id: 't4', title: 'Avoid Distractions', desc: 'No mindless scrolling', completed: false }
];

const INITIAL_STATE = {
    currentUser: null,
    users: {
        'user_1': { id: 'user_1', name: 'Mohammed faheem', credentials: null, streak: 0, score: 0, lastStreakDate: null },
        'user_2': { id: 'user_2', name: 'Mahmood Ihlas', credentials: null, streak: 0, score: 0, lastStreakDate: null },
        'user_3': { id: 'user_3', name: 'Mohammed Firoz', credentials: null, streak: 0, score: 0, lastStreakDate: null }
    },
    userTasks: {
        'user_1': JSON.parse(JSON.stringify(defaultTasks)),
        'user_2': JSON.parse(JSON.stringify(defaultTasks)),
        'user_3': JSON.parse(JSON.stringify(defaultTasks))
    },
    messages: [
        { id: 'm1', senderId: 'user_2', text: 'As-salamu alaykum brothers! Just finished my Quran reading.', timestamp: '09:00 AM' },
        { id: 'm2', senderId: 'user_3', text: 'Wa alaykum as-salam. Mashallah!', timestamp: '09:05 AM' }
    ],
    finesHistory: [
        { id: 'f1', userId: 'user_2', amount: 10, date: '2026-05-01' }
    ],
    agendas: [
        { id: 'a1', text: 'Review weekly habits' },
        { id: 'a2', text: 'Discuss book insights' }
    ],
    excuseRequests: []
};

// Load state from local storage or use initial state
let state = JSON.parse(localStorage.getItem('khata_state_v6')) || INITIAL_STATE;

function saveState() {
    localStorage.setItem('khata_state_v6', JSON.stringify(state));
    render();
}

// --- DOM ELEMENTS ---
const viewDashboard = document.getElementById('view-dashboard');
const viewFines = document.getElementById('view-fines');
const viewChat = document.getElementById('view-chat');
const navItems = document.querySelectorAll('.nav-item');
const themeToggle = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

// Auth Elements
const authScreen = document.getElementById('auth-screen');
const screenSelect = document.getElementById('screen-select');
const screenSetup = document.getElementById('screen-setup');
const screenLogin = document.getElementById('screen-login');
const btnLogout = document.getElementById('btn-logout');

const setupNameDisplay = document.getElementById('setup-name-display');
const setupUserid = document.getElementById('setup-userid');
const setupPassword = document.getElementById('setup-password');
const btnSaveCreds = document.getElementById('btn-save-creds');

const loginNameDisplay = document.getElementById('login-name-display');
const loginUserid = document.getElementById('login-userid');
const loginPassword = document.getElementById('login-password');
const btnLogin = document.getElementById('btn-login');
const loginError = document.getElementById('login-error');

let selectedUserIdForAuth = null;

// Dashboard Elements
const dailyChecklistEl = document.getElementById('daily-checklist');
const dailyProgressEl = document.getElementById('daily-progress');
const dailyDateEl = document.getElementById('daily-date');
const leaderboardContainer = document.getElementById('leaderboard-container');
const currentUserName = document.getElementById('current-user-name');
const agendaListEl = document.getElementById('agenda-list');
const agendaInput = document.getElementById('agenda-input');
const btnAddAgenda = document.getElementById('btn-add-agenda');

// Chat Elements
const chatMessagesEl = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnSendMessage = document.getElementById('btn-send-message');
const btnLaunchTeams = document.getElementById('btn-launch-teams');
const btnEditTeamsLink = document.getElementById('btn-edit-teams-link');

// Fines
const btnUploadProof = document.getElementById('btn-upload-proof');
const btnAddPayment = document.getElementById('btn-add-payment');
const paymentUserSelect = document.getElementById('payment-user');
const paymentAmountInput = document.getElementById('payment-amount');
const historyListEl = document.getElementById('history-list');

// --- THEME TOGGLE ---
// Check system preference on load
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    if(!localStorage.getItem('theme')) htmlEl.setAttribute('data-theme', 'light');
}
// Check saved preference
if (localStorage.getItem('theme')) {
    htmlEl.setAttribute('data-theme', localStorage.getItem('theme'));
}

themeToggle.addEventListener('click', () => {
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});


// --- NAVIGATION ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Remove active from all nav items
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Hide all views
        viewDashboard.classList.remove('active');
        viewFines.classList.remove('active');
        viewChat.classList.remove('active');

        // Show target view
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        
        // Scroll chat to bottom if chat is opened
        if (targetId === 'view-chat') {
            scrollToBottom();
        }
    });
});

// --- RENDER LOGIC ---
function render() {
    if (!state.currentUser) return;
    renderDashboard();
    renderLeaderboard();
    renderChat();
    renderFinesHistory();
    renderAgendas();
    lucide.createIcons();
}

function renderDashboard() {
    const currentUser = state.users[state.currentUser];
    currentUserName.textContent = currentUser.name;
    
    const todayStr = new Date().toDateString();
    
    if (dailyDateEl) {
        dailyDateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    
    // 1. Render approvals for OTHER users
    const pendingApprovalsContainer = document.getElementById('pending-approvals-container');
    const approvalsList = document.getElementById('approvals-list');
    
    if (pendingApprovalsContainer && approvalsList) {
        const pendingForMe = state.excuseRequests.filter(req => req.status === 'pending' && req.userId !== state.currentUser && req.votes[state.currentUser] === null);
        
        if (pendingForMe.length > 0) {
            pendingApprovalsContainer.style.display = 'block';
            approvalsList.innerHTML = '';
            
            pendingForMe.forEach(req => {
                const requesterName = state.users[req.userId].name;
                const taskName = state.userTasks[req.userId].find(t => t.id === req.taskId)?.title || 'Unknown Task';
                
                const item = document.createElement('div');
                item.className = 'approval-item';
                item.innerHTML = `
                    <div style="font-size: 0.85rem; font-weight: 500; margin-bottom: 0.25rem;">${requesterName} missed "${taskName}"</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">"${req.reason}"</div>
                    <div class="approval-actions">
                        <button class="btn-approve" onclick="castVote('${req.id}', 'approve')">Approve</button>
                        <button class="btn-reject" onclick="castVote('${req.id}', 'reject')">Reject</button>
                    </div>
                `;
                approvalsList.appendChild(item);
            });
        } else {
            pendingApprovalsContainer.style.display = 'none';
        }
    }

    let completedCount = 0;
    dailyChecklistEl.innerHTML = '';
    
    const userTasks = state.userTasks[state.currentUser] || [];
    userTasks.forEach(task => {
        if (task.completed) completedCount++;
        
        const excuseReq = state.excuseRequests.find(r => r.userId === state.currentUser && r.taskId === task.id && r.date === todayStr);
        
        const taskEl = document.createElement('div');
        taskEl.className = `checklist-item ${task.completed ? 'completed' : ''}`;
        
        if (excuseReq) {
            let statusHtml = '';
            if (excuseReq.status === 'pending') {
                const votesCount = Object.values(excuseReq.votes).filter(v => v === 'approve').length;
                statusHtml = `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;"><i data-lucide="clock" style="width:14px;height:14px;vertical-align:-2px;"></i> Excuse pending approval... (${votesCount}/2 Approved)</div>`;
            } else if (excuseReq.status === 'approved') {
                statusHtml = `<div style="font-size:0.8rem; color:var(--success); margin-top:0.5rem;"><i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:-2px;"></i> Excuse Approved. Task excused for today.</div>`;
            } else if (excuseReq.status === 'rejected') {
                statusHtml = `
                    <div style="font-size:0.8rem; color:var(--danger); margin-top:0.5rem; font-weight:500;">
                        <i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:-2px;"></i> Excuse Rejected. Fine required.
                    </div>
                    <button class="btn btn-primary mt-2" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="resolveRejectedExcuse('${excuseReq.id}')">Mark Fine as Paid</button>
                `;
            } else if (excuseReq.status === 'resolved') {
                 statusHtml = `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;"><i data-lucide="check" style="width:14px;height:14px;vertical-align:-2px;"></i> Rejected, fine paid.</div>`;
            }
            
            taskEl.innerHTML = `
                <div class="checkbox-custom" style="opacity: 0.5; pointer-events: none;">
                    <i data-lucide="${excuseReq.status === 'approved' ? 'check' : 'x'}"></i>
                </div>
                <div class="task-content">
                    <div class="task-name" style="${excuseReq.status === 'approved' ? 'text-decoration: line-through;' : ''}">${task.title}</div>
                    <div class="task-desc">${task.desc}</div>
                    ${statusHtml}
                </div>
            `;
        } else {
            taskEl.innerHTML = `
                <div class="checkbox-custom" onclick="toggleTask('${task.id}')">
                    <i data-lucide="check"></i>
                </div>
                <div class="task-content" style="flex:1;">
                    <div class="task-name" onclick="toggleTask('${task.id}')">${task.title}</div>
                    <div class="task-desc" onclick="toggleTask('${task.id}')">${task.desc}</div>
                    <div id="excuse-input-container-${task.id}" class="excuse-input-container" style="display:none;">
                        <textarea id="excuse-input-${task.id}" class="excuse-input" placeholder="Reason for missing..."></textarea>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn btn-primary" style="flex:1; padding:0.4rem; font-size:0.8rem;" onclick="submitExcuse('${task.id}')">Submit</button>
                            <button class="btn" style="background:var(--bg-hover); color:var(--text-primary); border:1px solid var(--border); padding:0.4rem; font-size:0.8rem;" onclick="cancelExcuse('${task.id}')">Cancel</button>
                        </div>
                    </div>
                </div>
                ${!task.completed ? `<button class="btn-missed" onclick="showExcuseInput('${task.id}', event)"><i data-lucide="x" style="width:14px;height:14px;"></i> Missed</button>` : ''}
            `;
        }
        
        dailyChecklistEl.appendChild(taskEl);
    });

    const excusedCount = state.excuseRequests.filter(r => r.userId === state.currentUser && r.date === todayStr && r.status === 'approved').length;
    dailyProgressEl.textContent = `${completedCount + excusedCount}/${userTasks.length}`;
}

window.toggleTask = function(taskId) {
    const user = state.users[state.currentUser];
    const userTasks = state.userTasks[state.currentUser];
    const task = userTasks.find(t => t.id === taskId);
    
    if (task) {
        task.completed = !task.completed;
        
        const todayStr = new Date().toDateString();
        
        // Check if all tasks are completed (including excused ones)
        const excusedCount = state.excuseRequests.filter(r => r.userId === state.currentUser && r.date === todayStr && r.status === 'approved').length;
        const completedCount = userTasks.filter(t => t.completed).length;
        const totalCount = userTasks.length;
        
        if (completedCount + excusedCount >= totalCount) {
            // All completed
            if (user.lastStreakDate !== todayStr) {
                user.streak += 1;
                user.lastStreakDate = todayStr;
            }
        } else {
            // Not all completed
            if (user.lastStreakDate === todayStr) {
                // They unchecked a task today, so revert the streak addition
                user.streak = Math.max(0, user.streak - 1);
                user.lastStreakDate = null; // Reset today's flag
            }
        }
        
        // Update score (percentage of tasks completed)
        user.score = Math.round(((completedCount + excusedCount) / totalCount) * 100);
        
        saveState();
    }
}

// --- EXCUSE & APPROVAL LOGIC ---

window.showExcuseInput = function(taskId, event) {
    if (event) event.stopPropagation();
    const container = document.getElementById(`excuse-input-container-${taskId}`);
    if (container) container.style.display = 'flex';
}

window.cancelExcuse = function(taskId) {
    const container = document.getElementById(`excuse-input-container-${taskId}`);
    if (container) container.style.display = 'none';
}

window.submitExcuse = function(taskId) {
    const inputEl = document.getElementById(`excuse-input-${taskId}`);
    const reason = inputEl.value.trim();
    
    if (!reason) {
        alert("Please provide a reason.");
        return;
    }
    
    // Prepare votes object initialized to null for other users
    const votes = {};
    Object.keys(state.users).forEach(uid => {
        if (uid !== state.currentUser) {
            votes[uid] = null;
        }
    });
    
    state.excuseRequests.push({
        id: 'req_' + Date.now(),
        userId: state.currentUser,
        taskId: taskId,
        date: new Date().toDateString(),
        reason: reason,
        votes: votes,
        status: 'pending'
    });
    
    saveState();
}

window.castVote = function(reqId, voteType) {
    const req = state.excuseRequests.find(r => r.id === reqId);
    if (!req) return;
    
    req.votes[state.currentUser] = voteType;
    
    // Check if all votes are in
    const voteValues = Object.values(req.votes);
    if (voteValues.every(v => v !== null)) {
        // Evaluate outcome
        if (voteValues.every(v => v === 'approve')) {
            req.status = 'approved';
            
            // Auto increment streak if this makes them 4/4
            const user = state.users[req.userId];
            const userTasks = state.userTasks[req.userId];
            const completedCount = userTasks.filter(t => t.completed).length;
            const excusedCount = state.excuseRequests.filter(r => r.userId === req.userId && r.date === req.date && r.status === 'approved').length;
            if (completedCount + excusedCount >= userTasks.length) {
                if (user.lastStreakDate !== req.date) {
                    user.streak += 1;
                    user.lastStreakDate = req.date;
                    user.score = Math.round(((completedCount + excusedCount) / userTasks.length) * 100);
                }
            }
        } else {
            req.status = 'rejected';
        }
    }
    
    saveState();
}

window.resolveRejectedExcuse = function(reqId) {
    const req = state.excuseRequests.find(r => r.id === reqId);
    if (!req) return;
    
    // Add fine to history
    // Logic for amount: 10, then double
    let amount = 10;
    const userFines = state.finesHistory.filter(f => f.userId === state.currentUser).sort((a,b) => b.amount - a.amount);
    if (userFines.length > 0) {
        amount = userFines[0].amount * 2;
    }
    
    state.finesHistory.push({
        id: 'f_' + Date.now(),
        userId: state.currentUser,
        amount: amount,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
    
    req.status = 'resolved';
    saveState();
    alert(`Fine of ₹${amount} recorded as paid. Please ensure you transfer it.`);
}

function renderLeaderboard() {
    leaderboardContainer.innerHTML = '';
    
    // Sort users by score descending
    const sortedUsers = Object.values(state.users).sort((a, b) => b.score - a.score);
    
    sortedUsers.forEach(user => {
        const itemEl = document.createElement('div');
        itemEl.className = 'leaderboard-item';
        const initial = user.name.charAt(0).toUpperCase();
        itemEl.innerHTML = `
            <div class="avatar">${initial}</div>
            <div class="user-info">
                <div class="user-name">${user.name} ${user.id === state.currentUser ? '(You)' : ''}</div>
                <div class="user-streak"><i data-lucide="flame" style="width:12px;height:12px;color:var(--accent)"></i> ${user.streak} days</div>
            </div>
            <div class="user-score">${user.score}%</div>
        `;
        leaderboardContainer.appendChild(itemEl);
    });
}

function renderChat() {
    chatMessagesEl.innerHTML = '';
    state.messages.forEach(msg => {
        const isMe = msg.senderId === state.currentUser;
        const sender = state.users[msg.senderId];
        const msgEl = document.createElement('div');
        msgEl.className = `message ${isMe ? 'msg-sent' : 'msg-received'}`;
        
        let html = '';
        if (!isMe) {
            html += `<div class="msg-sender">${sender.name}</div>`;
        }
        html += `
            <div class="msg-text">${msg.text}</div>
            <div class="msg-time">${msg.timestamp}</div>
        `;
        msgEl.innerHTML = html;
        chatMessagesEl.appendChild(msgEl);
    });
}

function scrollToBottom() {
    setTimeout(() => {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }, 50);
}

// --- ACTIONS ---

// Send Message
btnSendMessage.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    state.messages.push({
        id: 'm' + Date.now(),
        senderId: state.currentUser,
        text: text,
        timestamp: timeString
    });
    
    chatInput.value = '';
    saveState();
    scrollToBottom();
}

// MS Teams Launch & Edit
btnLaunchTeams.addEventListener('click', () => {
    if (state.teamsMeetingLink) {
        window.open(state.teamsMeetingLink, '_blank');
    } else {
        const link = prompt('Please paste your Microsoft Teams meeting link:');
        if (link && link.trim() !== '') {
            state.teamsMeetingLink = link.trim();
            saveState();
            window.open(state.teamsMeetingLink, '_blank');
        }
    }
});

btnEditTeamsLink.addEventListener('click', () => {
    const currentLink = state.teamsMeetingLink || '';
    const link = prompt('Edit your Microsoft Teams meeting link:', currentLink);
    if (link !== null) {
        state.teamsMeetingLink = link.trim();
        saveState();
        alert('Meeting link updated!');
    }
});

// Upload Proof
btnUploadProof.addEventListener('click', () => {
    alert('Simulating receipt upload. In production, this would open the file picker and upload to Supabase Storage.');
});

// --- AUTH LOGIC ---

// 1. Select User
document.querySelectorAll('.btn-select-user').forEach(btn => {
    btn.addEventListener('click', (e) => {
        selectedUserIdForAuth = e.target.getAttribute('data-userid');
        const user = state.users[selectedUserIdForAuth];
        
        screenSelect.style.display = 'none';
        
        if (!user.credentials) {
            // Needs setup
            setupNameDisplay.textContent = user.name;
            screenSetup.style.display = 'block';
        } else {
            // Already setup, needs login
            loginNameDisplay.textContent = user.name;
            screenLogin.style.display = 'block';
        }
    });
});

// Back buttons
document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
        screenSetup.style.display = 'none';
        screenLogin.style.display = 'none';
        screenSelect.style.display = 'block';
        loginError.style.display = 'none';
    });
});

// 2. Setup Credentials
btnSaveCreds.addEventListener('click', () => {
    const id = setupUserid.value.trim();
    const pass = setupPassword.value.trim();
    
    if (!id || !pass) {
        alert("Please fill in both User ID and Password");
        return;
    }
    
    // Save creds
    state.users[selectedUserIdForAuth].credentials = { id, pass };
    state.currentUser = selectedUserIdForAuth;
    saveState();
    
    authScreen.style.display = 'none';
    document.getElementById('app').style.display = 'flex';
});

// 3. Login Verification
btnLogin.addEventListener('click', () => {
    const id = loginUserid.value.trim();
    const pass = loginPassword.value.trim();
    
    const user = state.users[selectedUserIdForAuth];
    if (user.credentials.id === id && user.credentials.pass === pass) {
        state.currentUser = selectedUserIdForAuth;
        saveState();
        
        authScreen.style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        loginError.style.display = 'none';
    } else {
        loginError.style.display = 'block';
    }
});

// Logout
if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        state.currentUser = null;
        saveState();
        
        document.getElementById('app').style.display = 'none';
        screenSelect.style.display = 'block';
        screenSetup.style.display = 'none';
        screenLogin.style.display = 'none';
        authScreen.style.display = 'flex';
        
        setupUserid.value = '';
        setupPassword.value = '';
        loginUserid.value = '';
        loginPassword.value = '';
        loginError.style.display = 'none';
    });
}

// Fines History Logic
function renderFinesHistory() {
    if(!historyListEl) return;
    historyListEl.innerHTML = '';
    
    if(!state.finesHistory || state.finesHistory.length === 0) {
        historyListEl.innerHTML = '<p class="text-sm text-muted text-center py-4">No payments recorded yet.</p>';
        return;
    }
    
    // Sort by date descending
    const sortedHistory = [...state.finesHistory].reverse();
    
    sortedHistory.forEach(fine => {
        const user = state.users[fine.userId];
        const el = document.createElement('div');
        el.className = 'history-item';
        el.style.display = 'flex';
        el.style.justifyContent = 'space-between';
        el.style.alignItems = 'center';
        el.style.padding = '0.75rem 0';
        el.style.borderBottom = '1px solid var(--border)';
        
        el.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.75rem;">
                <div class="avatar" style="width:32px; height:32px; font-size:0.8rem;">${user.name.charAt(0)}</div>
                <div>
                    <div style="font-weight:500; font-size:0.9rem;">${user.name}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${fine.date}</div>
                </div>
            </div>
            <div style="font-weight:600; color:var(--success);">₹${fine.amount}</div>
        `;
        historyListEl.appendChild(el);
    });
}

if(btnAddPayment) {
    btnAddPayment.addEventListener('click', () => {
        const userId = paymentUserSelect.value;
        const amount = parseInt(paymentAmountInput.value);
        
        if(!amount || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        
        const now = new Date();
        const dateStr = now.toLocaleDateString();
        
        if(!state.finesHistory) state.finesHistory = [];
        
        state.finesHistory.push({
            id: 'f_' + Date.now(),
            userId: userId,
            amount: amount,
            date: dateStr
        });
        
        paymentAmountInput.value = '';
        saveState();
    });
}

// Agendas Logic
function renderAgendas() {
    if(!agendaListEl) return;
    agendaListEl.innerHTML = '';
    
    if(!state.agendas || state.agendas.length === 0) {
        agendaListEl.innerHTML = '<li style="color:rgba(255,255,255,0.7); font-style:italic;">No agendas added yet.</li>';
        return;
    }
    
    state.agendas.forEach((agenda, index) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.gap = '0.5rem';
        li.style.alignItems = 'flex-start';
        li.innerHTML = `
            <span style="color:var(--primary-light); font-weight:bold;">${index + 1}.</span>
            <span style="flex:1;">${agenda.text}</span>
        `;
        agendaListEl.appendChild(li);
    });
}

if(btnAddAgenda) {
    btnAddAgenda.addEventListener('click', () => {
        const text = agendaInput.value.trim();
        if(!text) return;
        
        if(!state.agendas) state.agendas = [];
        
        state.agendas.push({
            id: 'a_' + Date.now(),
            text: text
        });
        
        agendaInput.value = '';
        saveState();
    });
    
    agendaInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') btnAddAgenda.click();
    });
}

// --- NOTIFICATIONS & SCHEDULING ---
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

function getNextMeetingDateIST() {
    const now = new Date();
    // Get current UTC time
    const currentUTC = now.getTime() + (now.getTimezoneOffset() * 60000);
    
    // IST offset is +5.5 hours = 330 minutes
    const offsetIST = 330 * 60000;
    const nowIST = new Date(currentUTC + offsetIST);
    
    // Find next Friday (Day 5)
    let daysUntilFriday = (5 - nowIST.getDay() + 7) % 7;
    
    // If today is Friday but past 10:30 PM, the next meeting is next Friday (+7 days)
    if (daysUntilFriday === 0 && (nowIST.getHours() > 22 || (nowIST.getHours() === 22 && nowIST.getMinutes() >= 30))) {
        daysUntilFriday = 7;
    }
    
    const nextMeetingIST = new Date(nowIST);
    nextMeetingIST.setDate(nowIST.getDate() + daysUntilFriday);
    nextMeetingIST.setHours(22, 30, 0, 0); // 10:30 PM
    
    // Convert back to local time to compare with `now` easily
    const nextMeetingUTC = nextMeetingIST.getTime() - offsetIST;
    return new Date(nextMeetingUTC);
}

function sendNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: body });
    } else {
        // Fallback or if permission denied, use alert
        alert(`🔔 Reminder: ${title}\n${body}`);
    }
}

function checkMeetingReminders() {
    if (!state.currentUser) return; // don't notify if logged out
    
    const now = new Date();
    const nextMeeting = getNextMeetingDateIST();
    const diffMs = nextMeeting - now;
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (!state.lastNotified) state.lastNotified = {};
    
    // Create a unique ID for this week's meeting to track notifications
    const meetingId = nextMeeting.getTime().toString();
    
    if (!state.lastNotified[meetingId]) {
        state.lastNotified[meetingId] = [];
    }
    
    const notifiedList = state.lastNotified[meetingId];
    let shouldSave = false;

    if (diffMinutes === 60 && !notifiedList.includes(60)) {
        sendNotification("Weekly Check-in in 1 Hour!", "Prepare your agendas. Meeting starts at 10:30 PM IST.");
        notifiedList.push(60);
        shouldSave = true;
    } else if (diffMinutes === 30 && !notifiedList.includes(30)) {
        sendNotification("Weekly Check-in in 30 Minutes!", "Time to wrap up your tasks.");
        notifiedList.push(30);
        shouldSave = true;
    } else if (diffMinutes === 10 && !notifiedList.includes(10)) {
        sendNotification("Weekly Check-in in 10 Minutes!", "Get ready to join the Teams call.");
        notifiedList.push(10);
        shouldSave = true;
    }
    
    if (shouldSave) saveState();
}

// Request permission
requestNotificationPermission();
// Check every minute
setInterval(checkMeetingReminders, 60000);
// Check immediately on load after splash screen
setTimeout(checkMeetingReminders, 2500);

// Initial Render
render();

// Splash Screen Logic
window.addEventListener('load', () => {
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.getElementById('app');
    
    setTimeout(() => {
        splashScreen.classList.add('fade-out');
        setTimeout(() => {
            splashScreen.style.display = 'none';
            if (state.currentUser) {
                appContainer.style.display = 'flex';
            } else {
                authScreen.style.display = 'flex';
            }
        }, 500); // match transition duration
    }, 2000); // show splash for 2 seconds
});
