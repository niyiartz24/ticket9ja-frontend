// Ticket9ja - Frontend JavaScript Application v2.0
const API_URL = 'https://ticket9ja-backend-1.onrender.com';
let token = localStorage.getItem('token');
let currentEvent = null;
let currentEventId = null;
let allEvents = [];

// ==================== UTILITY FUNCTIONS ====================

function showMessage(elementId, message, type = 'success') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `message ${type}`;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function showError(elementId, message) {
    showMessage(elementId, message, 'error');
}

async function apiRequest(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (token && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        console.log(`Making request to: ${API_URL}${endpoint}`);
        const response = await fetch(`${API_URL}${endpoint}`, config);
        console.log(`Response status: ${response.status}`);
        
        if (response.status === 401) {
            console.error('Unauthorized - logging out');
            logout();
            return null;
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || `Request failed with status ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function navigateTo(pageId) {
    console.log('Navigating to:', pageId);
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        
        if (pageId === 'dashboard-page') {
            loadDashboardStats();
            displayEventsOnDashboard();
        } else if (pageId === 'event-page') {
            // Will be handled by createNewEvent() or viewEvent()
        } else if (pageId === 'tickets-page') {
            loadEventSelector();
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    navigateTo('login-page');
}

// ==================== AUTH ====================

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    const loginBtn = e.target.querySelector('button[type="submit"]');
    
    // Clear previous errors
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    
    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    
    try {
        console.log('Attempting login...');
        
        const data = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (data) {
            console.log('Login successful');
            token = data.access_token;
            localStorage.setItem('token', token);
            navigateTo('dashboard-page');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorEl.textContent = error.message || 'Login failed. Please try again.';
        errorEl.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
});

document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', logout);
});

// ==================== DASHBOARD ====================

async function loadDashboardStats() {
    try {
        console.log('Loading dashboard stats...');
        const stats = await apiRequest('/api/dashboard/stats');
        
        if (stats) {
            console.log('Stats loaded:', stats);
            document.getElementById('total-tickets').textContent = stats.total_tickets;
            document.getElementById('used-tickets').textContent = stats.used_tickets;
            document.getElementById('total-events').textContent = stats.total_events;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadAllEvents() {
    try {
        console.log('Loading all events...');
        const events = await apiRequest('/api/events');
        allEvents = events || [];
        console.log('Events loaded:', allEvents.length);
        return allEvents;
    } catch (error) {
        console.error('Error loading events:', error);
        return [];
    }
}

async function displayEventsOnDashboard() {
    const events = await loadAllEvents();
    const listEl = document.getElementById('events-list');
    
    if (!events || events.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:#666;">No events created yet. Click "Create New Event" to get started!</p>';
        return;
    }
    
    listEl.innerHTML = events.map(event => `
        <div class="event-item">
            <div class="event-info">
                <h4>${event.name} 
                    <span class="badge ${event.is_active ? 'active' : 'inactive'}">
                        ${event.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    ${event.is_locked ? '<span class="badge" style="background:#ffc107;color:#000;">LOCKED</span>' : ''}
                </h4>
                <p>📅 ${event.event_date} | ⏰ ${event.event_time}</p>
                <p>📍 ${event.venue}, ${event.city}</p>
            </div>
            <div class="event-actions">
                <button class="btn btn-primary" onclick="viewEvent(${event.id})">View</button>
                <button class="btn btn-secondary" onclick="toggleEventActive(${event.id})">
                    ${event.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button class="btn btn-danger" onclick="deleteEvent(${event.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// ==================== EVENT MANAGEMENT ====================

function createNewEvent() {
    console.log('Creating new event...');
    currentEvent = null;
    currentEventId = null;
    
    document.getElementById('event-form').reset();
    document.getElementById('event-id').value = '';
    document.getElementById('event-form-title').textContent = 'Create New Event';
    document.getElementById('event-page-title').textContent = 'Create Event';
    
    document.querySelectorAll('#event-form input, #event-form textarea').forEach(el => {
        el.disabled = false;
    });
    
    navigateTo('event-page');
}

async function viewEvent(eventId) {
    console.log('Viewing event:', eventId);
    currentEventId = eventId;
    
    try {
        const event = await apiRequest(`/api/events/${eventId}`);
        if (event) {
            currentEvent = event;
            
            document.getElementById('event-id').value = event.id;
            document.getElementById('event-name').value = event.name;
            document.getElementById('event-date').value = event.event_date;
            document.getElementById('event-time').value = event.event_time;
            document.getElementById('venue').value = event.venue;
            document.getElementById('city').value = event.city;
            document.getElementById('description').value = event.description || '';
            
            document.getElementById('event-form-title').textContent = 'Edit Event: ' + event.name;
            document.getElementById('event-page-title').textContent = 'Edit Event';
            
            if (event.is_locked) {
                document.querySelectorAll('#event-form input, #event-form textarea').forEach(el => {
                    el.disabled = true;
                });
                showMessage('event-message', 'Event is locked after ticket generation', 'error');
            } else {
                document.querySelectorAll('#event-form input, #event-form textarea').forEach(el => {
                    el.disabled = false;
                });
            }
            
            navigateTo('event-page');
        }
    } catch (error) {
        console.error('Error loading event:', error);
        alert('Error loading event: ' + error.message);
    }
}

async function toggleEventActive(eventId) {
    if (!confirm('Toggle event active status?')) return;
    
    try {
        const result = await apiRequest(`/api/events/${eventId}/toggle-active`, { method: 'POST' });
        console.log('Event toggled:', result);
        await displayEventsOnDashboard();
        await loadDashboardStats();
    } catch (error) {
        alert('Error toggling event status: ' + error.message);
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure? This will delete the event and ALL associated tickets!')) return;
    
    try {
        const result = await apiRequest(`/api/events/${eventId}`, { method: 'DELETE' });
        alert(result.message);
        await displayEventsOnDashboard();
        await loadDashboardStats();
    } catch (error) {
        alert('Error deleting event: ' + error.message);
    }
}

document.getElementById('event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const eventId = document.getElementById('event-id').value;
    
    const eventData = {
        name: document.getElementById('event-name').value,
        event_date: document.getElementById('event-date').value,
        event_time: document.getElementById('event-time').value,
        venue: document.getElementById('venue').value,
        city: document.getElementById('city').value,
        description: document.getElementById('description').value
    };
    
    try {
        console.log('Saving event...', eventData);
        
        let event;
        if (eventId) {
            event = await apiRequest(`/api/events/${eventId}`, {
                method: 'PUT',
                body: JSON.stringify(eventData)
            });
        } else {
            event = await apiRequest('/api/events', {
                method: 'POST',
                body: JSON.stringify(eventData)
            });
        }
        
        if (event) {
            console.log('Event saved:', event);
            currentEvent = event;
            currentEventId = event.id;
            
            showMessage('event-message', eventId ? 'Event updated successfully!' : 'Event created successfully!');
            
            const fileInput = document.getElementById('ticket-design');
            if (fileInput.files.length > 0) {
                await uploadTicketDesign(event.id, fileInput.files[0]);
            }
            
            setTimeout(() => {
                navigateTo('dashboard-page');
            }, 2000);
        }
    } catch (error) {
        console.error('Error saving event:', error);
        showError('event-message', error.message);
    }
});

async function uploadTicketDesign(eventId, file) {
    try {
        console.log('Uploading ticket design...');
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_URL}/api/events/${eventId}/upload-design`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (response.ok) {
            console.log('Design uploaded successfully');
            showMessage('event-message', 'Ticket design uploaded successfully!');
        } else {
            throw new Error('Failed to upload design');
        }
    } catch (error) {
        console.error('Error uploading design:', error);
        showError('event-message', 'Failed to upload ticket design');
    }
}

// ==================== TICKET MANAGEMENT ====================

async function loadEventSelector() {
    const events = await loadAllEvents();
    const selector = document.getElementById('event-selector');
    
    if (!events || events.length === 0) {
        selector.innerHTML = '<option value="">No events available - Create an event first</option>';
        return;
    }
    
    selector.innerHTML = '<option value="">-- Select an event --</option>' +
        events.map(event => 
            `<option value="${event.id}">${event.name} - ${event.event_date} (${event.is_active ? 'Active' : 'Inactive'})</option>`
        ).join('');
    
    if (events.length === 1) {
        currentEventId = events[0].id;
        selector.value = currentEventId;
        await loadTickets(currentEventId);
    }
}

document.getElementById('event-selector')?.addEventListener('change', async (e) => {
    currentEventId = e.target.value;
    if (currentEventId) {
        await loadTickets(currentEventId);
    } else {
        document.getElementById('tickets-list').innerHTML = '<p style="text-align:center; color:#666;">Please select an event</p>';
    }
});

async function loadTickets(eventId) {
    if (!eventId) {
        eventId = currentEventId;
    }
    
    if (!eventId) {
        document.getElementById('tickets-list').innerHTML = '<p style="text-align:center; color:#666;">Please select an event</p>';
        return;
    }
    
    try {
        console.log('Loading tickets for event:', eventId);
        const tickets = await apiRequest(`/api/events/${eventId}/tickets`);
        const listEl = document.getElementById('tickets-list');
        
        if (!tickets || tickets.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color:#666;">No tickets for this event</p>';
            return;
        }
        
        console.log(`Loaded ${tickets.length} tickets`);
        
        listEl.innerHTML = tickets.map(ticket => `
            <div class="ticket-item">
                <div class="ticket-info">
                    <h4>${ticket.attendee_name} 
                        <span class="ticket-badge ${ticket.is_used ? 'used' : 'unused'}">
                            ${ticket.is_used ? 'USED' : 'ACTIVE'}
                        </span>
                    </h4>
                    <p>📧 ${ticket.attendee_email}</p>
                    <p>🎫 ${ticket.ticket_type} | ID: ${ticket.ticket_id}</p>
                    ${ticket.is_used ? `<p>✅ Used: ${new Date(ticket.used_at).toLocaleString()}</p>` : ''}
                </div>
                <div class="ticket-actions">
                    <button class="btn btn-primary" onclick="editTicket(${ticket.id})">Edit</button>
                    <button class="btn btn-success" onclick="resendTicket(${ticket.id})">Resend</button>
                    <button class="btn btn-danger" onclick="deleteTicket(${ticket.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading tickets:', error);
        document.getElementById('tickets-list').innerHTML = 
            `<p style="text-align:center; color:#dc3545;">Error loading tickets: ${error.message}</p>`;
    }
}

document.getElementById('ticket-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const selectedEventId = document.getElementById('event-selector').value;
    if (!selectedEventId) {
        showError('ticket-message', 'Please select an event first');
        return;
    }
    
    const ticketData = {
        attendee_name: document.getElementById('attendee-name').value,
        attendee_email: document.getElementById('attendee-email').value,
        ticket_type: document.getElementById('ticket-type').value,
        quantity: parseInt(document.getElementById('quantity').value)
    };
    
    try {
        console.log('Creating tickets...', ticketData);
        
        const tickets = await apiRequest(`/api/events/${selectedEventId}/tickets`, {
            method: 'POST',
            body: JSON.stringify(ticketData)
        });
        
        if (tickets) {
            console.log(`Created ${tickets.length} tickets`);
            showMessage('ticket-message', `${tickets.length} ticket(s) created and emailed successfully!`);
            document.getElementById('ticket-form').reset();
            await loadTickets(selectedEventId);
            await loadDashboardStats();
        }
    } catch (error) {
        console.error('Error creating tickets:', error);
        showError('ticket-message', error.message);
    }
});

function editTicket(ticketId) {
    console.log('Editing ticket:', ticketId);
    
    fetch(`${API_URL}/api/tickets/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to load ticket');
        return res.json();
    })
    .then(ticket => {
        console.log('Ticket loaded for editing:', ticket);
        document.getElementById('edit-ticket-id').value = ticket.id;
        document.getElementById('edit-attendee-name').value = ticket.attendee_name;
        document.getElementById('edit-attendee-email').value = ticket.attendee_email;
        document.getElementById('edit-ticket-type').value = ticket.ticket_type;
        
        document.getElementById('edit-modal').classList.add('active');
    })
    .catch(error => {
        console.error('Error loading ticket:', error);
        alert('Failed to load ticket: ' + error.message);
    });
}

document.getElementById('edit-ticket-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const ticketId = document.getElementById('edit-ticket-id').value;
    const updateData = {
        attendee_name: document.getElementById('edit-attendee-name').value,
        attendee_email: document.getElementById('edit-attendee-email').value,
        ticket_type: document.getElementById('edit-ticket-type').value
    };
    
    try {
        console.log('Updating ticket:', ticketId, updateData);
        
        const ticket = await apiRequest(`/api/tickets/${ticketId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        if (ticket) {
            console.log('Ticket updated successfully');
            alert('Ticket updated successfully!');
            document.getElementById('edit-modal').classList.remove('active');
            const eventId = document.getElementById('event-selector').value;
            await loadTickets(eventId);
        }
    } catch (error) {
        console.error('Error updating ticket:', error);
        alert('Error updating ticket: ' + error.message);
    }
});

async function resendTicket(ticketId) {
    try {
        console.log('Resending ticket:', ticketId);
        
        await apiRequest(`/api/tickets/${ticketId}/resend`, {
            method: 'POST'
        });
        
        console.log('Ticket resent successfully');
        alert('Ticket email resent successfully!');
    } catch (error) {
        console.error('Error resending ticket:', error);
        alert('Error resending ticket: ' + error.message);
    }
}

async function deleteTicket(ticketId) {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    
    try {
        console.log('Deleting ticket:', ticketId);
        const result = await apiRequest(`/api/tickets/${ticketId}`, { method: 'DELETE' });
        alert(result.message);
        const eventId = document.getElementById('event-selector').value;
        await loadTickets(eventId);
        await loadDashboardStats();
    } catch (error) {
        alert('Error deleting ticket: ' + error.message);
    }
}

document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('edit-modal').classList.remove('active');
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('edit-modal');
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

// ==================== QR CODE SCANNER ====================

let videoStream = null;
let scanningActive = false;

document.getElementById('start-scan-btn').addEventListener('click', startScanner);
document.getElementById('stop-scan-btn').addEventListener('click', stopScanner);

async function startScanner() {
    const video = document.getElementById('scanner-video');
    const resultEl = document.getElementById('scan-result');
    
    try {
        console.log('Starting scanner...');
        
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        
        video.srcObject = videoStream;
        video.setAttribute('playsinline', true);
        video.play();
        
        scanningActive = true;
        document.getElementById('start-scan-btn').style.display = 'none';
        document.getElementById('stop-scan-btn').style.display = 'inline-block';
        
        console.log('Scanner started');
        requestAnimationFrame(tick);
        
    } catch (error) {
        console.error('Camera error:', error);
        resultEl.innerHTML = '<div class="scan-result invalid">Camera access denied or not available</div>';
    }
}

function stopScanner() {
    console.log('Stopping scanner...');
    scanningActive = false;
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    const video = document.getElementById('scanner-video');
    video.srcObject = null;
    
    document.getElementById('start-scan-btn').style.display = 'inline-block';
    document.getElementById('stop-scan-btn').style.display = 'none';
    document.getElementById('scan-result').innerHTML = '';
}

function tick() {
    const video = document.getElementById('scanner-video');
    const canvas = document.getElementById('scanner-canvas');
    
    if (!scanningActive || video.readyState !== video.HAVE_ENOUGH_DATA) {
        if (scanningActive) {
            requestAnimationFrame(tick);
        }
        return;
    }
    
    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
    });
    
    if (code) {
        console.log('QR code detected:', code.data);
        validateScannedTicket(code.data);
        stopScanner();
    } else {
        requestAnimationFrame(tick);
    }
}

async function validateScannedTicket(ticketId) {
    const resultEl = document.getElementById('scan-result');
    
    try {
        console.log('Validating ticket:', ticketId);
        
        const result = await apiRequest('/api/scan/validate', {
            method: 'POST',
            body: JSON.stringify({ ticket_id: ticketId })
        });
        
        console.log('Validation result:', result);
        
        if (result.valid) {
            resultEl.innerHTML = `
                <div class="scan-result valid">
                    <h3>✅ ENTRY GRANTED</h3>
                    <p><strong>${result.ticket.attendee_name}</strong></p>
                    <p>${result.ticket.ticket_type} | ${result.ticket.event_name}</p>
                    <p>Ticket ID: ${result.ticket.ticket_id}</p>
                </div>
            `;
            
            if (window.AudioContext) {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
                oscillator.connect(audioCtx.destination);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.2);
            }
        } else {
            resultEl.innerHTML = `
                <div class="scan-result invalid">
                    <h3>❌ ENTRY DENIED</h3>
                    <p>${result.message}</p>
                    ${result.ticket ? `
                        <p><strong>${result.ticket.attendee_name}</strong></p>
                        <p>${result.ticket.ticket_type}</p>
                    ` : ''}
                </div>
            `;
        }
        
        await loadDashboardStats();
        
    } catch (error) {
        console.error('Validation error:', error);
        resultEl.innerHTML = `
            <div class="scan-result invalid">
                <h3>❌ ERROR</h3>
                <p>Failed to validate ticket: ${error.message}</p>
            </div>
        `;
    }
}

document.getElementById('manual-scan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const ticketId = document.getElementById('manual-ticket-id').value.trim();
    if (ticketId) {
        console.log('Manual validation for:', ticketId);
        await validateScannedTicket(ticketId);
        document.getElementById('manual-ticket-id').value = '';
    }
});

// ==================== INITIALIZATION ====================

console.log('Ticket9ja Frontend v2.0 Initialized');
console.log('API URL:', API_URL);
console.log('Token exists:', !!token);

// Test backend connection
(async function testBackend() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        console.log('✅ Backend connected:', data);
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        console.error('Make sure backend is running at:', API_URL);
    }
})();

if (token) {
    console.log('User already logged in, navigating to dashboard');
    navigateTo('dashboard-page');
} else {
    console.log('No token found, showing login page');
    navigateTo('login-page');
}