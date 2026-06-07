// Supabase configuration
const SUPABASE_URL = 'https://zygoqqsgzhgpvlpttfbk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5b3FxcXNnemhncHZsdHB0ZmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MTYzMTAsImV4cCI6MjA2NTM5MjMxMH0.placeholder';

// Initialize Supabase client
let supabaseClient = null;

function initSupabase() {
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// Track shipment function - connects to Supabase backend
async function trackShipment(event) {
    event.preventDefault();

    const trackingNumber = document.getElementById('trackingNumber').value.trim();
    const loadingState = document.getElementById('loadingState');
    const trackingResult = document.getElementById('trackingResult');
    const errorState = document.getElementById('errorState');

    // Hide previous results
    trackingResult.classList.remove('active');
    errorState.style.display = 'none';
    loadingState.style.display = 'block';

    try {
        // Initialize Supabase
        const supabase = initSupabase();

        if (supabase) {
            // Try to fetch from Supabase
            const { data, error } = await supabase
                .from('shipments')
                .select('*')
                .eq('tracking_number', trackingNumber)
                .single();

            if (error) {
                throw error;
            }

            if (data) {
                displaySupabaseTrackingResult(data);
            } else {
                displayDemoTracking(trackingNumber);
            }
        } else {
            // Fallback to demo tracking if Supabase not loaded
            displayDemoTracking(trackingNumber);
        }
    } catch (error) {
        console.log('Supabase error, using demo tracking:', error);
        displayDemoTracking(trackingNumber);
    }

    loadingState.style.display = 'none';
}

function displaySupabaseTrackingResult(data) {
    const trackingResult = document.getElementById('trackingResult');
    const resultTrackingNumber = document.getElementById('resultTrackingNumber');
    const resultStatus = document.getElementById('resultStatus');
    const resultOrigin = document.getElementById('resultOrigin');
    const resultDestination = document.getElementById('resultDestination');
    const timeline = document.getElementById('timeline');

    resultTrackingNumber.textContent = data.tracking_number || data.trackingNumber || '-';
    resultStatus.textContent = data.status || 'In Transit';
    resultOrigin.textContent = data.origin || 'Singapore';
    resultDestination.textContent = data.destination || '-';

    // Status badge styling
    if (data.status === 'Delivered') {
        resultStatus.className = 'status-badge status-delivered';
    } else if (data.status === 'Pending') {
        resultStatus.className = 'status-badge status-pending';
    } else {
        resultStatus.className = 'status-badge status-transit';
    }

    // Generate timeline from events
    const events = data.events || generateDemoEvents();
    let timelineHTML = '';

    events.forEach((event, index) => {
        const isCompleted = index < events.length - 1;
        const isCurrent = index === events.length - 1;

        timelineHTML += `
            <div class="timeline-item ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}">
                <div class="timeline-date">${event.date} - ${event.time}</div>
                <div class="timeline-title">${event.title}</div>
                <div class="timeline-location">${event.location}</div>
            </div>
        `;
    });

    timeline.innerHTML = timelineHTML;
    trackingResult.classList.add('active');
}

function displayDemoTracking(trackingNumber) {
    const trackingResult = document.getElementById('trackingResult');
    const resultTrackingNumber = document.getElementById('resultTrackingNumber');
    const resultStatus = document.getElementById('resultStatus');
    const resultOrigin = document.getElementById('resultOrigin');
    const resultDestination = document.getElementById('resultDestination');
    const timeline = document.getElementById('timeline');

    resultTrackingNumber.textContent = trackingNumber;
    resultStatus.textContent = 'In Transit';
    resultStatus.className = 'status-badge status-transit';
    resultOrigin.textContent = 'Singapore';
    resultDestination.textContent = 'Kuala Lumpur';

    const events = generateDemoEvents();
    let timelineHTML = '';

    events.forEach((event, index) => {
        const isCompleted = index < events.length - 1;
        const isCurrent = index === events.length - 1;

        timelineHTML += `
            <div class="timeline-item ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}">
                <div class="timeline-date">${event.date} - ${event.time}</div>
                <div class="timeline-title">${event.title}</div>
                <div class="timeline-location">${event.location}</div>
            </div>
        `;
    });

    timeline.innerHTML = timelineHTML;
    trackingResult.classList.add('active');
}

function generateDemoEvents() {
    const now = new Date();
    const events = [];

    const pickupDate = new Date(now);
    pickupDate.setDate(pickupDate.getDate() - 3);
    events.push({
        date: pickupDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: '09:30 AM',
        title: 'Shipment Picked Up',
        location: 'Singapore Warehouse'
    });

    const transitDate = new Date(now);
    transitDate.setDate(transitDate.getDate() - 2);
    events.push({
        date: transitDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: '02:15 PM',
        title: 'In Transit to Destination',
        location: 'Singapore Sorting Center'
    });

    const customsDate = new Date(now);
    customsDate.setDate(customsDate.getDate() - 1);
    events.push({
        date: customsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: '11:00 AM',
        title: 'Customs Clearance',
        location: 'Border Crossing'
    });

    events.push({
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: '08:00 AM',
        title: 'Out for Delivery',
        location: 'Kuala Lumpur Distribution Center'
    });

    return events;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initSupabase);