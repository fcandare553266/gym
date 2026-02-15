// ===================================
// Client Portal JavaScript
// ===================================

class ClientPortalManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this.dataManager = new DataManager();
        
        // Redirect if not logged in or not a client
        if (!this.currentUser || this.currentUser.role !== 'client') {
            window.location.href = 'login.html';
            return;
        }
        
        this.init();
    }

    getCurrentUser() {
        try {
            const user = localStorage.getItem('currentUser');
            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    }

    init() {
        this.setupEventListeners();
        this.renderDashboard();
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Book session
        document.getElementById('bookSessionBtn').addEventListener('click', () => this.openBookingModal());
        document.getElementById('closeBookModal').addEventListener('click', () => this.closeBookingModal());
        document.getElementById('cancelBookBtn').addEventListener('click', () => this.closeBookingModal());
        document.getElementById('bookSessionForm').addEventListener('submit', (e) => this.handleBooking(e));

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeBookingModal();
            }
        });

        // History filter
        document.getElementById('historyFilter').addEventListener('change', (e) => {
            this.renderSessionHistory(e.target.value);
        });
    }

    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }

    renderDashboard() {
        // Display client name
        const firstName = this.currentUser.name.split(' ')[0];
        document.getElementById('clientName').textContent = firstName;
        document.getElementById('clientNameDisplay').textContent = this.currentUser.name;

        // Get client data from the main system
        const client = this.getClientData();
        
        if (client) {
            // Update stats
            document.getElementById('sessionsRemaining').textContent = client.sessionsRemaining;
            
            const upcomingSessions = this.getUpcomingSessions();
            document.getElementById('upcomingCount').textContent = upcomingSessions.length;
            
            const completedSessions = this.getCompletedSessions();
            document.getElementById('completedCount').textContent = completedSessions.length;

            // Render sessions
            this.renderUpcomingSessions();
            this.renderSessionHistory();
        }
    }

    getClientData() {
        const clients = this.dataManager.getClients();
        return clients.find(c => c.email === this.currentUser.email);
    }

    getUpcomingSessions() {
        const today = new Date().toISOString().split('T')[0];
        return this.dataManager.getSessions()
            .filter(s => s.clientId === this.getClientData()?.id && 
                        s.date >= today && 
                        (s.status === 'upcoming' || s.status === 'pending'));
    }

    getCompletedSessions() {
        return this.dataManager.getSessions()
            .filter(s => s.clientId === this.getClientData()?.id && s.status === 'completed');
    }

    renderUpcomingSessions() {
        const container = document.getElementById('upcomingSessionsList');
        const sessions = this.getUpcomingSessions()
            .sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return a.time.localeCompare(b.time);
            });

        if (sessions.length === 0) {
            container.innerHTML = '<div class="empty-state">No upcoming sessions scheduled</div>';
            return;
        }

        container.innerHTML = sessions.map(session => this.createSessionCard(session)).join('');
    }

    renderSessionHistory(filter = 'all') {
        const container = document.getElementById('sessionHistory');
        let sessions = this.dataManager.getSessions()
            .filter(s => s.clientId === this.getClientData()?.id);

        // Apply date filter
        const now = new Date();
        if (filter === 'thisMonth') {
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();
            sessions = sessions.filter(s => {
                const sessionDate = new Date(s.date);
                return sessionDate.getMonth() === thisMonth && sessionDate.getFullYear() === thisYear;
            });
        } else if (filter === 'lastMonth') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            sessions = sessions.filter(s => {
                const sessionDate = new Date(s.date);
                return sessionDate >= lastMonth && sessionDate <= lastMonthEnd;
            });
        }

        // Sort by date (most recent first)
        sessions.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.time.localeCompare(a.time);
        });

        if (sessions.length === 0) {
            container.innerHTML = '<div class="empty-state">No session history</div>';
            return;
        }

        container.innerHTML = sessions.map(session => this.createSessionCard(session)).join('');
    }

    createSessionCard(session) {
        const statusClass = session.status || 'upcoming';
        const canCancel = session.status === 'upcoming' || session.status === 'pending';
        
        return `
            <div class="session-item">
                <div class="session-header">
                    <div class="session-title">${session.workoutType}</div>
                    <span class="session-status ${statusClass}">${statusClass.toUpperCase()}</span>
                </div>
                <div class="session-details">
                    <div class="session-detail">📅 ${this.formatDate(session.date)}</div>
                    <div class="session-detail">🕐 ${session.time}</div>
                    <div class="session-detail">⏱️ ${session.duration} minutes</div>
                </div>
                ${session.notes ? `<div class="session-detail" style="grid-column: 1/-1; margin-top: 10px;">📝 ${session.notes}</div>` : ''}
                ${canCancel ? `
                    <div class="session-actions">
                        <button class="btn btn-small btn-danger" onclick="clientPortal.cancelSession(${session.id})">
                            Cancel Session
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    openBookingModal() {
        const client = this.getClientData();
        
        if (!client || client.sessionsRemaining <= 0) {
            this.showToast('You have no remaining sessions. Please contact your trainer to purchase more.');
            return;
        }

        const modal = document.getElementById('bookSessionModal');
        const form = document.getElementById('bookSessionForm');
        form.reset();
        
        // Set minimum date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('sessionDate').min = tomorrow.toISOString().split('T')[0];
        
        modal.classList.add('active');
    }

    closeBookingModal() {
        document.getElementById('bookSessionModal').classList.remove('active');
    }

    handleBooking(e) {
        e.preventDefault();

        const client = this.getClientData();
        if (!client) {
            this.showToast('Error: Client data not found');
            return;
        }

        const sessionData = {
            clientId: client.id,
            clientName: client.name,
            date: document.getElementById('sessionDate').value,
            time: document.getElementById('sessionTime').value,
            duration: parseInt(document.getElementById('sessionDuration').value),
            workoutType: document.getElementById('sessionWorkoutType').value,
            notes: document.getElementById('sessionNotes').value,
            status: 'pending' // Client bookings start as pending
        };

        this.dataManager.addSession(sessionData);
        this.showToast('Session request submitted! Your trainer will confirm shortly.');
        
        this.closeBookingModal();
        this.renderDashboard();
    }

    cancelSession(sessionId) {
        if (confirm('Are you sure you want to cancel this session?')) {
            this.dataManager.deleteSession(sessionId);
            this.showToast('Session cancelled successfully');
            this.renderDashboard();
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
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

// ===================================
// Shared Data Manager (same as admin)
// ===================================

class DataManager {
    constructor() {
        this.clients = this.loadData('clients') || [];
        this.sessions = this.loadData('sessions') || [];
    }

    loadData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading data:', e);
            return null;
        }
    }

    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }

    getClients() {
        return this.clients;
    }

    getSessions() {
        return this.sessions;
    }

    addSession(session) {
        session.id = Date.now();
        this.sessions.push(session);
        this.saveData('sessions', this.sessions);
        
        // Deduct session credit from client (only if approved, not pending)
        if (session.status === 'upcoming') {
            const client = this.clients.find(c => c.id === session.clientId);
            if (client && client.sessionsRemaining > 0) {
                client.sessionsRemaining--;
                this.saveData('clients', this.clients);
            }
        }
        
        return session;
    }

    deleteSession(id) {
        const session = this.sessions.find(s => s.id === id);
        if (session && (session.status === 'upcoming' || session.status === 'pending')) {
            // Return session credit to client
            const client = this.clients.find(c => c.id === session.clientId);
            if (client) {
                client.sessionsRemaining++;
                this.saveData('clients', this.clients);
            }
        }
        
        this.sessions = this.sessions.filter(s => s.id !== id);
        this.saveData('sessions', this.sessions);
    }
}

// Initialize client portal
const clientPortal = new ClientPortalManager();
window.clientPortal = clientPortal;