/*************************************************************
 * QUALTRICS SURVEY BASE LINK (Anonymous Link)
 * We will append session_id, user_id, experiment_run_id to this.
 *************************************************************/
const QUALTRICS_BASE_URL = "https://berkeley.qualtrics.com/jfe/form/SV_easc1pXOgVywSzA";

/*************************************************************
 * TRACKING SERVER URL
 *************************************************************/
const TRACKING_SERVER_URL = "https://tracking-server-qi6e.onrender.com/track";

/*************************************************************
 * Determine survey group based on participant behavior
 * A = clicked Allow on the permission dialog
 * B = clicked Block or Dismiss, then manually entered pickup
 * C = manually entered pickup without ever using the dialog
 * unknown = fallback if participant path is incomplete
 *************************************************************/
function determineSurveyGroup() {
    // Group A: user saw the dialog and clicked Allow
    if (initialDecision === 'allow') {
        return 'A';
    }

    // Group B: user saw the dialog, clicked Block or Dismiss,
    // then continued by manually entering a pickup address
    if (
        (initialDecision === 'block' || initialDecision === 'dismiss') &&
        manualPickupEntered === true
    ) {
        return 'B';
    }

    // Group C: user manually entered pickup without ever
    // interacting with the permission dialog
    if (
        initialDecision === null &&
        manualPickupEntered === true
    ) {
        return 'C';
    }

    // Fallback: participant reached the survey link without
    // enough evidence to classify — should not happen in
    // normal flow but protects data integrity
    return 'unknown';
}

/*************************************************************
 * Build Qualtrics URL with all Embedded Data parameters
 * Called only at click time, not at page load, so that
 * survey_group, permission_decision, and dialog_variant
 * reflect the participant's actual behavior.
 *************************************************************/
function buildQualtricsUrl() {
    const session_id = sessionStorage.getItem('quicktaxi_sessionId');
    const experiment_run_id = sessionStorage.getItem('quicktaxi_experimentRunId');
    const user_id = localStorage.getItem('quicktaxi_userId');

    const survey_group = determineSurveyGroup();
    const permission_decision = initialDecision || 'none';
    const dialog_variant = currentDialogVariant || 'none';

    if (!session_id || !experiment_run_id || !user_id) {
        console.warn("Missing IDs for Qualtrics URL:", {
            session_id,
            experiment_run_id,
            user_id,
            survey_group,
            permission_decision,
            dialog_variant
        });
        return QUALTRICS_BASE_URL;
    }

    return (
        `${QUALTRICS_BASE_URL}` +
        `?session_id=${encodeURIComponent(session_id)}` +
        `&user_id=${encodeURIComponent(user_id)}` +
        `&experiment_run_id=${encodeURIComponent(experiment_run_id)}` +
        `&survey_group=${encodeURIComponent(survey_group)}` +
        `&permission_decision=${encodeURIComponent(permission_decision)}` +
        `&dialog_variant=${encodeURIComponent(dialog_variant)}`
    );
}

/*************************************************************
 * DEBUG: Catch any page unload or navigation
 *************************************************************/
window.addEventListener('beforeunload', (e) => {
    console.log("Page is unloading. Something triggered a reload or navigation.");
});

/*************************************************************
 * User ID Management
 *************************************************************/
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getUserId() {
    let userId = localStorage.getItem('quicktaxi_userId');
    if (!userId) {
        userId = generateUserId();
        localStorage.setItem('quicktaxi_userId', userId);
        console.log('New user ID generated:', userId);
    } else {
        console.log('Existing user ID found:', userId);
    }
    return userId;
}

/*************************************************************
 * Session ID Management
 *************************************************************/
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getSessionId() {
    let sessionId = sessionStorage.getItem('quicktaxi_sessionId');
    if (!sessionId) {
        sessionId = generateSessionId();
        sessionStorage.setItem('quicktaxi_sessionId', sessionId);
        console.log('New session ID generated:', sessionId);
    } else {
        console.log('Existing session ID found:', sessionId);
    }
    return sessionId;
}

/*************************************************************
 * Experiment Run ID Management
 *************************************************************/
function generateExperimentRunId() {
    return 'run_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getExperimentRunId() {
    const experimentRunId = generateExperimentRunId();
    sessionStorage.setItem('quicktaxi_experimentRunId', experimentRunId);
    console.log('New experiment run ID generated:', experimentRunId);
    return experimentRunId;
}

/*************************************************************
 * Technical Metadata Collection
 *************************************************************/
function getBrowserMetadata() {
    const ua = navigator.userAgent;
    const browserRegexes = {
        chrome: /Chrome\/([0-9.]+)/,
        firefox: /Firefox\/([0-9.]+)/,
        safari: /Safari\/([0-9.]+)/,
        edge: /Edg\/([0-9.]+)/,
        ie: /Trident\/([0-9.]+)/
    };

    let browser = 'Unknown';
    for (const [name, regex] of Object.entries(browserRegexes)) {
        const match = ua.match(regex);
        if (match) {
            browser = `${name.charAt(0).toUpperCase() + name.slice(1)} ${match[1]}`;
            break;
        }
    }

    let os = 'Unknown';
    if (ua.includes('Windows')) {
        os = ua.includes('Windows NT 10.0') ? 'Windows 10/11' : 'Windows';
    } else if (ua.includes('Mac')) {
        os = 'MacOS';
    } else if (ua.includes('Linux')) {
        os = 'Linux';
    } else if (ua.includes('Android')) {
        os = 'Android';
    } else if (ua.includes('iOS')) {
        os = 'iOS';
    }

    let device_type = 'Desktop';
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
        device_type = /iPad/i.test(ua) ? 'Tablet' : 'Mobile';
    }

    return {
        browser,
        operating_system: os,
        device_type
    };
}

/*************************************************************
 * Prevent any accidental form submissions
 *************************************************************/
document.addEventListener('submit', function (e) {
    e.preventDefault();
    console.warn('Form submission prevented');
});

/*************************************************************
 * Global state
 *************************************************************/
let locationDecisionMade = false;
let initialDecision = null;       // Still used for UI flow (enable/disable inputs)
let dialogInProgress = false;
let currentDialogVariant = null;  // Stores the chosen dialog variant name
let cachedCountry = null;         // Cache country so we only fetch once
let manualPickupEntered = false;  // Tracks whether user manually entered a pickup address

const userId = getUserId();
const sessionId = getSessionId();
const experimentRunId = getExperimentRunId();

/*************************************************************
 * Dialog variant name mapping
 * Maps the random number (0-9) to a clean, stable string.
 * These names are sent in payload for permission_dialog_shown
 * and permission_decision events.
 *************************************************************/
const DIALOG_VARIANT_NAMES = {
    0: 'control',
    1: 'functionality_only',
    2: 'third_party_ads_only',
    3: 'third_party_analytics_only',
    4: 'functionality_and_third_party_ads',
    5: 'functionality_and_third_party_analytics',
    6: 'functionality_and_first_party_ads',
    7: 'functionality_and_first_party_analytics',
    8: 'functionality_third_party_ads_secondary_uses',
    9: 'functionality_third_party_analytics_secondary_uses'
};

/*************************************************************
 * Dialog element ID mapping
 * Maps the random number (0-9) to the HTML element ID.
 *************************************************************/
const DIALOG_ELEMENT_IDS = {
    0: 'custom-dialog',
    1: 'functionality-dialog',
    2: 'ads-dialog',
    3: 'analytics-dialog',
    4: 'combined-dialog',
    5: 'combined-analytics-dialog',
    6: 'combined-first-party-dialog',
    7: 'combined-first-party-analytics-dialog',
    8: 'three-purposes-dialog',
    9: 'functionality-analytics-secondary-dialog'
};

/*************************************************************
 * Function to get user's country (no IP stored)
 * Uses Country.is — a free IP-to-country API, no key required.
 * Fetches once and caches the result for the session.
 *************************************************************/
async function getUserCountry() {
    if (cachedCountry !== null) return cachedCountry;

    try {
        const response = await fetch('https://api.country.is/');
        const data = await response.json();

        // Country.is returns { ip: "...", country: "US" }
        // We only use the country field — IP is never stored
        if (data.country) {
            cachedCountry = data.country;
        } else {
            console.error('Country.is returned no country field:', data);
            cachedCountry = 'unknown';
        }
    } catch (error) {
        console.error('Error fetching country:', error);
        cachedCountry = 'unknown';
    }

    return cachedCountry;
}

/*************************************************************
 * NEW: Generic event sender — replaces old sendTrackingData()
 *
 * Sends exactly the shape the server expects:
 *   session_id, experiment_run_id, user_id,
 *   event_type, event_timestamp, payload,
 *   browser, operating_system, device_type, country
 *
 * Each call = one row in user_events.
 *************************************************************/
async function sendEvent(eventType, payload = {}) {
    try {
        const country = await getUserCountry();
        const metadata = getBrowserMetadata();

        const eventData = {
            session_id:         sessionStorage.getItem('quicktaxi_sessionId'),
            experiment_run_id:  sessionStorage.getItem('quicktaxi_experimentRunId'),
            user_id:            localStorage.getItem('quicktaxi_userId'),
            event_type:         eventType,
            event_timestamp:    new Date().toISOString(),
            payload:            payload,
            browser:            metadata.browser,
            operating_system:   metadata.operating_system,
            device_type:        metadata.device_type,
            country:            country
        };

        console.log(`Sending event [${eventType}]:`, eventData);

        const response = await fetch(TRACKING_SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(eventData)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(`Event [${eventType}] failed:`, result);
            return false;
        }

        console.log(`Event [${eventType}] recorded:`, result);
        return true;

    } catch (error) {
        console.error(`Event [${eventType}] error:`, error);
        return false;
    }
}

/*************************************************************
 * Initialize page elements
 *************************************************************/
function initializePageElements() {
    const elements = {
        // Instructions page elements
        agreeButton: document.getElementById('agreeButton'),
        disagreeButton: document.getElementById('disagreeButton'),
        nextButton: document.getElementById('nextButton'),
        consentMessage: document.getElementById('consentMessage'),
        instructionsPage: document.getElementById('instructions-page'),
        mainPage: document.getElementById('main-page'),

        // Main page elements
        allowLocationButton: document.getElementById("allow-location-button"),
        bookNowButton: document.getElementById("book-now-button"),
        customDialog: document.getElementById("custom-dialog"),
        customAlert: document.getElementById("custom-alert"),
        alertMessage: document.getElementById("alert-message"),
        surveyInstructions: document.getElementById("survey-instructions"),
        confirmationDialog: null,

        // Survey link (anchor)
        surveyLink: document.querySelector('.survey-link a'),

        // Final page elements (not used)
        finalPage: null,
        finalSurveyLink: null
    };

    Object.entries(elements).forEach(([key, element]) => {
        if (!element) {
            console.warn(`Element not found: ${key}`);
        }
    });

    return elements;
}

/*************************************************************
 * Handle location permission
 *************************************************************/
async function handleLocationPermission(action, event) {
    if (event) event.preventDefault();

    if (locationDecisionMade) {
        console.warn('Location decision already made');
        return;
    }

    const elements = {
        customDialog: document.getElementById("custom-dialog"),
        customAlert: document.getElementById("custom-alert"),
        alertMessage: document.getElementById("alert-message")
    };

    try {
        initialDecision = action;

        // Hide all dialogs
        Object.values(DIALOG_ELEMENT_IDS).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });

        const bookNowButton = document.getElementById("book-now-button");
        const pickupInput = document.getElementById('pickup-location');
        const dropoffInput = document.getElementById('dropoff-location');

        if (action === 'allow') {
            if (pickupInput) {
                pickupInput.disabled = true;
                pickupInput.placeholder = "Your location will be used";
                pickupInput.value = "";
            }
            if (dropoffInput) {
                dropoffInput.disabled = true;
                dropoffInput.placeholder = "Location selected";
                dropoffInput.value = "";
            }

            if (bookNowButton) {
                bookNowButton.disabled = false;
                bookNowButton.style.backgroundColor = '#007bff';
                bookNowButton.style.cursor = 'pointer';
            }
        } else {
            if (pickupInput) {
                pickupInput.disabled = false;
                pickupInput.placeholder = "Enter Pickup location";
            }
            if (dropoffInput) {
                dropoffInput.disabled = false;
                dropoffInput.placeholder = "Enter Drop-off location";
            }

            if (bookNowButton) {
                const hasPickupText = pickupInput && pickupInput.value.trim() !== '';
                if (hasPickupText) {
                    bookNowButton.disabled = false;
                    bookNowButton.style.backgroundColor = '#007bff';
                    bookNowButton.style.cursor = 'pointer';
                } else {
                    bookNowButton.disabled = true;
                    bookNowButton.style.backgroundColor = '';
                    bookNowButton.style.cursor = '';
                }
            }
        }

        // EVENT: permission_decision
        // payload.decision is REQUIRED by the server (allow, block, or dismiss)
        // payload.dialog_variant is optional but valuable for analysis
        const trackingSuccess = await sendEvent('permission_decision', {
            decision: action,
            dialog_variant: currentDialogVariant
        });
        if (!trackingSuccess) console.warn('Failed to track permission_decision, but continuing user flow');

        locationDecisionMade = true;

        // Show Location Access alert ONLY for Allow.
        // For Block and Dismiss, the user returns directly to the main page
        // with pickup/dropoff enabled so they can type an address manually.
        if (action === 'allow') {
            showCustomAlert(
                "Simulated location access granted — no real data is collected.\n\n" +
                "1. Click 'OK'\n2. Then click 'Book Now' to continue."
            );
        }
        // Block and Dismiss: no alert — user is already back on the main page
        // with the permission dialog hidden and input fields ready

    } catch (error) {
        console.error('Error in handleLocationPermission:', error);
        initialDecision = null;
        locationDecisionMade = false;
        showCustomAlert("An error occurred. Please try again.");
    }
}

/*************************************************************
 * Dialog Management Functions
 *************************************************************/
function showCustomAlert(message) {
    const customAlert = document.getElementById("custom-alert");
    const alertMessage = document.getElementById("alert-message");

    if (customAlert && alertMessage) {
        alertMessage.textContent = message;
        customAlert.style.display = "flex";
    }
}

function showSurveyInstructions(event) {
    if (event) event.preventDefault();

    const customAlert = document.getElementById("custom-alert");
    const surveyInstructions = document.getElementById("survey-instructions");

    if (customAlert && surveyInstructions) {
        customAlert.style.display = "none";
        surveyInstructions.style.display = "flex";
    }
}

/*************************************************************
 * Survey Link Tracking
 * - URL is built at click time, NOT at page load, so that
 *   survey_group, permission_decision, and dialog_variant
 *   reflect the participant's actual completed behavior.
 * - Opens Qualtrics in new tab via window.open
 * - Tracks click via sendEvent with full routing context
 * - Disables the link after first click
 * - Shows a message in this tab
 *************************************************************/
function initializeSurveyTracking(elements) {
    if (!elements.surveyLink) {
        console.warn("Survey link not found. Check your HTML selector: .survey-link a");
        return;
    }

    // Set href to "#" initially — real URL is built at click time
    elements.surveyLink.href = "#";
    elements.surveyLink.target = "_blank";
    elements.surveyLink.rel = "noopener noreferrer";
    elements.surveyLink.textContent = "Click here to start the survey";

    let alreadyClicked = false;

    elements.surveyLink.addEventListener('click', function (e) {
        e.preventDefault();

        if (alreadyClicked) return;

        const finalSurveyGroup = determineSurveyGroup();

        // Guard: do not open Qualtrics if participant path is incomplete
        if (finalSurveyGroup === 'unknown') {
            console.warn("Survey group could not be determined. Participant path is incomplete.");
            // Do not set alreadyClicked — allow retry after completing the flow
            return;
        }

        alreadyClicked = true;

        // Build the Qualtrics URL NOW, after the participant's behavior is known
        const url = buildQualtricsUrl();

        const finalPermissionDecision = initialDecision || 'none';
        const finalDialogVariant = currentDialogVariant || 'none';

        // EVENT: survey_link_clicked with full survey-routing context
        try {
            sendEvent('survey_link_clicked', {
                survey_url: url,
                survey_group: finalSurveyGroup,
                permission_decision: finalPermissionDecision,
                dialog_variant: finalDialogVariant
            });
        } catch (err) {
            console.error("Survey click tracking failed:", err);
        }

        // Open Qualtrics in a new tab
        window.open(url, "_blank", "noopener,noreferrer");

        // Disable link so it can't be clicked again
        elements.surveyLink.style.pointerEvents = "none";
        elements.surveyLink.style.opacity = "0.6";
        elements.surveyLink.textContent = "Survey opened";

        // Show message under the link (only once)
        const parent = elements.surveyLink.parentElement;
        if (parent && !document.getElementById("survey-opened-msg")) {
            const msg = document.createElement("div");
            msg.id = "survey-opened-msg";
            msg.style.marginTop = "12px";
            msg.style.fontSize = "14px";
            msg.style.textAlign = "center";
            msg.textContent =
                "The survey opened in a new tab. Please continue in that tab, then follow the instructions at the end of the survey to return to Prolific.";
            parent.appendChild(msg);
        }
    });
}

/*************************************************************
 * Main initialization
 *************************************************************/
document.addEventListener("DOMContentLoaded", function () {
    const elements = initializePageElements();

    // Initialize Book Now button as disabled on page load
    if (elements.bookNowButton) {
        elements.bookNowButton.disabled = true;
    }

    // Ensure all buttons are type="button"
    document.querySelectorAll('button').forEach(button => {
        if (!button.type) button.type = 'button';
    });

    // Initialize survey tracking
    initializeSurveyTracking(elements);

    // ─── Consent buttons ─────────────────────────────────────────────
    if (elements.agreeButton && elements.disagreeButton) {
        elements.agreeButton.addEventListener('click', function (e) {
            e.preventDefault();

            elements.agreeButton.classList.remove('selected');
            elements.disagreeButton.classList.remove('selected');
            elements.agreeButton.classList.add('selected');
            elements.nextButton.disabled = false;
            elements.consentMessage.textContent = '';

            // EVENT: consent_agree
            sendEvent('consent_agree', {});
        });

        elements.disagreeButton.addEventListener('click', function (e) {
            e.preventDefault();

            elements.agreeButton.classList.remove('selected');
            elements.disagreeButton.classList.remove('selected');
            elements.disagreeButton.classList.add('selected');
            elements.nextButton.disabled = true;
            elements.consentMessage.textContent = 'You must agree to continue with the survey.';

            // EVENT: consent_disagree
            sendEvent('consent_disagree', {});
        });
    }

    // ─── Next button (instructions → main page) ─────────────────────
    if (elements.nextButton) {
        elements.nextButton.addEventListener('click', function (e) {
            e.preventDefault();
            elements.instructionsPage.style.display = 'none';
            elements.mainPage.style.display = 'block';

            if (elements.bookNowButton) {
                elements.bookNowButton.disabled = true;
            }

            // EVENT: instructions_next
            sendEvent('instructions_next', {});
        });
    }

    // ─── Location icon click → randomize dialog ─────────────────────
    if (elements.allowLocationButton) {
        elements.allowLocationButton.addEventListener("click", function (e) {
            e.preventDefault();
            if (!locationDecisionMade && !dialogInProgress) {
                dialogInProgress = true; // NEVER RESET — one dialog per session

                // EVENT: location_icon_clicked
                sendEvent('location_icon_clicked', {});

                // Randomize which dialog variant to show
                const randomValue = Math.floor(Math.random() * 10);

                // Store the variant name for reuse in permission_decision
                currentDialogVariant = DIALOG_VARIANT_NAMES[randomValue];

                // Show the chosen dialog
                const dialogElementId = DIALOG_ELEMENT_IDS[randomValue];
                const dialogEl = document.getElementById(dialogElementId);
                if (dialogEl) {
                    dialogEl.style.display = "flex";
                }

                // EVENT: permission_dialog_shown
                sendEvent('permission_dialog_shown', {
                    dialog_variant: currentDialogVariant
                });
            }
        });
    }

    // ─── Book Now button → show survey instructions modal ────────────
    // Only advance to survey instructions when the button is enabled.
    // When disabled, log the click as stuck-behavior data but do NOT
    // show the survey modal — that would bypass the intended gating.
    if (elements.bookNowButton) {
        elements.bookNowButton.addEventListener("click", function (e) {
            e.preventDefault();

            const isEnabled = !elements.bookNowButton.disabled;

            // EVENT: book_now_clicked (always logged — useful HCI data either way)
            sendEvent('book_now_clicked', {
                button_enabled: isEnabled
            });

            // Only proceed to survey instructions if the button is enabled
            if (isEnabled) {
                const surveyInstructions = document.getElementById("survey-instructions");
                if (surveyInstructions) {
                    surveyInstructions.style.display = "flex";
                }
            }
        });
    }

    // ─── Google Places Autocomplete: pickup location ─────────────────
    const pickupInput = document.getElementById('pickup-location');
    if (pickupInput) {
        // Flag: log manual_pickup_entered only once per experiment run
        let manualPickupLogged = false;

        const autocomplete = new google.maps.places.Autocomplete(pickupInput);

        autocomplete.addListener('place_changed', function () {
            const place = autocomplete.getPlace();
            if (place && place.formatted_address) {
                console.log('Selected place:', place.formatted_address);
                if (!pickupInput.disabled && elements.bookNowButton) {
                    elements.bookNowButton.disabled = false;
                    elements.bookNowButton.style.backgroundColor = '#007bff';
                    elements.bookNowButton.style.cursor = 'pointer';
                }

                // EVENT: manual_pickup_entered (autocomplete selection)
                // Strongest signal — user committed to a specific address
                if (!manualPickupLogged) {
                    manualPickupLogged = true;
                    manualPickupEntered = true;
                    sendEvent('manual_pickup_entered', {
                        entry_method: 'autocomplete',
                        pickup_present: true
                    });
                }
            }
        });

        pickupInput.addEventListener('input', function () {
            if (!pickupInput.disabled && elements.bookNowButton) {
                const hasText = pickupInput.value.trim() !== '';
                if (hasText) {
                    elements.bookNowButton.disabled = false;
                    elements.bookNowButton.style.backgroundColor = '#007bff';
                    elements.bookNowButton.style.cursor = 'pointer';

                    // EVENT: manual_pickup_entered (typed fallback)
                    // Fires once when field first becomes meaningfully non-empty
                    // Only if autocomplete hasn't already logged it
                    if (!manualPickupLogged) {
                        manualPickupLogged = true;
                        manualPickupEntered = true;
                        sendEvent('manual_pickup_entered', {
                            entry_method: 'typed',
                            pickup_present: true
                        });
                    }
                } else {
                    elements.bookNowButton.disabled = true;
                    elements.bookNowButton.style.backgroundColor = '';
                    elements.bookNowButton.style.cursor = '';
                }
            }
        });
    }

    // ─── Google Places Autocomplete: dropoff location ────────────────
    const dropoffInput = document.getElementById('dropoff-location');
    if (dropoffInput) {
        const dropoffAutocomplete = new google.maps.places.Autocomplete(dropoffInput);

        dropoffAutocomplete.addListener('place_changed', function () {
            const place = dropoffAutocomplete.getPlace();
            if (place && place.formatted_address) {
                console.log('Dropoff location selected:', place.formatted_address);
            }
        });
    }

    // ─── Date picker (Flatpickr) ─────────────────────────────────────
    const datePickerInput = document.getElementById('date-picker');
    if (datePickerInput) {
        let currentDateValue = new Date();

        const fp = flatpickr(datePickerInput, {
            minDate: "today",
            defaultDate: "today",
            dateFormat: "M d",
            allowInput: false,
            clickOpens: false,
            onChange: function (selectedDates, dateStr) {
                datePickerInput.value = dateStr;
                currentDateValue = selectedDates[0];
                console.log("Selected date:", currentDateValue);
            }
        });

        setTimeout(function () {
            datePickerInput.value = "Today";
        }, 0);

        datePickerInput.addEventListener('click', function () {
            fp.open();
        });
    }

    // ─── Time picker (Flatpickr) ─────────────────────────────────────
    const timePickerInput = document.getElementById('time-picker');
    if (timePickerInput) {
        timePickerInput.value = "Now";
        let currentTimeValue = new Date();

        const timePicker = flatpickr(timePickerInput, {
            enableTime: true,
            noCalendar: true,
            dateFormat: "h:i K",
            defaultHour: new Date().getHours(),
            defaultMinute: Math.ceil(new Date().getMinutes() / 15) * 15,
            minuteIncrement: 15,
            time_24hr: false,
            static: true,
            clickOpens: false,

            onReady: function (selectedDates, dateStr, instance) {
                setTimeout(() => {
                    timePickerInput.value = "Now";
                }, 0);

                setTimeout(() => {
                    const customTimeContainer = document.createElement('div');
                    customTimeContainer.className = 'flatpickr-time-custom';

                    const nowOption = document.createElement('div');
                    nowOption.className = 'flatpickr-time-option selected';
                    nowOption.textContent = 'Now';
                    nowOption.addEventListener('click', function () {
                        timePickerInput.value = 'Now';
                        currentTimeValue = new Date();
                        console.log("Selected time: Now (current time)", currentTimeValue);

                        timePicker.close();

                        document.querySelectorAll('.flatpickr-time-option').forEach(opt => {
                            opt.classList.remove('selected');
                        });
                        nowOption.classList.add('selected');
                    });
                    customTimeContainer.appendChild(nowOption);

                    const now = new Date();
                    let currentHour = now.getHours();
                    let currentMinute = Math.ceil(now.getMinutes() / 15) * 15;
                    if (currentMinute === 60) {
                        currentHour = (currentHour + 1) % 24;
                        currentMinute = 0;
                    }

                    for (let hour = currentHour; hour < 24; hour++) {
                        for (let minute = 0; minute < 60; minute += 15) {
                            if (hour === currentHour && minute === currentMinute && minute === 0) continue;

                            let displayHour = hour % 12;
                            if (displayHour === 0) displayHour = 12;
                            const ampm = hour < 12 ? 'AM' : 'PM';
                            const timeString = `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;

                            const timeOption = document.createElement('div');
                            timeOption.className = 'flatpickr-time-option';
                            timeOption.textContent = timeString;
                            timeOption.addEventListener('click', function () {
                                timePickerInput.value = timeString;

                                const timeDate = new Date();
                                timeDate.setHours(hour, minute, 0, 0);
                                currentTimeValue = timeDate;
                                console.log("Selected time:", timeString, currentTimeValue);

                                instance.setDate(timeDate, true);
                                timePicker.close();

                                document.querySelectorAll('.flatpickr-time-option').forEach(opt => {
                                    opt.classList.remove('selected');
                                });
                                timeOption.classList.add('selected');
                            });

                            customTimeContainer.appendChild(timeOption);
                        }
                    }

                    const timeContainer = instance.calendarContainer.querySelector('.flatpickr-time');
                    if (timeContainer) {
                        timeContainer.style.display = 'none';
                        timeContainer.parentNode.insertBefore(customTimeContainer, timeContainer);
                    }
                }, 0);
            }
        });

        timePickerInput.addEventListener('click', function () {
            timePicker.open();
        });

        document.addEventListener('click', function (event) {
            const calendar = document.querySelector('.flatpickr-calendar');
            if (calendar &&
                calendar.classList.contains('open') &&
                !calendar.contains(event.target) &&
                !timePickerInput.contains(event.target)) {

                if (timePickerInput.value !== "Now" &&
                    !/\d{1,2}:\d{2}\s(AM|PM)/.test(timePickerInput.value)) {
                    timePickerInput.value = "Now";
                    currentTimeValue = new Date();
                }
            }
        });
    }
});
