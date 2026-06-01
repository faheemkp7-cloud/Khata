import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUdx2mxoExiAsxyktlzSfUgp8HHEsbbS8",
  authDomain: "khata-2aac7.firebaseapp.com",
  projectId: "khata-2aac7",
  storageBucket: "khata-2aac7.firebasestorage.app",
  messagingSenderId: "388604048968",
  appId: "1:388604048968:web:0589feb46e180e76cb0a7d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Lucide icons
lucide.createIcons();

// --- STATE MANAGEMENT ---
const defaultTasks = [
    { id: 't1_1', title: 'Fajr Salah', desc: 'Perform Fajr prayer', completed: false },
    { id: 't1_2', title: 'Dhuhr Salah', desc: 'Perform Dhuhr prayer', completed: false },
    { id: 't1_3', title: 'Asr Salah', desc: 'Perform Asr prayer', completed: false },
    { id: 't1_4', title: 'Maghrib Salah', desc: 'Perform Maghrib prayer', completed: false },
    { id: 't1_5', title: 'Isha Salah', desc: 'Perform Isha prayer', completed: false },
    { id: 't2', title: 'Quran Reading', desc: 'Minimum 2 pages', completed: false },
    { id: 't3', title: 'Self-Improvement', desc: 'Read 10 pages of a book', completed: false },
    { id: 't4', title: 'Avoid Distractions', desc: 'No mindless scrolling', completed: false }
];

function playSuccessSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch(e) {
        console.error("Audio not supported");
    }
}

const INITIAL_STATE = {
    currentUser: null,
    users: {},
    userTasks: {},
    messages: [],
    finesHistory: [],
    agendas: [],
    excuseRequests: []
};

// Load state from local storage or use initial state
let state = JSON.parse(JSON.stringify(INITIAL_STATE));

async function saveState() {
    const sharedData = {
        users: state.users,
        userTasks: state.userTasks,
        finesHistory: state.finesHistory,
        agendas: state.agendas,
        excuseRequests: state.excuseRequests
    };
    
    try {
        await setDoc(doc(db, "appState", "global"), sharedData, { merge: true });
    } catch (e) {
        console.error("Error saving state to Firestore:", e);
    }
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
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authNameGroup = document.getElementById('auth-name-group');
const authName = document.getElementById('auth-name');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const btnGoogleSignin = document.getElementById('btn-google-signin');
const authError = document.getElementById('auth-error');
const toggleAuthMode = document.getElementById('toggle-auth-mode');
const btnLogout = document.getElementById('btn-logout');

let isSignupMode = false;

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
            if (typeof markMessagesAsSeen === 'function') markMessagesAsSeen();
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
    renderPaymentDropdown();
    lucide.createIcons();
}

function renderPaymentDropdown() {
    if(!paymentUserSelect) return;
    const currentVal = paymentUserSelect.value;
    paymentUserSelect.innerHTML = '';
    Object.values(state.users).forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        paymentUserSelect.appendChild(option);
    });
    if (state.users[currentVal]) {
        paymentUserSelect.value = currentVal;
    }
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
        if (task.completed) playSuccessSound();
        
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
        const msgEl = document.createElement('div');
        msgEl.className = `message ${isMe ? 'msg-sent' : 'msg-received'}`;
        
        let html = '';
        if (!isMe) {
            html += `<div class="msg-sender">${msg.senderName || 'Unknown User'}</div>`;
        }
        html += `
            <div class="msg-text">${msg.text}</div>
            <div class="msg-time" style="display:flex; align-items:center; justify-content:flex-end; gap:0.25rem;">
                ${msg.localTimeStr || msg.timestamp || ''}
        `;
        
        if (isMe) {
            const seenByOthers = (msg.seenBy || []).filter(id => id !== state.currentUser);
            if (seenByOthers.length > 0) {
                const names = seenByOthers.map(id => state.users[id]?.name || 'Unknown').join(', ');
                html += `<i data-lucide="check-check" style="width:14px;height:14px;color:#fff;" title="Seen by: ${names}"></i>`;
            } else {
                html += `<i data-lucide="check" style="width:14px;height:14px;color:rgba(255,255,255,0.7);"></i>`;
            }
        }
        html += `</div>`;
        
        msgEl.innerHTML = html;
        chatMessagesEl.appendChild(msgEl);
    });
    
    // Render the lucide icons we just injected
    if (window.lucide) {
        lucide.createIcons();
    }
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

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !state.currentUser) return;
    
    chatInput.value = ''; // clear early for UX
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentUserObj = state.users[state.currentUser];
    const senderName = currentUserObj ? currentUserObj.name : (auth.currentUser ? auth.currentUser.displayName : 'Unknown');
    
    try {
        await addDoc(collection(db, "messages"), {
            senderId: state.currentUser,
            senderName: senderName,
            text: text,
            timestamp: serverTimestamp(),
            localTimeStr: timeString,
            seenBy: [state.currentUser]
        });
        scrollToBottom();
    } catch (e) {
        console.error("Error sending message: ", e);
    }
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
const appContainer = document.getElementById('app');

// Toggle between Login and Signup modes
toggleAuthMode.addEventListener('click', (e) => {
    e.preventDefault();
    isSignupMode = !isSignupMode;
    
    if (isSignupMode) {
        authTitle.textContent = 'Create an Account';
        authSubtitle.textContent = 'Sign up to join Khata.';
        authNameGroup.style.display = 'block';
        btnAuthSubmit.textContent = 'Sign Up';
        toggleAuthMode.textContent = 'Already have an account? Log in';
    } else {
        authTitle.textContent = 'Welcome Back';
        authSubtitle.textContent = 'Sign in to continue to Khata.';
        authNameGroup.style.display = 'none';
        btnAuthSubmit.textContent = 'Log In';
        toggleAuthMode.textContent = "Don't have an account? Sign up";
    }
    authError.style.display = 'none';
});

// Handle Auth Submit (Email/Password)
btnAuthSubmit.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const name = authName.value.trim();
    
    if (!email || !password) {
        authError.textContent = "Please fill in email and password.";
        authError.style.display = 'block';
        return;
    }
    
    if (isSignupMode && !name) {
        authError.textContent = "Please provide your full name.";
        authError.style.display = 'block';
        return;
    }

    try {
        btnAuthSubmit.disabled = true;
        authError.style.display = 'none';
        
        if (isSignupMode) {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCred.user, { displayName: name });
        } else {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (err) {
        authError.textContent = err.message;
        authError.style.display = 'block';
        console.error(err);
    } finally {
        btnAuthSubmit.disabled = false;
    }
});

// Handle Google Sign-in
btnGoogleSignin.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (err) {
        authError.textContent = err.message;
        authError.style.display = 'block';
        console.error(err);
    }
});

// Logout
if(btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            state.currentUser = null;
            saveState();
        } catch(err) {
            console.error("Error signing out", err);
        }
    });
}

// Firebase Chat Listener
let unsubscribeChat = null;
let initialChatLoad = true;

function setupChatListener() {
    if (unsubscribeChat) unsubscribeChat();
    
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        if (!initialChatLoad) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const msg = change.doc.data();
                    if (state.currentUser && msg.senderId !== state.currentUser) {
                        sendNotification("New Message from " + (msg.senderName || 'Brother'), msg.text, 'chat');
                    }
                }
            });
        }
        
        state.messages = [];
        let unreadCount = 0;
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            state.messages.push({ id: doc.id, ...data });
            
            if (state.currentUser && data.senderId !== state.currentUser && (!data.seenBy || !data.seenBy.includes(state.currentUser))) {
                unreadCount++;
            }
        });
        
        const isChatOpen = document.getElementById('view-chat').classList.contains('active');
        if (isChatOpen) {
            renderChat();
            scrollToBottom();
            markMessagesAsSeen();
        } else {
            renderChat();
            updateAppBadge(unreadCount);
        }
        
        initialChatLoad = false;
    });
}

function updateAppBadge(count) {
    if ('setAppBadge' in navigator) {
        if (count > 0) {
            navigator.setAppBadge(count).catch(console.error);
        } else {
            navigator.clearAppBadge().catch(console.error);
        }
    }
    // Also update UI badge
    const chatNav = document.querySelector('.nav-item[data-target="view-chat"]');
    if (chatNav) {
        let badge = chatNav.querySelector('.nav-badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'nav-badge';
                badge.style.position = 'absolute';
                badge.style.top = '4px';
                badge.style.right = '25%';
                badge.style.background = 'var(--danger)';
                badge.style.color = 'white';
                badge.style.fontSize = '0.65rem';
                badge.style.padding = '1px 5px';
                badge.style.borderRadius = '10px';
                badge.style.fontWeight = 'bold';
                badge.style.lineHeight = '1';
                chatNav.style.position = 'relative';
                chatNav.appendChild(badge);
            }
            badge.textContent = count > 9 ? '9+' : count;
        } else if (badge) {
            badge.remove();
        }
    }
}

window.markMessagesAsSeen = async function() {
    if (!state.currentUser) return;
    const unseenMsgs = state.messages.filter(msg => msg.senderId !== state.currentUser && (!msg.seenBy || !msg.seenBy.includes(state.currentUser)));
    
    if (unseenMsgs.length > 0) {
        updateAppBadge(0);
        
        // Update in Firestore
        unseenMsgs.forEach(async (msg) => {
            try {
                await updateDoc(doc(db, "messages", msg.id), {
                    seenBy: arrayUnion(state.currentUser)
                });
            } catch(e) {
                console.error("Error marking seen", e);
            }
        });
    }
}

// App State Listener
let unsubscribeState = null;

function setupStateListener(uid, name) {
    if (unsubscribeState) unsubscribeState();
    
    unsubscribeState = onSnapshot(doc(db, "appState", "global"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            state.users = data.users || state.users;
            state.userTasks = data.userTasks || state.userTasks;
            state.finesHistory = data.finesHistory || state.finesHistory;
            state.agendas = data.agendas || state.agendas;
            state.excuseRequests = data.excuseRequests || state.excuseRequests;
        }
        
        let needsSave = false;
        
        // Clean up legacy hardcoded users and their fines
        ['user_1', 'user_2', 'user_3'].forEach(id => {
            if (state.users[id]) { delete state.users[id]; needsSave = true; }
            if (state.userTasks[id]) { delete state.userTasks[id]; needsSave = true; }
        });
        
        if (state.finesHistory) {
            const originalLength = state.finesHistory.length;
            state.finesHistory = state.finesHistory.filter(f => !['user_1', 'user_2', 'user_3'].includes(f.userId));
            if (state.finesHistory.length !== originalLength) needsSave = true;
        }
        
        state.currentUser = uid;
        
        if (!state.users[uid]) {
            state.users[uid] = { id: uid, name: name, credentials: null, streak: 0, score: 0, lastStreakDate: null };
            needsSave = true;
        }
        
        // Migrate legacy 't1' (5 Daily Salah) to the 5 individual tasks
        Object.keys(state.userTasks || {}).forEach(userId => {
            const tasks = state.userTasks[userId];
            if (tasks && tasks.some(t => t.id === 't1')) {
                const t1Index = tasks.findIndex(t => t.id === 't1');
                const t1Completed = tasks[t1Index].completed;
                tasks.splice(t1Index, 1); // remove old t1
                const newTasks = [
                    { id: 't1_1', title: 'Fajr Salah', desc: 'Perform Fajr prayer', completed: t1Completed },
                    { id: 't1_2', title: 'Dhuhr Salah', desc: 'Perform Dhuhr prayer', completed: t1Completed },
                    { id: 't1_3', title: 'Asr Salah', desc: 'Perform Asr prayer', completed: t1Completed },
                    { id: 't1_4', title: 'Maghrib Salah', desc: 'Perform Maghrib prayer', completed: t1Completed },
                    { id: 't1_5', title: 'Isha Salah', desc: 'Perform Isha prayer', completed: t1Completed }
                ];
                tasks.splice(t1Index, 0, ...newTasks);
                needsSave = true;
            }
        });

        if (!state.userTasks[uid]) {
            state.userTasks[uid] = JSON.parse(JSON.stringify(defaultTasks));
            needsSave = true;
        }
        
        if (needsSave) {
            saveState();
        }
        
        render();
    });
}

// Firebase Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        const name = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
        authScreen.style.display = 'none';
        appContainer.style.display = 'flex';
        setupChatListener();
        setupStateListener(user.uid, name);
    } else {
        if (unsubscribeChat) {
            unsubscribeChat();
            unsubscribeChat = null;
        }
        if (unsubscribeState) {
            unsubscribeState();
            unsubscribeState = null;
        }
        state.currentUser = null;
        appContainer.style.display = 'none';
        authScreen.style.display = 'flex';
    }
});

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
            <div style="display:flex; gap:0.25rem;">
                <button onclick="editAgenda('${agenda.id}')" style="background:none;border:none;color:var(--primary);cursor:pointer;"><i data-lucide="edit-2" style="width:14px;height:14px;"></i></button>
                <button onclick="deleteAgenda('${agenda.id}')" style="background:none;border:none;color:var(--danger);cursor:pointer;"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
            </div>
        `;
        agendaListEl.appendChild(li);
    });
}

window.editAgenda = function(id) {
    const agenda = state.agendas.find(a => a.id === id);
    if (!agenda) return;
    const newText = prompt("Edit agenda item:", agenda.text);
    if (newText !== null && newText.trim() !== '') {
        agenda.text = newText.trim();
        saveState();
    }
};

window.deleteAgenda = function(id) {
    if (confirm("Are you sure you want to delete this agenda item?")) {
        state.agendas = state.agendas.filter(a => a.id !== id);
        saveState();
    }
};

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

window.showToast = function(title, message, onClick) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-icon">
            <i data-lucide="bell"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    if (onClick) {
        toast.addEventListener('click', () => {
            onClick();
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        if(toast.parentElement) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

function sendNotification(title, body, type = 'system') {
    if (window.showToast) {
        if (type === 'chat') {
            window.showToast(title, body, () => {
                const chatNav = document.querySelector('.nav-item[data-target="view-chat"]');
                if(chatNav) chatNav.click();
            });
        } else {
            window.showToast(title, body);
        }
    }

    if ("Notification" in window && Notification.permission === "granted") {
        if (navigator.serviceWorker) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, { body: body, icon: './icon.png' });
            }).catch(err => {
                new Notification(title, { body: body, icon: './icon.png' });
            });
        } else {
            new Notification(title, { body: body, icon: './icon.png' });
        }
    }
}

function checkReminders() {
    if (!state.currentUser) return; // don't notify if logged out
    
    const now = new Date();
    
    // Weekly Meeting Reminder Logic
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
    
    // Daily 10 PM Task Reminder Logic
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const todayStr = now.toDateString();
    
    if (!state.lastDailyNotified) state.lastDailyNotified = '';
    
    // Trigger at 10:00 PM (22:00)
    if (hours === 22 && minutes === 0 && state.lastDailyNotified !== todayStr) {
        sendNotification("Daily Tasks Update", "It's 10:00 PM! Don't forget to update your daily habits in Khata.");
        state.lastDailyNotified = todayStr;
        shouldSave = true;
    }
    
    if (shouldSave) saveState();
}

// Request permission
requestNotificationPermission();
// Check every minute
setInterval(checkReminders, 60000);
// Check immediately on load after splash screen
setTimeout(checkReminders, 2500);

// Initial Render
render();

// Splash Screen Logic
const splashScreen = document.getElementById('splash-screen');
setTimeout(() => {
    splashScreen.classList.add('fade-out');
    setTimeout(() => {
        splashScreen.style.display = 'none';
}, 500); // match transition duration
}, 2000); // show splash for 2 seconds

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
