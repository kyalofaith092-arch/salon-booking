// State Management
let currentUser = null;
let pageHistory = ['login-page'];
let pageHistoryIndex = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupEventListeners();
    setMinDate();
    updatePageNavigation();
});

// Setup Event Listeners
function setupEventListeners() {
    // Login Form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Register Link
    document.getElementById('register-link').addEventListener('click', handleRegister);

    document.getElementById('forgot-password-link').addEventListener('click', showPasswordReset);
    document.getElementById('back-to-login-link').addEventListener('click', showLoginForm);
    document.getElementById('reset-password-form').addEventListener('submit', handlePasswordReset);
    
    // Customer Request Form
    document.getElementById('request-form').addEventListener('submit', handleStyleRequest);
    
    // Salonist Post Style Form
    document.getElementById('post-style-form').addEventListener('submit', handlePostStyle);

    document.getElementById('previous-page').addEventListener('click', showPreviousPage);
    document.getElementById('next-page').addEventListener('click', showNextPage);
    document.getElementById('exit-site').addEventListener('click', exitSite);

    setupImagePreview('inspiration-image', 'inspiration-image-preview');
    setupImagePreview('posted-style-image', 'posted-style-image-preview');
}

function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) {
            preview.hidden = true;
            preview.removeAttribute('src');
            return;
        }

        if (!file.type.startsWith('image/') || file.size > 1024 * 1024) {
            alert('Choose an image smaller than 1 MB.');
            input.value = '';
            preview.hidden = true;
            preview.removeAttribute('src');
            return;
        }

        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
    });
}

function readImageFile(inputId) {
    const file = document.getElementById(inputId).files[0];
    if (!file) return Promise.resolve('');

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result));
        reader.addEventListener('error', () => reject(new Error('Could not read the selected image.')));
        reader.readAsDataURL(file);
    });
}

async function hashSecret(value) {
    const encodedValue = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', encodedValue);
    return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

function readUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

function normalizeUsername(username) {
    return username.trim().toLowerCase();
}

function normalizeRecoveryAnswer(answer) {
    return answer.trim().toLowerCase();
}

function setAuthMessage(elementId, message) {
    document.getElementById(elementId).textContent = message;
}

async function findValidAccount(username, password, role) {
    const users = readUsers();
    const user = users.find(account => normalizeUsername(account.username) === normalizeUsername(username));
    if (!user || user.role !== role) return null;

    const passwordMatches = user.passwordHash
        ? await hashSecret(password) === user.passwordHash
        : user.password === password;

    return passwordMatches ? { users, user } : null;
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    
    if (!username || !password || !role) return;

    setAuthMessage('login-message', '');
    try {
        const account = await findValidAccount(username, password, role);
        if (!account) {
            setAuthMessage('login-message', 'Invalid username or password.');
            return;
        }
        const { users, user } = account;

        if (!user.passwordHash) {
            user.passwordHash = await hashSecret(password);
            delete user.password;
        }

        if (!user.recoveryHash) {
            const recoveryAnswer = prompt('Set a recovery answer for future password resets. Choose something you will remember.');
            if (recoveryAnswer && recoveryAnswer.trim()) {
                user.recoveryHash = await hashSecret(normalizeRecoveryAnswer(recoveryAnswer));
            }
        }

        localStorage.setItem('users', JSON.stringify(users));
    } catch (error) {
        setAuthMessage('login-message', 'Unable to access saved accounts in this browser.');
        return;
    }
    
    startUserSession(username, role);
    document.getElementById('login-form').reset();
}

function startUserSession(username, role) {
    currentUser = { username, role };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    if (role === 'customer') {
        document.getElementById('customer-name').textContent = `Welcome, ${username}`;
        showPage('customer-dashboard');
        loadCustomerData();
    } else {
        document.getElementById('salonist-name').textContent = `Welcome, ${username}`;
        showPage('salonist-dashboard');
        loadSalonistData();
    }
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();
    const username = prompt('Enter username for registration:')?.trim();
    if (!username) return;
    
    const password = prompt('Enter password:');
    if (!password) return;

    const recoveryAnswer = prompt('Enter a private recovery answer. You will need it to reset your password:');
    if (!recoveryAnswer || !recoveryAnswer.trim()) {
        alert('A recovery answer is required to register.');
        return;
    }
    
    const role = prompt('Enter role (customer/salonist):');
    if (!role || (role !== 'customer' && role !== 'salonist')) {
        alert('Invalid role. Must be "customer" or "salonist"');
        return;
    }
    
    // Store in localStorage
    const users = readUsers();
    const existingUser = users.find(user => normalizeUsername(user.username) === normalizeUsername(username));
    
    if (existingUser) {
        alert('Username already exists!');
        return;
    }
    
    try {
        users.push({
            username,
            passwordHash: await hashSecret(password),
            recoveryHash: await hashSecret(normalizeRecoveryAnswer(recoveryAnswer)),
            role
        });
        localStorage.setItem('users', JSON.stringify(users));
        document.getElementById('login-form').reset();
        startUserSession(username, role);
        alert('Registration successful! You are now signed in.');
    } catch (error) {
        alert('Could not save this account in the browser.');
    }
}

function showPasswordReset(e) {
    e.preventDefault();
    document.getElementById('login-form').hidden = true;
    document.getElementById('reset-password-form').hidden = false;
    setAuthMessage('reset-message', '');
}

function showLoginForm(e) {
    if (e) e.preventDefault();
    document.getElementById('reset-password-form').reset();
    document.getElementById('reset-password-form').hidden = true;
    document.getElementById('login-form').hidden = false;
    setAuthMessage('reset-message', '');
}

async function handlePasswordReset(e) {
    e.preventDefault();
    setAuthMessage('reset-message', '');

    const username = document.getElementById('reset-username').value.trim();
    const recoveryAnswer = normalizeRecoveryAnswer(document.getElementById('recovery-answer').value);
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    if (newPassword !== confirmPassword) {
        setAuthMessage('reset-message', 'The new passwords do not match.');
        return;
    }

    try {
        const users = readUsers();
        const user = users.find(account => normalizeUsername(account.username) === normalizeUsername(username));
        if (!user || !user.recoveryHash || await hashSecret(recoveryAnswer) !== user.recoveryHash) {
            setAuthMessage('reset-message', 'Unable to verify those recovery details.');
            return;
        }

        user.passwordHash = await hashSecret(newPassword);
        delete user.password;
        localStorage.setItem('users', JSON.stringify(users));
        showLoginForm();
        setAuthMessage('login-message', 'Password reset. Sign in with your new password.');
    } catch (error) {
        setAuthMessage('reset-message', 'Unable to reset the password in this browser.');
    }
}

// Handle Style Request (Customer)
async function handleStyleRequest(e) {
    e.preventDefault();

    let image;
    try {
        image = await readImageFile('inspiration-image');
    } catch (error) {
        alert(error.message);
        return;
    }
    
    const request = {
        id: Date.now(),
        styleName: document.getElementById('style-name').value,
        description: document.getElementById('style-description').value,
        preferredDate: document.getElementById('preferred-date').value,
        notes: document.getElementById('customer-notes').value,
        inspirationImage: image,
        customer: currentUser.username,
        status: 'pending',
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    const requests = JSON.parse(localStorage.getItem('styleRequests') || '[]');
    requests.push(request);
    try {
        localStorage.setItem('styleRequests', JSON.stringify(requests));
    } catch (error) {
        alert('Could not save this request. The browser may be out of storage space.');
        return;
    }
    
    alert('Style request submitted successfully!');
    document.getElementById('request-form').reset();
    loadCustomerData();
}

// Handle Post Style (Salonist)
async function handlePostStyle(e) {
    e.preventDefault();

    let image;
    try {
        image = await readImageFile('posted-style-image');
    } catch (error) {
        alert(error.message);
        return;
    }
    
    const style = {
        id: Date.now(),
        name: document.getElementById('post-style-name').value,
        description: document.getElementById('post-style-description').value,
        price: document.getElementById('style-price').value,
        duration: document.getElementById('style-duration').value,
        image,
        salonist: currentUser.username,
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    const styles = JSON.parse(localStorage.getItem('postedStyles') || '[]');
    styles.push(style);
    try {
        localStorage.setItem('postedStyles', JSON.stringify(styles));
    } catch (error) {
        alert('Could not save this style. The browser may be out of storage space.');
        return;
    }
    
    alert('Hairstyle posted successfully!');
    document.getElementById('post-style-form').reset();
    loadSalonistData();
}

// Load Customer Data
function loadCustomerData() {
    loadAvailableStyles();
    loadMyRequests();
}

// Load Salonist Data
function loadSalonistData() {
    loadMyPostedStyles();
    loadCustomerRequests();
}

// Load Available Styles (from all salonists)
function loadAvailableStyles() {
    const styles = JSON.parse(localStorage.getItem('postedStyles') || '[]');
    const container = document.getElementById('available-styles');
    
    if (styles.length === 0) {
        container.innerHTML = '<div class="empty-state">No styles available yet. Salonists will post styles here.</div>';
        return;
    }
    
    container.innerHTML = styles.map(style => `
        <div class="style-card">
            ${style.image ? `<img class="post-image" src="${style.image}" alt="${style.name}">` : ''}
            <h4>${style.name}</h4>
            <p>${style.description}</p>
            <p class="price">KSh ${style.price}</p>
            <p><strong>Duration:</strong> ${style.duration}</p>
            <p><small>By ${style.salonist}</small></p>
        </div>
    `).join('');
}

// Load My Requests (Customer)
function loadMyRequests() {
    const requests = JSON.parse(localStorage.getItem('styleRequests') || '[]');
    const myRequests = requests.filter(r => r.customer === currentUser.username);
    const container = document.getElementById('my-requests');
    
    if (myRequests.length === 0) {
        container.innerHTML = '<div class="empty-state">You haven\'t made any requests yet.</div>';
        return;
    }
    
    container.innerHTML = myRequests.reverse().map(request => `
        <div class="request-card">
            <div class="request-info">
                <h4>${request.styleName}</h4>
                ${request.inspirationImage ? `<img class="post-image" src="${request.inspirationImage}" alt="Inspiration for ${request.styleName}">` : ''}
                <p>${request.description}</p>
                <p class="date">Preferred: ${request.preferredDate}</p>
                ${request.notes ? `<p><strong>Notes:</strong> ${request.notes}</p>` : ''}
            </div>
            <span class="status-badge status-${request.status}">${request.status}</span>
        </div>
    `).join('');
}

// Load My Posted Styles (Salonist)
function loadMyPostedStyles() {
    const styles = JSON.parse(localStorage.getItem('postedStyles') || '[]');
    const myStyles = styles.filter(s => s.salonist === currentUser.username);
    const container = document.getElementById('my-styles');
    
    if (myStyles.length === 0) {
        container.innerHTML = '<div class="empty-state">You haven\'t posted any styles yet.</div>';
        return;
    }
    
    container.innerHTML = myStyles.map(style => `
        <div class="style-card">
            ${style.image ? `<img class="post-image" src="${style.image}" alt="${style.name}">` : ''}
            <h4>${style.name}</h4>
            <p>${style.description}</p>
            <p class="price">KSh ${style.price}</p>
            <p><strong>Duration:</strong> ${style.duration}</p>
        </div>
    `).join('');
}

// Load Customer Requests (Salonist)
function loadCustomerRequests() {
    const requests = JSON.parse(localStorage.getItem('styleRequests') || '[]');
    const container = document.getElementById('customer-requests');
    
    if (requests.length === 0) {
        container.innerHTML = '<div class="empty-state">No customer requests yet.</div>';
        return;
    }
    
    container.innerHTML = requests.reverse().map(request => `
        <div class="request-card">
            <div class="request-info">
                <h4>${request.styleName}</h4>
                ${request.inspirationImage ? `<img class="post-image" src="${request.inspirationImage}" alt="Inspiration for ${request.styleName}">` : ''}
                <p>${request.description}</p>
                <p class="date">Preferred: ${request.preferredDate}</p>
                <p><small>By ${request.customer}</small></p>
            </div>
            <div>
                ${request.status === 'pending' ? `
                    <button class="btn-accept" onclick="updateRequestStatus(${request.id}, 'accepted')">Accept</button>
                    <button class="btn-reject" onclick="updateRequestStatus(${request.id}, 'rejected')">Reject</button>
                ` : ''}
                <span class="status-badge status-${request.status}">${request.status}</span>
            </div>
        </div>
    `).join('');
}

// Update Request Status
function updateRequestStatus(requestId, status) {
    const requests = JSON.parse(localStorage.getItem('styleRequests') || '[]');
    const request = requests.find(r => r.id === requestId);
    
    if (request) {
        request.status = status;
        localStorage.setItem('styleRequests', JSON.stringify(requests));
        loadCustomerRequests();
        alert(`Request ${status}!`);
    }
}

// Show Page
function showPage(pageId) {
    const currentPage = document.querySelector('.page.active');
    if (currentPage && currentPage.id !== pageId) {
        pageHistory = pageHistory.slice(0, pageHistoryIndex + 1);
        pageHistory.push(pageId);
        pageHistoryIndex = pageHistory.length - 1;
    }

    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    updatePageNavigation();
}

function showPreviousPage() {
    if (pageHistoryIndex === 0) return;
    pageHistoryIndex -= 1;
    showPageFromHistory();
}

async function showNextPage() {
    if (pageHistoryIndex >= pageHistory.length - 1) return;

    if (pageHistory[pageHistoryIndex] === 'login-page') {
        const form = document.getElementById('login-form');
        if (!form.reportValidity()) return;

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        try {
            const account = await findValidAccount(username, password, role);
            const sameUser = currentUser
                && normalizeUsername(currentUser.username) === normalizeUsername(username)
                && currentUser.role === role;
            if (!account || !sameUser) {
                setAuthMessage('login-message', 'Invalid username or password.');
                return;
            }
        } catch (error) {
            setAuthMessage('login-message', 'Unable to access saved accounts in this browser.');
            return;
        }
        setAuthMessage('login-message', '');
    }

    pageHistoryIndex += 1;
    showPageFromHistory();
}

function showPageFromHistory() {
    const pageId = pageHistory[pageHistoryIndex];
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.id === pageId);
    });
    updatePageNavigation();
}

function updatePageNavigation() {
    const activePage = document.querySelector('.page.active');
    const pageNames = {
        'login-page': 'Sign in',
        'customer-dashboard': 'Customer dashboard',
        'salonist-dashboard': 'Salonist dashboard'
    };

    document.getElementById('page-indicator').textContent = pageNames[activePage.id];
    document.getElementById('previous-page').disabled = pageHistoryIndex === 0;
    document.getElementById('next-page').disabled = pageHistoryIndex >= pageHistory.length - 1;
}

function exitSite() {
    window.close();
    if (!window.closed) {
        window.location.replace('about:blank');
    }
}

// Check Session
function checkSession() {
    currentUser = null;
    localStorage.removeItem('currentUser');
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    pageHistory = ['login-page'];
    pageHistoryIndex = 0;
    showPageFromHistory();
}

// Set minimum date for date picker
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.setAttribute('min', today);
    });
}
