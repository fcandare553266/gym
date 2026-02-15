// ===================================
// Authentication Check
// ===================================
(function checkAuth() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'login.html';
    }
})();

// ===================================
// Data Management with localStorage
// ===================================

class DataManager {
    constructor() {
        this.clients = this.loadData('clients') || [];
        this.sessions = this.loadData('sessions') || [];
        this.initializeSampleData();
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

    initializeSampleData() {
        if (this.clients.length === 0) {
            this.clients = [
                {
                    id: Date.now() + 1,
                    name: 'John Smith',
                    email: 'john.smith@email.com',
                    phone: '(555) 123-4567',
                    sessionsRemaining: 8,
                    status: 'Active'
                },
                {
                    id: Date.now() + 2,
                    name: 'Sarah Johnson',
                    email: 'sarah.j@email.com',
                    phone: '(555) 234-5678',
                    sessionsRemaining: 12,
                    status: 'Active'
                },
                {
                    id: Date.now() + 3,
                    name: 'Mike Williams',
                    email: 'mike.w@email.com',
                    phone: '(555) 345-6789',
                    sessionsRemaining: 5,
                    status: 'Active'
                }
            ];
            this.saveClients();
        }

        if (this.sessions.length === 0) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            this.sessions = [
                {
                    id: Date.now() + 1,
                    clientId: this.clients[0].id,
                    clientName: this.clients[0].name,
                    date: today.toISOString().split('T')[0],
                    time: '09:00',
                    duration: 60,
                    workoutType: 'Strength Training',
                    status: 'upcoming',
                    notes: ''
                },
                {
                    id: Date.now() + 2,
                    clientId: this.clients[1].id,
                    clientName: this.clients[1].name,
                    date: today.toISOString().split('T')[0],
                    time: '14:00',
                    duration: 60,
                    workoutType: 'HIIT',
                    status: 'upcoming',
                    notes: ''
                },
                {
                    id: Date.now() + 3,
                    clientId: this.clients[2].id,
                    clientName: this.clients[2].name,
                    date: tomorrow.toISOString().split('T')[0],
                    time: '10:00',
                    duration: 45,
                    workoutType: 'Cardio',
                    status: 'upcoming',
                    notes: ''
                }
            ];
            this.saveSessions();
        }
    }

    // Client Methods
    getClients() {
        return this.clients;
    }

    getClientById(id) {
        return this.clients.find(c => c.id === id);
    }

    addClient(client) {
        client.id = Date.now();
        this.clients.push(client);
        this.saveClients();
        return client;
    }

    updateClient(id, updatedClient) {
        const index = this.clients.findIndex(c => c.id === id);
        if (index !== -1) {
            this.clients[index] = { ...this.clients[index], ...updatedClient };
            this.saveClients();
            return this.clients[index];
        }
        return null;
    }

    deleteClient(id) {
        this.clients = this.clients.filter(c => c.id !== id);
        this.saveClients();
    }

    saveClients() {
        this.saveData('clients', this.clients);
    }

    // Session Methods
    getSessions() {
        return this.sessions;
    }

    getSessionById(id) {
        return this.sessions.find(s => s.id === id);
    }

    addSession(session) {
        session.id = Date.now();
        this.sessions.push(session);
        this.saveSessions();
        
        // Deduct session credit from client
        const client = this.getClientById(session.clientId);
        if (client && client.sessionsRemaining > 0) {
            client.sessionsRemaining--;
            this.saveClients();
        }
        
        return session;
    }

    updateSession(id, updatedSession) {
        const index = this.sessions.findIndex(s => s.id === id);
        if (index !== -1) {
            this.sessions[index] = { ...this.sessions[index], ...updatedSession };
            this.saveSessions();
            return this.sessions[index];
        }
        return null;
    }

    deleteSession(id) {
        const session = this.getSessionById(id);
        if (session && session.status === 'upcoming') {
            // Return session credit to client
            const client = this.getClientById(session.clientId);
            if (client) {
                client.sessionsRemaining++;
                this.saveClients();
            }
        }
        
        this.sessions = this.sessions.filter(s => s.id !== id);
        this.saveSessions();
    }

    saveSessions() {
        this.saveData('sessions', this.sessions);
    }

    getSessionsByDate(date) {
        return this.sessions.filter(s => s.date === date);
    }

    getTodaySessions() {
        const today = new Date().toISOString().split('T')[0];
        return this.getSessionsByDate(today).filter(s => s.status === 'upcoming');
    }

    getUpcomingSessions(limit = 5) {
        const today = new Date().toISOString().split('T')[0];
        return this.sessions
            .filter(s => s.date >= today && s.status === 'upcoming')
            .sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return a.time.localeCompare(b.time);
            })
            .slice(0, limit);
    }
}

// ===================================
// UI Controller
// ===================================

class UIController {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentMonth = new Date();
        this.selectedDate = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderDashboard();
        this.renderCalendar();
        this.populateClientSelects();
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPage(item.dataset.page);
            });
        });

        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });

        // Session Modal
        document.getElementById('addSessionBtn').addEventListener('click', () => this.openSessionModal());
        document.getElementById('addSessionBtnCalendar').addEventListener('click', () => this.openSessionModal());
        document.getElementById('closeSessionModal').addEventListener('click', () => this.closeSessionModal());
        document.getElementById('cancelSessionBtn').addEventListener('click', () => this.closeSessionModal());
        document.getElementById('sessionForm').addEventListener('submit', (e) => this.handleSessionSubmit(e));

        // Client Modal
        document.getElementById('addClientBtn').addEventListener('click', () => this.openClientModal());
        document.getElementById('closeClientModal').addEventListener('click', () => this.closeClientModal());
        document.getElementById('cancelClientBtn').addEventListener('click', () => this.closeClientModal());
        document.getElementById('clientForm').addEventListener('submit', (e) => this.handleClientSubmit(e));

        // Calendar Navigation
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));

        // Session Filter
        document.getElementById('sessionFilter').addEventListener('change', (e) => {
            this.renderSessionsTable(e.target.value);
        });

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeSessionModal();
                this.closeClientModal();
            }
        });
    }

    switchPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageName);
        });

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.toggle('active', page.id === pageName);
        });

        // Render content for the active page
        switch(pageName) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'calendar':
                this.renderCalendar();
                break;
            case 'clients':
                this.renderClientsTable();
                break;
            case 'sessions':
                this.renderSessionsTable();
                break;
        }
    }

    // ===================================
    // Dashboard
    // ===================================

    renderDashboard() {
        // Update stats
        document.getElementById('totalClients').textContent = this.dataManager.getClients().length;
        
        const todaySessions = this.dataManager.getTodaySessions();
        document.getElementById('sessionsToday').textContent = todaySessions.length;
        
        // Calculate pending payments (mock calculation)
        const pendingAmount = this.dataManager.getClients()
            .filter(c => c.status === 'Active' && c.sessionsRemaining === 0)
            .length * 50;
        document.getElementById('pendingPayments').textContent = `$${pendingAmount}`;

        // Render today's schedule
        this.renderTodaySchedule();
        
        // Render upcoming sessions
        this.renderUpcomingSessions();
    }

    renderTodaySchedule() {
        const container = document.getElementById('todaySchedule');
        const sessions = this.dataManager.getTodaySessions();

        if (sessions.length === 0) {
            container.innerHTML = '<div class="empty-state">No sessions scheduled for today</div>';
            return;
        }

        container.innerHTML = sessions.map(session => this.createScheduleItem(session)).join('');
    }

    renderUpcomingSessions() {
        const container = document.getElementById('upcomingSessions');
        const sessions = this.dataManager.getUpcomingSessions().filter(s => {
            return s.date !== new Date().toISOString().split('T')[0];
        });

        if (sessions.length === 0) {
            container.innerHTML = '<div class="empty-state">No upcoming sessions</div>';
            return;
        }

        container.innerHTML = sessions.map(session => this.createScheduleItem(session)).join('');
    }

    createScheduleItem(session) {
        return `
            <div class="schedule-item">
                <div class="schedule-info">
                    <div class="schedule-client">${session.clientName}</div>
                    <div class="schedule-details">
                        <span>📅 ${this.formatDate(session.date)}</span>
                        <span>🕐 ${session.time}</span>
                        <span>💪 ${session.workoutType}</span>
                        <span>⏱️ ${session.duration} min</span>
                    </div>
                </div>
                <div class="schedule-actions">
                    <button class="btn btn-small btn-secondary" onclick="ui.editSession(${session.id})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="ui.deleteSession(${session.id})">Cancel</button>
                </div>
            </div>
        `;
    }

    // ===================================
    // Calendar
    // ===================================

    renderCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // Update header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

        // Get calendar data
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const container = document.getElementById('calendarDays');
        container.innerHTML = '';

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            container.appendChild(this.createCalendarDay(daysInPrevMonth - i, month - 1, year, true));
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            container.appendChild(this.createCalendarDay(day, month, year, false));
        }

        // Next month days
        const totalCells = container.children.length;
        const remainingCells = 42 - totalCells; // 6 weeks * 7 days
        for (let day = 1; day <= remainingCells; day++) {
            container.appendChild(this.createCalendarDay(day, month + 1, year, true));
        }
    }

    createCalendarDay(day, month, year, otherMonth) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        
        if (otherMonth) {
            div.classList.add('other-month');
        }

        const date = new Date(year, month, day);
        const dateString = date.toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        
        if (dateString === today && !otherMonth) {
            div.classList.add('today');
        }

        if (this.selectedDate === dateString) {
            div.classList.add('selected');
        }

        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        div.appendChild(dayNumber);

        // Add session indicators
        if (!otherMonth) {
            const sessions = this.dataManager.getSessionsByDate(dateString);
            if (sessions.length > 0) {
                const sessionsContainer = document.createElement('div');
                sessionsContainer.className = 'calendar-sessions';
                for (let i = 0; i < Math.min(sessions.length, 5); i++) {
                    const dot = document.createElement('div');
                    dot.className = 'session-dot';
                    sessionsContainer.appendChild(dot);
                }
                div.appendChild(sessionsContainer);
            }
        }

        if (!otherMonth) {
            div.addEventListener('click', () => {
                this.selectDate(dateString);
            });
        }

        return div;
    }

    selectDate(dateString) {
        this.selectedDate = dateString;
        this.renderCalendar();
        
        const sessions = this.dataManager.getSessionsByDate(dateString);
        const card = document.getElementById('selectedDateCard');
        const container = document.getElementById('selectedDateSessions');
        const title = document.getElementById('selectedDateTitle');
        
        if (sessions.length > 0) {
            card.style.display = 'block';
            title.textContent = `Sessions for ${this.formatDate(dateString)}`;
            container.innerHTML = sessions.map(session => this.createScheduleItem(session)).join('');
        } else {
            card.style.display = 'block';
            title.textContent = `Sessions for ${this.formatDate(dateString)}`;
            container.innerHTML = '<div class="empty-state">No sessions scheduled for this date</div>';
        }
    }

    changeMonth(direction) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
        this.renderCalendar();
    }

    // ===================================
    // Clients
    // ===================================

    renderClientsTable() {
        const tbody = document.getElementById('clientsTableBody');
        const clients = this.dataManager.getClients();

        if (clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No clients found</td></tr>';
            return;
        }

        tbody.innerHTML = clients.map(client => `
            <tr>
                <td><strong>${client.name}</strong></td>
                <td>${client.email}</td>
                <td>${client.phone}</td>
                <td><strong>${client.sessionsRemaining}</strong></td>
                <td><span class="status-badge ${client.status.toLowerCase()}">${client.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-small btn-secondary" onclick="ui.editClient(${client.id})">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="ui.deleteClient(${client.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // ===================================
    // Sessions
    // ===================================

    renderSessionsTable(filter = 'all') {
        const tbody = document.getElementById('sessionsTableBody');
        let sessions = this.dataManager.getSessions();

        // Apply filter
        if (filter !== 'all') {
            sessions = sessions.filter(s => s.status === filter);
        }

        // Sort by date and time
        sessions.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.time.localeCompare(a.time);
        });

        if (sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No sessions found</td></tr>';
            return;
        }

        tbody.innerHTML = sessions.map(session => `
            <tr>
                <td>${this.formatDate(session.date)}</td>
                <td><strong>${session.time}</strong></td>
                <td>${session.clientName}</td>
                <td>${session.workoutType}</td>
                <td>${session.duration} min</td>
                <td><span class="status-badge ${session.status}">${session.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-small btn-secondary" onclick="ui.editSession(${session.id})">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="ui.deleteSession(${session.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // ===================================
    // Session Modal
    // ===================================

    openSessionModal(sessionId = null) {
        const modal = document.getElementById('sessionModal');
        const form = document.getElementById('sessionForm');
        const title = document.getElementById('sessionModalTitle');
        
        form.reset();
        
        if (sessionId) {
            const session = this.dataManager.getSessionById(sessionId);
            if (session) {
                title.textContent = 'Edit Session';
                document.getElementById('sessionId').value = session.id;
                document.getElementById('sessionClient').value = session.clientId;
                document.getElementById('sessionDate').value = session.date;
                document.getElementById('sessionTime').value = session.time;
                document.getElementById('sessionDuration').value = session.duration;
                document.getElementById('sessionWorkoutType').value = session.workoutType;
                document.getElementById('sessionNotes').value = session.notes || '';
            }
        } else {
            title.textContent = 'Add New Session';
            // Set default date to today
            document.getElementById('sessionDate').valueAsDate = new Date();
        }
        
        modal.classList.add('active');
    }

    closeSessionModal() {
        document.getElementById('sessionModal').classList.remove('active');
    }

    handleSessionSubmit(e) {
        e.preventDefault();
        
        const sessionId = document.getElementById('sessionId').value;
        const clientId = parseInt(document.getElementById('sessionClient').value);
        const client = this.dataManager.getClientById(clientId);
        
        const sessionData = {
            clientId: clientId,
            clientName: client.name,
            date: document.getElementById('sessionDate').value,
            time: document.getElementById('sessionTime').value,
            duration: parseInt(document.getElementById('sessionDuration').value),
            workoutType: document.getElementById('sessionWorkoutType').value,
            notes: document.getElementById('sessionNotes').value,
            status: 'upcoming'
        };

        if (sessionId) {
            this.dataManager.updateSession(parseInt(sessionId), sessionData);
            this.showToast('Session updated successfully!');
        } else {
            // Check if client has sessions remaining
            if (client.sessionsRemaining <= 0) {
                this.showToast('Client has no remaining sessions!');
                return;
            }
            this.dataManager.addSession(sessionData);
            this.showToast('Session added successfully!');
        }

        this.closeSessionModal();
        this.renderDashboard();
        this.renderCalendar();
        this.renderSessionsTable();
        this.renderClientsTable();
    }

    editSession(sessionId) {
        this.openSessionModal(sessionId);
    }

    deleteSession(sessionId) {
        if (confirm('Are you sure you want to cancel this session?')) {
            this.dataManager.deleteSession(sessionId);
            this.showToast('Session cancelled successfully!');
            this.renderDashboard();
            this.renderCalendar();
            this.renderSessionsTable();
            this.renderClientsTable();
        }
    }

    // ===================================
    // Client Modal
    // ===================================

    openClientModal(clientId = null) {
        const modal = document.getElementById('clientModal');
        const form = document.getElementById('clientForm');
        const title = document.getElementById('clientModalTitle');
        
        form.reset();
        
        if (clientId) {
            const client = this.dataManager.getClientById(clientId);
            if (client) {
                title.textContent = 'Edit Client';
                document.getElementById('clientId').value = client.id;
                document.getElementById('clientName').value = client.name;
                document.getElementById('clientEmail').value = client.email;
                document.getElementById('clientPhone').value = client.phone;
                document.getElementById('clientSessions').value = client.sessionsRemaining;
                document.getElementById('clientStatus').value = client.status;
            }
        } else {
            title.textContent = 'Add New Client';
        }
        
        modal.classList.add('active');
    }

    closeClientModal() {
        document.getElementById('clientModal').classList.remove('active');
    }

    handleClientSubmit(e) {
        e.preventDefault();
        
        const clientId = document.getElementById('clientId').value;
        const clientData = {
            name: document.getElementById('clientName').value,
            email: document.getElementById('clientEmail').value,
            phone: document.getElementById('clientPhone').value,
            sessionsRemaining: parseInt(document.getElementById('clientSessions').value),
            status: document.getElementById('clientStatus').value
        };

        if (clientId) {
            this.dataManager.updateClient(parseInt(clientId), clientData);
            this.showToast('Client updated successfully!');
        } else {
            this.dataManager.addClient(clientData);
            this.showToast('Client added successfully!');
        }

        this.closeClientModal();
        this.renderClientsTable();
        this.renderDashboard();
        this.populateClientSelects();
    }

    editClient(clientId) {
        this.openClientModal(clientId);
    }

    deleteClient(clientId) {
        if (confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            this.dataManager.deleteClient(clientId);
            this.showToast('Client deleted successfully!');
            this.renderClientsTable();
            this.renderDashboard();
            this.populateClientSelects();
        }
    }

    // ===================================
    // Utility Methods
    // ===================================

    populateClientSelects() {
        const select = document.getElementById('sessionClient');
        const clients = this.dataManager.getClients().filter(c => c.status === 'Active');
        
        select.innerHTML = '<option value="">Select a client</option>' +
            clients.map(client => 
                `<option value="${client.id}">${client.name} (${client.sessionsRemaining} sessions remaining)</option>`
            ).join('');
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
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
// Initialize Application
// ===================================

const dataManager = new DataManager();
const ui = new UIController(dataManager);

// Make ui globally accessible for inline event handlers
window.ui = ui;