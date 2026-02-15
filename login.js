// ===================================
// Login Authentication System
// ===================================

class AuthManager {
    constructor() {
        this.users = this.loadUsers();
        this.initializeDefaultUsers();
    }

    loadUsers() {
        try {
            const users = localStorage.getItem('users');
            return users ? JSON.parse(users) : null;
        } catch (e) {
            console.error('Error loading users:', e);
            return null;
        }
    }

    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    initializeDefaultUsers() {
        if (!this.users) {
            this.users = {
                admin: {
                    email: 'admin@fittrack.com',
                    password: 'admin123',
                    role: 'admin',
                    name: 'Admin User'
                },
                clients: [
                    {
                        id: Date.now() + 1,
                        email: 'john.smith@email.com',
                        password: 'client123',
                        role: 'client',
                        name: 'John Smith'
                    },
                    {
                        id: Date.now() + 2,
                        email: 'sarah.j@email.com',
                        password: 'client123',
                        role: 'client',
                        name: 'Sarah Johnson'
                    },
                    {
                        id: Date.now() + 3,
                        email: 'mike.w@email.com',
                        password: 'client123',
                        role: 'client',
                        name: 'Mike Williams'
                    }
                ]
            };
            this.saveUsers();
        }
    }

    validateAdmin(email, password) {
        if (this.users.admin.email === email && this.users.admin.password === password) {
            return {
                success: true,
                user: {
                    email: this.users.admin.email,
                    name: this.users.admin.name,
                    role: 'admin'
                }
            };
        }
        return { success: false, message: 'Invalid admin credentials' };
    }

    validateClient(email, password) {
        const client = this.users.clients.find(c => c.email === email && c.password === password);
        if (client) {
            return {
                success: true,
                user: {
                    id: client.id,
                    email: client.email,
                    name: client.name,
                    role: 'client'
                }
            };
        }
        return { success: false, message: 'Invalid client credentials' };
    }

    login(email, password, role) {
        if (role === 'admin') {
            return this.validateAdmin(email, password);
        } else {
            return this.validateClient(email, password);
        }
    }

    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    getCurrentUser() {
        try {
            const user = localStorage.getItem('currentUser');
            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    }

    logout() {
        localStorage.removeItem('currentUser');
    }
}

// ===================================
// UI Controller for Login Page
// ===================================

class LoginUI {
    constructor() {
        this.authManager = new AuthManager();
        this.currentTab = 'admin';
        this.init();
    }

    init() {
        // Check if already logged in
        const currentUser = this.authManager.getCurrentUser();
        if (currentUser) {
            this.redirectToDashboard(currentUser.role);
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Admin login
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });

        // Client login
        document.getElementById('clientLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleClientLogin();
        });
    }

    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update forms
        document.querySelectorAll('.login-form').forEach(form => {
            form.classList.remove('active');
        });

        if (tab === 'admin') {
            document.getElementById('adminLoginForm').classList.add('active');
        } else {
            document.getElementById('clientLoginForm').classList.add('active');
        }
    }

    handleAdminLogin() {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;

        const result = this.authManager.login(email, password, 'admin');

        if (result.success) {
            this.authManager.setCurrentUser(result.user);
            this.showToast('Welcome back, Admin!');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            this.showToast('Invalid admin credentials. Please try again.');
        }
    }

    handleClientLogin() {
        const email = document.getElementById('clientEmail').value;
        const password = document.getElementById('clientPassword').value;

        const result = this.authManager.login(email, password, 'client');

        if (result.success) {
            this.authManager.setCurrentUser(result.user);
            this.showToast(`Welcome back, ${result.user.name}!`);
            setTimeout(() => {
                window.location.href = 'client-portal.html';
            }, 1000);
        } else {
            this.showToast('Invalid client credentials. Please try again.');
        }
    }

    redirectToDashboard(role) {
        if (role === 'admin') {
            window.location.href = 'index.html';
        } else {
            window.location.href = 'client-portal.html';
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the login UI
const loginUI = new LoginUI();