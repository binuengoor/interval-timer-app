// State Management
let plans = [];
let appConfig = {};
let currentPlanId = null;
let currentExerciseId = null;

// --- App Settings (Audio, Voice, Haptics) ---
let appSettings = {
    voicePrompts: 'full', // 'full' | 'minimal' | 'off'
    voiceSpeed: 1.1,
    soundBeeps: true,
    haptics: true
};

function loadSettings() {
    try {
        const saved = localStorage.getItem('intervalTimerSettings');
        if (saved) {
            appSettings = { ...appSettings, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error("Failed to load settings from localStorage", e);
    }
    applySettingsToDOM();
}

function saveSettings() {
    try {
        localStorage.setItem('intervalTimerSettings', JSON.stringify(appSettings));
    } catch (e) {
        console.error("Failed to save settings to localStorage", e);
    }
}

function applySettingsToDOM() {
    const voiceSelect = document.getElementById('settingVoicePrompts');
    const speedInput = document.getElementById('settingVoiceSpeed');
    const speedVal = document.getElementById('voiceSpeedVal');
    const beepsCheck = document.getElementById('settingSoundBeeps');
    const hapticsCheck = document.getElementById('settingHaptics');

    if (voiceSelect) voiceSelect.value = appSettings.voicePrompts;
    if (speedInput) speedInput.value = appSettings.voiceSpeed;
    if (speedVal) speedVal.textContent = Number(appSettings.voiceSpeed).toFixed(2);
    if (beepsCheck) beepsCheck.checked = appSettings.soundBeeps;
    if (hapticsCheck) hapticsCheck.checked = appSettings.haptics;
}

function triggerHaptic(pattern = [100]) {
    if (appSettings.haptics && 'vibrate' in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {}
    }
}

// DOM Elements
const views = {
    dashboard: document.getElementById('dashboardView'),
    planEditor: document.getElementById('planEditorView'),
    workout: document.getElementById('workoutView')
};

// --- Toast Notifications ---
let toastTimeout = null;
function showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

// --- Lightbox Modal State & Logic ---
let lightboxState = {
    title: '',
    images: [],
    youtubeUrl: '',
    currentIndex: 0
};

function openLightbox(exercise, initialIndex = 0) {
    if (!exercise) return;
    const hasImages = exercise.images && exercise.images.length > 0;
    const ytId = extractYouTubeID(exercise.youtubeUrl);

    if (!hasImages && !ytId) {
        showToast("No media available for this exercise");
        return;
    }

    lightboxState = {
        title: exercise.name || 'Exercise Media',
        images: exercise.images || [],
        youtubeUrl: exercise.youtubeUrl || '',
        currentIndex: initialIndex
    };

    document.getElementById('lightboxTitle').textContent = lightboxState.title;
    renderLightboxContent();
    document.getElementById('mediaLightboxModal').classList.remove('hidden');
}

function renderLightboxContent() {
    const wrapper = document.getElementById('lightboxMediaContent');
    const nav = document.getElementById('lightboxNav');
    const counter = document.getElementById('lightboxCounter');
    wrapper.innerHTML = '';

    const hasImages = lightboxState.images.length > 0;
    const ytId = extractYouTubeID(lightboxState.youtubeUrl);

    if (hasImages) {
        const total = lightboxState.images.length;
        const currentUrl = lightboxState.images[lightboxState.currentIndex];
        const getImageUrl = (url) => `/api/image?url=${encodeURIComponent(url)}&planId=${currentPlanId || ''}`;
        
        const img = document.createElement('img');
        img.src = getImageUrl(currentUrl);
        img.alt = lightboxState.title;
        wrapper.appendChild(img);

        if (total > 1) {
            nav.classList.remove('hidden');
            counter.textContent = `${lightboxState.currentIndex + 1} / ${total}`;
        } else {
            nav.classList.add('hidden');
        }
    } else if (ytId) {
        nav.classList.add('hidden');
        wrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
}

function closeLightbox() {
    document.getElementById('mediaLightboxModal').classList.add('hidden');
    document.getElementById('lightboxMediaContent').innerHTML = '';
}

function lightboxNext() {
    if (lightboxState.images.length <= 1) return;
    lightboxState.currentIndex = (lightboxState.currentIndex + 1) % lightboxState.images.length;
    renderLightboxContent();
}

function lightboxPrev() {
    if (lightboxState.images.length <= 1) return;
    lightboxState.currentIndex = (lightboxState.currentIndex - 1 + lightboxState.images.length) % lightboxState.images.length;
    renderLightboxContent();
}

document.getElementById('closeLightboxBtn').addEventListener('click', closeLightbox);
document.getElementById('lightboxNextBtn').addEventListener('click', lightboxNext);
document.getElementById('lightboxPrevBtn').addEventListener('click', lightboxPrev);

// --- Curated Preset Workout Templates ---
const PRESET_TEMPLATES = [
    {
        id: 'template_shoulder_mobility',
        name: 'Shoulder & Neck Mobility (PT)',
        description: 'Physical therapy routine for relieving shoulder impingement, neck tension, and improving overhead reach.',
        transitionTime: 5,
        exercises: [
            {
                name: 'Supine Wand Flexion',
                notes: 'Lie on your back, hold a cane or wand, gently raise arms overhead.',
                sets: 2,
                reps: 10,
                workTime: 10,
                restTime: 0,
                bothSides: false,
                images: [],
                youtubeUrl: 'http://www.youtube.com/watch?v=LKE2CQfu9WQ'
            },
            {
                name: 'Corner Pec Stretch',
                notes: 'Stand facing a corner with elbows at shoulder height. Lean gently in.',
                sets: 1,
                reps: 5,
                workTime: 30,
                restTime: 5,
                bothSides: false,
                images: [],
                youtubeUrl: 'http://www.youtube.com/watch?v=SdjsqyTiHcc'
            },
            {
                name: 'Sleeper Stretch (Internal Rotation)',
                notes: 'Lie on your side, gently draw forearm toward the table.',
                sets: 2,
                reps: 4,
                workTime: 20,
                restTime: 5,
                bothSides: true,
                images: [],
                youtubeUrl: 'http://www.youtube.com/watch?v=clqjaMIRWfM'
            }
        ]
    },
    {
        id: 'template_core_stability',
        name: 'Core Stability & Planks (Unilateral)',
        description: 'Targeted core & anti-rotational exercises with side switches.',
        transitionTime: 5,
        exercises: [
            {
                name: 'Side Plank Hold',
                notes: 'Keep hips lifted and body aligned in a straight line.',
                sets: 3,
                reps: 1,
                workTime: 30,
                restTime: 10,
                bothSides: true,
                images: [],
                youtubeUrl: ''
            },
            {
                name: 'Bird Dog Extensions',
                notes: 'Opposite arm and leg extended, keep hips level.',
                sets: 2,
                reps: 10,
                workTime: 5,
                restTime: 2,
                bothSides: true,
                images: [],
                youtubeUrl: ''
            },
            {
                name: 'Dead Bugs',
                notes: 'Keep lower back pressed flat into the floor.',
                sets: 3,
                reps: 12,
                workTime: 4,
                restTime: 2,
                bothSides: false,
                images: [],
                youtubeUrl: ''
            }
        ]
    },
    {
        id: 'template_desk_stretch',
        name: 'Desk Ergonomics & Quick Stretch',
        description: 'Quick 5-minute break routine to reset posture and release wrist/neck strain.',
        transitionTime: 4,
        exercises: [
            {
                name: 'Seated Spinal Twist',
                notes: 'Sit upright and twist gently toward the back of your chair.',
                sets: 1,
                reps: 2,
                workTime: 25,
                restTime: 5,
                bothSides: true,
                images: [],
                youtubeUrl: ''
            },
            {
                name: 'Wrist Extensor & Flexor Stretch',
                notes: 'Extend arm forward and gently pull fingers backward, then downward.',
                sets: 1,
                reps: 2,
                workTime: 20,
                restTime: 5,
                bothSides: true,
                images: [],
                youtubeUrl: ''
            },
            {
                name: 'Upper Trapezius Neck Stretch',
                notes: 'Gently tilt ear toward shoulder without shrugging.',
                sets: 1,
                reps: 2,
                workTime: 25,
                restTime: 5,
                bothSides: true,
                images: [],
                youtubeUrl: ''
            }
        ]
    },
    {
        id: 'template_7min_hiit',
        name: '7-Minute Full Body Interval',
        description: 'High-efficiency scientific interval routine with bodyweight movements.',
        transitionTime: 5,
        exercises: [
            { name: 'Jumping Jacks', notes: 'Full range of motion.', sets: 1, reps: 1, workTime: 30, restTime: 10, bothSides: false, images: [], youtubeUrl: '' },
            { name: 'Wall Sit', notes: 'Thighs parallel to the floor.', sets: 1, reps: 1, workTime: 30, restTime: 10, bothSides: false, images: [], youtubeUrl: '' },
            { name: 'Pushups', notes: 'Controlled tempo.', sets: 1, reps: 1, workTime: 30, restTime: 10, bothSides: false, images: [], youtubeUrl: '' },
            { name: 'Step-ups onto Chair/Bench', notes: 'Drive through heel.', sets: 1, reps: 1, workTime: 30, restTime: 10, bothSides: true, images: [], youtubeUrl: '' },
            { name: 'Plank Hold', notes: 'Engage glutes and core.', sets: 1, reps: 1, workTime: 30, restTime: 10, bothSides: false, images: [], youtubeUrl: '' }
        ]
    }
];

function renderTemplatesList() {
    const list = document.getElementById('templatesList');
    if (!list) return;
    list.innerHTML = '';

    PRESET_TEMPLATES.forEach(tpl => {
        const div = document.createElement('div');
        div.className = 'template-card';
        div.innerHTML = `
            <div class="template-info">
                <h4>${tpl.name}</h4>
                <p>${tpl.description}</p>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">
                    ${tpl.exercises.length} exercises &bull; ${tpl.transitionTime}s transition
                </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="importPresetTemplate('${tpl.id}')">+ Add Plan</button>
        `;
        list.appendChild(div);
    });
}

window.importPresetTemplate = function(templateId) {
    const tpl = PRESET_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;

    const newPlan = {
        id: generateId(),
        name: tpl.name,
        transitionTime: tpl.transitionTime,
        exercises: tpl.exercises.map(ex => ({
            ...ex,
            id: generateId(),
            restBetweenSets: ex.restBetweenSets || 0
        }))
    };

    plans.push(newPlan);
    saveState();
    renderDashboard();
    document.getElementById('templatesModal').classList.add('hidden');
    showToast(`Added "${tpl.name}" to your plans!`);
};

// --- Helper Functions ---
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

async function loadState() {
    loadSettings();
    try {
        const configResponse = await fetch('/api/config');
        if (configResponse.ok) {
            appConfig = await configResponse.json();
        }

        const response = await fetch('/api/plans');
        if (response.ok) {
            plans = await response.json();
            renderDashboard();
        }
    } catch (e) {
        console.error("Failed to load state from server, falling back to localStorage", e);
        plans = JSON.parse(localStorage.getItem('intervalTimerPlans')) || [];
        renderDashboard();
    }
}

async function saveState() {
    try {
        await fetch('/api/plans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(plans)
        });
    } catch (e) {
        console.error("Failed to save plans to server, saving to localStorage instead", e);
    }
    localStorage.setItem('intervalTimerPlans', JSON.stringify(plans));
}

function showView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}

// --- Activity Heatmap & Streak Calculation ---
function calculateStreakAndStats(statsMap) {
    const allTimestamps = [];
    Object.values(statsMap).forEach(records => {
        if (Array.isArray(records)) {
            records.forEach(r => {
                const ts = (typeof r === 'object' && r.timestamp) ? r.timestamp : r;
                if (ts) allTimestamps.push(ts);
            });
        }
    });

    const totalWorkouts = allTimestamps.length;
    
    // Parse distinct dates (YYYY-MM-DD)
    const dateCounts = {};
    allTimestamps.forEach(ts => {
        const d = new Date(ts);
        if (!isNaN(d)) {
            const key = d.toISOString().split('T')[0];
            dateCounts[key] = (dateCounts[key] || 0) + 1;
        }
    });

    // Calculate current streak
    let streak = 0;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If worked out today or yesterday, count backwards
    let checkDate = new Date(now);
    if (!dateCounts[todayStr] && dateCounts[yesterdayStr]) {
        checkDate = yesterday;
    }

    if (dateCounts[todayStr] || dateCounts[yesterdayStr]) {
        while (true) {
            const dStr = checkDate.toISOString().split('T')[0];
            if (dateCounts[dStr]) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    // Render 30-Day Activity Heatmap Grid
    const heatmap = document.getElementById('statsHeatmap');
    if (heatmap) {
        heatmap.innerHTML = '';
        for (let i = 29; i >= 0; i--) {
            const pastD = new Date(now);
            pastD.setDate(now.getDate() - i);
            const pastStr = pastD.toISOString().split('T')[0];
            const count = dateCounts[pastStr] || 0;

            const cell = document.createElement('div');
            let levelClass = 'level-0';
            if (count >= 3) levelClass = 'level-3';
            else if (count === 2) levelClass = 'level-2';
            else if (count === 1) levelClass = 'level-1';

            cell.className = `heatmap-cell ${levelClass}`;
            cell.title = `${pastD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${count} workout${count === 1 ? '' : 's'}`;
            heatmap.appendChild(cell);
        }
    }

    // Update banner & badges
    const bannerTotal = document.getElementById('bannerTotalWorkouts');
    const bannerStreak = document.getElementById('bannerCurrentStreak');
    const bannerPlans = document.getElementById('bannerTotalPlans');
    const headerBadge = document.getElementById('headerStreakBadge');

    if (bannerTotal) bannerTotal.textContent = totalWorkouts;
    if (bannerStreak) bannerStreak.textContent = `${streak} 🔥`;
    if (bannerPlans) bannerPlans.textContent = plans.length;
    if (headerBadge) headerBadge.textContent = `🔥 ${streak} Day Streak`;
}

// --- Navigation & UI ---

async function renderDashboard() {
    const list = document.getElementById('planList');
    list.innerHTML = '';

    let stats = {};
    try {
        const res = await fetch('/api/stats');
        if (res.ok) {
            stats = await res.json();
        }
    } catch (e) {
        console.error("Failed to fetch stats for dashboard", e);
    }

    calculateStreakAndStats(stats);

    if (plans.length === 0) {
        list.innerHTML = `
            <div class="card text-center py-4">
                <p class="text-muted">No workout plans yet.</p>
                <div class="mt-2" style="display: flex; gap: 0.5rem; justify-content: center;">
                    <button class="btn btn-primary" onclick="document.getElementById('createNewPlanBtn').click()">+ Create New Plan</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('openTemplatesBtn').click()">📚 Browse Presets</button>
                </div>
            </div>
        `;
        return;
    }

    plans.forEach(plan => {
        const planStats = stats[plan.id] || [];
        const timesCompleted = planStats.length;
        let lastCompleteStr = 'Never';
        if (timesCompleted > 0) {
            const lastItem = planStats[planStats.length - 1];
            const lastTs = (typeof lastItem === 'object' && lastItem.timestamp) ? lastItem.timestamp : lastItem;
            const lastDate = new Date(lastTs);
            lastCompleteStr = lastDate.toLocaleDateString() + ' ' + lastDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        // Calculate estimated total duration
        let totalSeconds = 0;
        const transitionTime = plan.transitionTime !== undefined ? plan.transitionTime : 5;

        (plan.exercises || []).forEach(ex => {
            const sets = ex.sets || 1;
            const reps = ex.reps || 1;
            const work = ex.workTime || 0;
            const rest = ex.restTime || 0;
            const sidesMultiplier = ex.bothSides ? 2 : 1;

            for (let s = 1; s <= sets; s++) {
                if (s === 1) {
                    totalSeconds += transitionTime;
                } else {
                    totalSeconds += (ex.restBetweenSets || 0);
                }

                for (let side = 0; side < sidesMultiplier; side++) {
                    if (side > 0) totalSeconds += 4; // short switch cue between sides
                    for (let r = 1; r <= reps; r++) {
                        totalSeconds += work;
                        if (rest > 0 && r < reps) {
                            totalSeconds += rest;
                        }
                    }
                }
            }
        });

        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        const durationStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        const div = document.createElement('div');
        div.className = 'plan-item card';
        div.onclick = () => editPlan(plan.id);
        div.innerHTML = `
            <div class="item-details">
                <h3>${plan.name || 'Untitled Plan'}</h3>
                <p>${(plan.exercises || []).length} exercises &bull; Est. Time: ${durationStr}</p>
                <div style="font-size: 0.85em; color: var(--text-muted); margin-top: 0.5rem;">
                    Completed ${timesCompleted} times &bull; Last: ${lastCompleteStr}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary btn-sm" onclick="showStats('${plan.id}', event)">Stats</button>
                <button class="btn btn-danger btn-sm" onclick="deletePlan('${plan.id}', event)">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

document.getElementById('createNewPlanBtn').addEventListener('click', () => {
    const newPlan = { id: generateId(), name: '', transitionTime: 5, exercises: [] };
    plans.push(newPlan);
    saveState();
    editPlan(newPlan.id);
});

// --- Presets Modal ---
document.getElementById('openTemplatesBtn').addEventListener('click', () => {
    renderTemplatesList();
    document.getElementById('templatesModal').classList.remove('hidden');
});
document.getElementById('closeTemplatesBtn').addEventListener('click', () => {
    document.getElementById('templatesModal').classList.add('hidden');
});

// --- Settings Modal ---
document.getElementById('openSettingsBtn').addEventListener('click', () => {
    applySettingsToDOM();
    document.getElementById('settingsModal').classList.remove('hidden');
});
document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('hidden');
});
document.getElementById('settingVoiceSpeed').addEventListener('input', (e) => {
    document.getElementById('voiceSpeedVal').textContent = Number(e.target.value).toFixed(2);
});
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    appSettings.voicePrompts = document.getElementById('settingVoicePrompts').value;
    appSettings.voiceSpeed = parseFloat(document.getElementById('settingVoiceSpeed').value) || 1.1;
    appSettings.soundBeeps = document.getElementById('settingSoundBeeps').checked;
    appSettings.haptics = document.getElementById('settingHaptics').checked;
    saveSettings();
    document.getElementById('settingsModal').classList.add('hidden');
    showToast("Settings saved!");
});

// --- Export & Import Plans ---
document.getElementById('exportPlansBtn').addEventListener('click', () => {
    try {
        let fileContent = '';
        let fileName = 'interval-timer-plans.yml';
        let mimeType = 'text/yaml';

        if (typeof jsyaml !== 'undefined') {
            fileContent = jsyaml.dump(plans);
        } else {
            fileContent = JSON.stringify(plans, null, 2);
            fileName = 'interval-timer-plans.json';
            mimeType = 'application/json';
        }

        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Plans exported successfully!");
    } catch (e) {
        showToast("Export failed: " + e.message);
    }
});

document.getElementById('importPlansBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
});

document.getElementById('importFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target.result;
            let parsed = null;
            if (file.name.endsWith('.json')) {
                parsed = JSON.parse(content);
            } else if (typeof jsyaml !== 'undefined') {
                parsed = jsyaml.load(content);
            } else {
                parsed = JSON.parse(content);
            }

            if (!Array.isArray(parsed)) {
                throw new Error("File must contain a list of plans.");
            }

            // Ensure unique IDs
            parsed.forEach(p => {
                if (!p.id) p.id = generateId();
                (p.exercises || []).forEach(ex => {
                    if (!ex.id) ex.id = generateId();
                });
            });

            plans = parsed;
            saveState();
            renderDashboard();
            showToast(`Successfully imported ${plans.length} plan(s)!`);
        } catch (err) {
            showToast("Import error: " + err.message);
        }
        e.target.value = '';
    };
    reader.readAsText(file);
});

document.getElementById('editYamlBtn').addEventListener('click', () => {
    if (typeof jsyaml === 'undefined') {
        showToast("YAML library is not loaded.");
        return;
    }
    const yamlStr = jsyaml.dump(plans);
    document.getElementById('yamlEditorTextarea').value = yamlStr;
    document.getElementById('yamlEditorModal').classList.remove('hidden');
});

document.getElementById('cancelYamlBtn').addEventListener('click', () => {
    document.getElementById('yamlEditorModal').classList.add('hidden');
});

document.getElementById('saveYamlBtn').addEventListener('click', () => {
    try {
        const yamlStr = document.getElementById('yamlEditorTextarea').value;
        const parsedPlans = jsyaml.load(yamlStr);
        if (!Array.isArray(parsedPlans)) {
            throw new Error("YAML must represent an array of plans.");
        }
        plans = parsedPlans;
        saveState();
        renderDashboard();
        document.getElementById('yamlEditorModal').classList.add('hidden');
        showToast("Plans updated from YAML!");
    } catch (e) {
        showToast("YAML Error: " + e.message);
    }
});

// --- Pain Level Scale Reference ---
const PAIN_LABELS = {
    0: "0 - None 😊",
    1: "1 - Minimal 😌",
    2: "2 - Very Mild 🙂",
    3: "3 - Mild Ache 😐",
    4: "4 - Noticeable 😕",
    5: "5 - Moderate 😣",
    6: "6 - Uncomfortable 😖",
    7: "7 - Painful 😫",
    8: "8 - Intense 😩",
    9: "9 - Severe 😭",
    10: "10 - Extreme 🚨"
};

const painSlider = document.getElementById('painScoreSlider');
const painDisplay = document.getElementById('painScoreDisplay');
if (painSlider && painDisplay) {
    painSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        painDisplay.textContent = PAIN_LABELS[val] || `${val}`;
        painDisplay.className = `pain-badge pain-lvl-${val}`;
    });
}

let pendingWorkoutStats = null;

function showWorkoutCompleteModal(planId) {
    pendingWorkoutStats = {
        planId: planId,
        timestamp: new Date().toISOString()
    };

    if (painSlider) {
        painSlider.value = 0;
        painDisplay.textContent = PAIN_LABELS[0];
        painDisplay.className = 'pain-badge pain-lvl-0';
    }
    const notesInput = document.getElementById('workoutPainNotes');
    if (notesInput) notesInput.value = '';

    document.getElementById('workoutCompleteModal').classList.remove('hidden');
}

document.getElementById('savePainLogBtn').addEventListener('click', async () => {
    if (!pendingWorkoutStats) return;
    const painVal = painSlider ? parseInt(painSlider.value) : 0;
    const notesVal = document.getElementById('workoutPainNotes')?.value || '';

    try {
        await fetch('/api/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planId: pendingWorkoutStats.planId,
                timestamp: pendingWorkoutStats.timestamp,
                painLevel: painVal,
                notes: notesVal
            })
        });
        showToast("Workout log saved!");
    } catch (e) {
        console.error("Failed to save pain log", e);
    }

    document.getElementById('workoutCompleteModal').classList.add('hidden');
    pendingWorkoutStats = null;
});

document.getElementById('skipPainLogBtn').addEventListener('click', async () => {
    if (!pendingWorkoutStats) return;
    try {
        await fetch('/api/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planId: pendingWorkoutStats.planId,
                timestamp: pendingWorkoutStats.timestamp
            })
        });
    } catch (e) {}

    document.getElementById('workoutCompleteModal').classList.add('hidden');
    pendingWorkoutStats = null;
});

let currentStatsPlanId = null;

window.showStats = async function(planId, event) {
    if (event) event.stopPropagation();
    currentStatsPlanId = planId;
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    try {
        const res = await fetch('/api/stats');
        let stats = {};
        if (res.ok) {
            stats = await res.json();
        }

        calculateStreakAndStats(stats);

        const planStats = stats[planId] || [];
        const content = document.getElementById('statsContent');

        if (planStats.length === 0) {
            content.innerHTML = '<p class="text-muted text-center py-2">No completed workouts recorded for this plan yet.</p>';
        } else {
            // Build pain sparkline chart if pain data exists
            const painRecords = planStats.filter(r => typeof r === 'object' && r.painLevel !== undefined && r.painLevel !== null);
            let chartHtml = '';
            if (painRecords.length > 0) {
                const recentPain = painRecords.slice(-10);
                chartHtml = `
                    <div class="stats-pain-section card mt-2 mb-2">
                        <h4 style="font-size: 0.85rem; margin-bottom: 0.35rem;">🩹 Pain &amp; Discomfort Trend (Last ${recentPain.length} sessions)</h4>
                        <div class="pain-trend-chart">
                            ${recentPain.map(r => {
                                const p = r.painLevel;
                                const heightPct = Math.max(12, Math.round((p / 10) * 100));
                                let color = '#10b981';
                                if (p >= 7) color = '#ef4444';
                                else if (p >= 4) color = '#f97316';
                                else if (p >= 1) color = '#eab308';
                                return `<div class="pain-bar-wrapper" title="Pain: ${p}/10 (${new Date(r.timestamp).toLocaleDateString()})">
                                    <div class="pain-bar" style="height: ${heightPct}%; background: ${color};"></div>
                                    <span style="font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">${p}</span>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            content.innerHTML = chartHtml + '<ul class="stats-list" style="list-style-type: none; padding: 0;">' +
                planStats.slice().reverse().map(item => {
                    const ts = (typeof item === 'object' && item.timestamp) ? item.timestamp : item;
                    const d = new Date(ts);
                    const painVal = (typeof item === 'object' && item.painLevel !== undefined && item.painLevel !== null) ? item.painLevel : null;
                    const notes = (typeof item === 'object' && item.notes) ? item.notes : '';

                    let painBadge = '';
                    if (painVal !== null) {
                        painBadge = `<span class="pain-tag pain-lvl-${painVal}">Pain: ${painVal}/10</span>`;
                    }

                    return `<li style="padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span>${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                ${painBadge}
                            </div>
                            <span style="color: var(--text-muted); font-size: 0.875rem;">${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        ${notes ? `<div class="stats-item-notes">"${notes}"</div>` : ''}
                    </li>`;
                }).join('') + '</ul>';
        }

        document.getElementById('statsModal').classList.remove('hidden');
    } catch (e) {
        console.error("Failed to load stats", e);
        showToast("Failed to load stats");
    }
};

document.getElementById('closeStatsBtn').addEventListener('click', () => {
    document.getElementById('statsModal').classList.add('hidden');
});
document.getElementById('closeStatsModalBtn').addEventListener('click', () => {
    document.getElementById('statsModal').classList.add('hidden');
});
document.getElementById('resetStatsBtn').addEventListener('click', async () => {
    if (!currentStatsPlanId) return;
    if (confirm("Are you sure you want to reset completion stats for this plan?")) {
        try {
            await fetch(`/api/stats/${currentStatsPlanId}`, { method: 'DELETE' });
            showStats(currentStatsPlanId);
            showToast("Stats reset");
            renderDashboard();
        } catch (e) {
            console.error("Failed to reset stats", e);
            showToast("Failed to reset stats");
        }
    }
});

window.deletePlan = function(id, e) {
    if (e) e.stopPropagation();
    if(confirm('Delete this plan?')) {
        plans = plans.filter(p => p.id !== id);
        saveState();
        renderDashboard();
        showToast("Plan deleted");
    }
};

function editPlan(id) {
    currentPlanId = id;
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    document.getElementById('planName').value = plan.name || '';
    document.getElementById('planTransitionTime').value = plan.transitionTime !== undefined ? plan.transitionTime : 5;
    renderExerciseList();
    showView('planEditor');
}

document.getElementById('planName').addEventListener('input', saveCurrentPlan);
document.getElementById('planTransitionTime').addEventListener('input', saveCurrentPlan);

document.getElementById('backToDashboardBtn').addEventListener('click', () => {
    saveCurrentPlan();
    renderDashboard();
    showView('dashboard');
});

document.getElementById('savePlanBtn').addEventListener('click', () => {
    saveCurrentPlan();
    showToast('Plan settings saved!');
});

function saveCurrentPlan() {
    if (!currentPlanId) return;
    const plan = plans.find(p => p.id === currentPlanId);
    if (plan) {
        plan.name = document.getElementById('planName').value;
        const tt = parseInt(document.getElementById('planTransitionTime').value);
        plan.transitionTime = isNaN(tt) ? 5 : tt;
        saveState();
    }
}

window.openExerciseLightbox = function(exerciseId, e) {
    if (e) e.stopPropagation();
    const plan = plans.find(p => p.id === currentPlanId);
    if (!plan) return;
    const exercise = plan.exercises.find(ex => ex.id === exerciseId);
    if (exercise) {
        openLightbox(exercise);
    }
};

window.moveExercise = function(exerciseId, direction, e) {
    if (e) e.stopPropagation();
    const plan = plans.find(p => p.id === currentPlanId);
    if (!plan) return;

    const index = plan.exercises.findIndex(ex => ex.id === exerciseId);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= plan.exercises.length) return;

    const [moved] = plan.exercises.splice(index, 1);
    plan.exercises.splice(newIndex, 0, moved);

    saveState();
    renderExerciseList();
};

window.duplicateExercise = function(exerciseId, e) {
    if (e) e.stopPropagation();
    const plan = plans.find(p => p.id === currentPlanId);
    if (!plan) return;

    const ex = plan.exercises.find(e => e.id === exerciseId);
    if (!ex) return;

    const cloned = JSON.parse(JSON.stringify(ex));
    cloned.id = generateId();
    cloned.name = (cloned.name || 'Exercise') + ' (Copy)';

    const index = plan.exercises.findIndex(e => e.id === exerciseId);
    plan.exercises.splice(index + 1, 0, cloned);

    saveState();
    renderExerciseList();
    showToast("Exercise duplicated");
};

function renderExerciseList() {
    const plan = plans.find(p => p.id === currentPlanId);
    const list = document.getElementById('exerciseList');
    list.innerHTML = '';

    if (!plan || !plan.exercises || plan.exercises.length === 0) {
        list.innerHTML = '<p class="text-muted text-center mt-2">No exercises added yet.</p>';
        return;
    }

    plan.exercises.forEach((ex, index) => {
        let thumbUrl = '';
        if (ex.images && ex.images.length > 0) {
            thumbUrl = `/api/image?url=${encodeURIComponent(ex.images[0])}&planId=${currentPlanId}`;
        } else if (ex.youtubeUrl) {
            const ytId = extractYouTubeID(ex.youtubeUrl);
            if (ytId) {
                thumbUrl = `https://img.youtube.com/vi/${ytId}/default.jpg`;
            }
        }

        const thumbHtml = thumbUrl 
            ? `<div class="exercise-thumb-wrapper" onclick="openExerciseLightbox('${ex.id}', event)" title="Click to view large preview">
                <img src="${thumbUrl}" alt="thumbnail" class="exercise-thumb">
                <span class="thumb-zoom-badge">🔍</span>
               </div>` 
            : `<div class="exercise-thumb-wrapper" onclick="editExercise('${ex.id}')"><div class="exercise-thumb placeholder">No Media</div></div>`;

        const isFirst = index === 0;
        const isLast = index === plan.exercises.length - 1;
        const notesPreview = ex.notes ? `<div class="item-notes-preview">${ex.notes}</div>` : '';
        const sideBadge = ex.bothSides ? `<span class="badge badge-side" style="margin-left: 0.35rem; font-size: 0.7rem; padding: 2px 6px;">2 Sides</span>` : '';

        const div = document.createElement('div');
        div.className = 'exercise-item card';
        div.innerHTML = `
            ${thumbHtml}
            <div class="item-details" onclick="editExercise('${ex.id}')">
                <h4>${index + 1}. ${ex.name || 'Unnamed'}${sideBadge}</h4>
                <p>${ex.sets} sets &bull; ${ex.reps} reps &bull; ${ex.workTime}s work / ${ex.restTime}s rest${ex.restBetweenSets ? ` / ${ex.restBetweenSets}s set rest` : ''}</p>
                ${notesPreview}
            </div>
            <div class="item-actions">
                <button class="btn-reorder" onclick="moveExercise('${ex.id}', -1, event)" ${isFirst ? 'disabled' : ''} title="Move Up">&uarr;</button>
                <button class="btn-reorder" onclick="moveExercise('${ex.id}', 1, event)" ${isLast ? 'disabled' : ''} title="Move Down">&darr;</button>
                <button class="btn btn-secondary btn-sm" onclick="duplicateExercise('${ex.id}', event)" title="Duplicate Exercise">&#10697;</button>
                <button class="btn btn-danger btn-sm" onclick="deleteExercise('${ex.id}', event)" title="Delete Exercise">&times;</button>
            </div>
        `;
        list.appendChild(div);
    });
}

document.getElementById('addExerciseBtn').addEventListener('click', () => {
    currentExerciseId = null;
    document.getElementById('exerciseName').value = '';
    document.getElementById('exerciseNotes').value = '';
    document.getElementById('exerciseSets').value = '1';
    document.getElementById('exerciseReps').value = '10';
    document.getElementById('exerciseWorkTime').value = '30';
    document.getElementById('exerciseRestTime').value = '10';
    document.getElementById('exerciseRestBetweenSets').value = '0';
    document.getElementById('exerciseBothSides').checked = false;
    document.getElementById('exerciseImages').value = '';
    document.getElementById('exerciseYoutube').value = '';
    document.getElementById('exerciseEditorModal').classList.remove('hidden');
});

window.editExercise = function(id) {
    currentExerciseId = id;
    const plan = plans.find(p => p.id === currentPlanId);
    const ex = plan.exercises.find(e => e.id === id);
    if (!ex) return;

    document.getElementById('exerciseName').value = ex.name || '';
    document.getElementById('exerciseNotes').value = ex.notes || '';
    document.getElementById('exerciseSets').value = ex.sets !== undefined ? ex.sets : 1;
    document.getElementById('exerciseReps').value = ex.reps !== undefined ? ex.reps : 10;
    document.getElementById('exerciseWorkTime').value = ex.workTime !== undefined ? ex.workTime : 30;
    document.getElementById('exerciseRestTime').value = ex.restTime !== undefined ? ex.restTime : 10;
    document.getElementById('exerciseRestBetweenSets').value = ex.restBetweenSets || 0;
    document.getElementById('exerciseBothSides').checked = !!ex.bothSides;
    document.getElementById('exerciseImages').value = (ex.images || []).join(', ');
    document.getElementById('exerciseYoutube').value = ex.youtubeUrl || '';

    document.getElementById('exerciseEditorModal').classList.remove('hidden');
};

window.deleteExercise = function(id, e) {
    if (e) e.stopPropagation();
    if(confirm('Delete exercise?')) {
        const plan = plans.find(p => p.id === currentPlanId);
        plan.exercises = plan.exercises.filter(ex => ex.id !== id);
        saveState();
        renderExerciseList();
        showToast("Exercise deleted");
    }
};

document.getElementById('cancelExerciseBtn').addEventListener('click', () => {
    document.getElementById('exerciseEditorModal').classList.add('hidden');
});

document.getElementById('saveExerciseBtn').addEventListener('click', () => {
    const plan = plans.find(p => p.id === currentPlanId);
    if (!plan) return;

    const exData = {
        name: document.getElementById('exerciseName').value.trim() || 'Exercise',
        notes: document.getElementById('exerciseNotes').value.trim(),
        sets: parseInt(document.getElementById('exerciseSets').value) || 1,
        reps: parseInt(document.getElementById('exerciseReps').value) || 10,
        workTime: parseInt(document.getElementById('exerciseWorkTime').value) || 30,
        restTime: parseInt(document.getElementById('exerciseRestTime').value) || 10,
        restBetweenSets: parseInt(document.getElementById('exerciseRestBetweenSets').value) || 0,
        bothSides: document.getElementById('exerciseBothSides').checked,
        images: document.getElementById('exerciseImages').value.split(',').map(s=>s.trim()).filter(s=>s),
        youtubeUrl: document.getElementById('exerciseYoutube').value.trim()
    };

    if (currentExerciseId) {
        const exIndex = plan.exercises.findIndex(e => e.id === currentExerciseId);
        plan.exercises[exIndex] = { ...plan.exercises[exIndex], ...exData };
        showToast("Exercise updated");
    } else {
        plan.exercises.push({ id: generateId(), ...exData });
        showToast("Exercise added");
    }

    saveState();
    renderExerciseList();
    document.getElementById('exerciseEditorModal').classList.add('hidden');
});


// --- Media Logic (YouTube and Images) ---
let ytPlayer = null;
let ytReady = false;
let imageCycleInterval = null;
let currentWorkoutExercise = null;
let currentWorkoutImageIndex = 0;

window.onYouTubeIframeAPIReady = function() {
    ytReady = true;
};

function extractYouTubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function loadMedia(exercise) {
    currentWorkoutExercise = exercise;
    currentWorkoutImageIndex = 0;

    const mediaContainer = document.getElementById('workoutMediaContainer');
    const toggle = document.getElementById('mediaToggle');
    const ytContainer = document.getElementById('youtubeContainer');
    const imgContainer = document.getElementById('imageCycleContainer');
    const workoutImage = document.getElementById('workoutImage');
    const dotsContainer = document.getElementById('imagePaginationDots');

    clearInterval(imageCycleInterval);
    if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
        ytPlayer.stopVideo();
    }

    if (!exercise) {
        mediaContainer.classList.add('hidden');
        return;
    }

    const hasImages = exercise.images && exercise.images.length > 0;
    const ytId = extractYouTubeID(exercise.youtubeUrl);

    if (!hasImages && !ytId) {
        mediaContainer.classList.add('hidden');
        return;
    }

    mediaContainer.classList.remove('hidden');

    if (hasImages && ytId) {
        toggle.classList.remove('hidden');
        showVideo();
    } else {
        toggle.classList.add('hidden');
        if (ytId) showVideo();
        else showImages();
    }

    if (ytId && ytReady) {
        if (!ytPlayer) {
            ytPlayer = new YT.Player('youtubePlayer', {
                height: '100%',
                width: '100%',
                videoId: ytId
            });
        } else {
            if (typeof ytPlayer.cueVideoById === 'function') {
                ytPlayer.cueVideoById(ytId);
            } else {
                ytPlayer.loadVideoById(ytId);
                ytPlayer.pauseVideo();
            }
        }
    }

    if (hasImages) {
        const getImageUrl = (url) => `/api/image?url=${encodeURIComponent(url)}&planId=${currentPlanId}`;
        workoutImage.src = getImageUrl(exercise.images[0]);

        // Render pagination dots
        dotsContainer.innerHTML = '';
        if (exercise.images.length > 1) {
            dotsContainer.classList.remove('hidden');
            exercise.images.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.className = `dot ${idx === 0 ? 'active' : ''}`;
                dotsContainer.appendChild(dot);
            });

            imageCycleInterval = setInterval(() => {
                currentWorkoutImageIndex = (currentWorkoutImageIndex + 1) % exercise.images.length;
                workoutImage.src = getImageUrl(exercise.images[currentWorkoutImageIndex]);
                
                const dots = dotsContainer.querySelectorAll('.dot');
                dots.forEach((d, idx) => {
                    d.classList.toggle('active', idx === currentWorkoutImageIndex);
                });
            }, 3000);
        } else {
            dotsContainer.classList.add('hidden');
        }
    } else {
        dotsContainer.classList.add('hidden');
    }
}

document.getElementById('imageCycleContainer').addEventListener('click', () => {
    if (currentWorkoutExercise) {
        openLightbox(currentWorkoutExercise, currentWorkoutImageIndex);
    }
});

function showImages() {
    document.getElementById('showImageBtn').classList.add('active');
    document.getElementById('showVideoBtn').classList.remove('active');
    document.getElementById('imageCycleContainer').classList.remove('hidden');
    document.getElementById('youtubeContainer').classList.add('hidden');
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
}

function showVideo() {
    document.getElementById('showVideoBtn').classList.add('active');
    document.getElementById('showImageBtn').classList.remove('active');
    document.getElementById('youtubeContainer').classList.remove('hidden');
    document.getElementById('imageCycleContainer').classList.add('hidden');
}

document.getElementById('showImageBtn').addEventListener('click', showImages);
document.getElementById('showVideoBtn').addEventListener('click', showVideo);


// --- Picture-in-Picture (PiP) Floating Timer Generator ---
const pipCanvas = document.getElementById('pipCanvas');
const pipVideo = document.getElementById('pipVideo');
let isPipActive = false;

function drawPipCanvas(step, timeLeft) {
    if (!pipCanvas) return;
    const ctx = pipCanvas.getContext('2d');
    const width = pipCanvas.width;
    const height = pipCanvas.height;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (!step) return;

    // Phase Colors
    let phaseColor = '#3b82f6';
    if (step.phase === 'WORK') phaseColor = '#10b981';
    else if (step.phase === 'REST') phaseColor = '#ef4444';
    else if (step.phase === 'PREPARE') phaseColor = '#f59e0b';

    // Phase Pill Top
    ctx.fillStyle = phaseColor;
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(step.phase, width / 2, 38);

    // Large Countdown Time
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px Inter, system-ui, sans-serif';
    ctx.fillText(timeStr, width / 2, 115);

    // Exercise & Progress Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 18px Inter, system-ui, sans-serif';
    const exName = step.exercise ? step.exercise.name : 'Done';
    const subText = step.exercise ? `${exName} (${step.side ? step.side + ' • ' : ''}Set ${step.setNum}/${step.totalSets})` : 'Workout Complete!';
    ctx.fillText(subText, width / 2, 160);

    // Bottom progress bar
    if (step.duration > 0) {
        const pct = 1 - (timeLeft / step.duration);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(40, 190, width - 80, 8);
        ctx.fillStyle = phaseColor;
        ctx.fillRect(40, 190, (width - 80) * pct, 8);
    }
}

async function togglePictureInPicture() {
    if (!pipCanvas || !pipVideo) {
        showToast("Picture-in-Picture not supported on this device.");
        return;
    }

    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            if (workoutEngine) {
                const step = workoutEngine.sequence[workoutEngine.currentIndex];
                drawPipCanvas(step, workoutEngine.timeLeft);
            }
            if (!pipVideo.srcObject) {
                pipVideo.srcObject = pipCanvas.captureStream(10);
            }
            await pipVideo.play();
            await pipVideo.requestPictureInPicture();
            showToast("Floating Timer active!");
        }
    } catch (e) {
        console.error("Picture-in-Picture failed", e);
        showToast("PiP failed: " + e.message);
    }
}

document.getElementById('workoutPipBtn').addEventListener('click', togglePictureInPicture);


// --- Hands-Free Voice Commands System ---
let speechRecognizer = null;
let isVoiceListening = false;

function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        return null;
    }

    const recognizer = new SpeechRecognition();
    recognizer.continuous = true;
    recognizer.interimResults = false;
    recognizer.lang = 'en-US';

    recognizer.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
            const transcript = lastResult[0].transcript.trim().toLowerCase();
            handleVoiceCommand(transcript);
        }
    };

    recognizer.onerror = (event) => {
        console.log("Speech recognition error:", event.error);
    };

    recognizer.onend = () => {
        if (isVoiceListening) {
            try {
                recognizer.start();
            } catch (e) {}
        }
    };

    return recognizer;
}

function handleVoiceCommand(command) {
    if (!workoutEngine) return;

    if (command.includes('pause') || command.includes('stop') || command.includes('wait') || command.includes('freeze')) {
        workoutEngine.pause();
        showToast("🎙️ Voice: Paused");
    } else if (command.includes('resume') || command.includes('play') || command.includes('go') || command.includes('continue') || command.includes('start')) {
        workoutEngine.start();
        showToast("🎙️ Voice: Resumed");
    } else if (command.includes('next') || command.includes('forward')) {
        workoutEngine.nextStep();
        showToast("🎙️ Voice: Next Step");
    } else if (command.includes('previous') || command.includes('back') || command.includes('repeat')) {
        workoutEngine.prevStep();
        showToast("🎙️ Voice: Previous Step");
    } else if (command.includes('skip') || command.includes('skip exercise')) {
        workoutEngine.skipExercise();
        showToast("🎙️ Voice: Skipped Exercise");
    }
}

function toggleVoiceCommands() {
    const voiceBtn = document.getElementById('workoutVoiceCmdBtn');
    const voiceHud = document.getElementById('voiceHudPill');

    if (!speechRecognizer) {
        speechRecognizer = initVoiceRecognition();
    }

    if (!speechRecognizer) {
        showToast("Speech recognition not supported in this browser.");
        return;
    }

    if (isVoiceListening) {
        isVoiceListening = false;
        try { speechRecognizer.stop(); } catch (e) {}
        voiceBtn.style.color = '';
        voiceHud.classList.add('hidden');
        showToast("Voice control stopped");
    } else {
        try {
            isVoiceListening = true;
            speechRecognizer.start();
            voiceBtn.style.color = '#3b82f6';
            voiceHud.classList.remove('hidden');
            showToast("🎙️ Voice control active! (Say: Pause, Resume, Next, Skip)");
        } catch (e) {
            console.error("Speech recognition start failed", e);
            isVoiceListening = false;
            showToast("Microphone permission required for voice control.");
        }
    }
}

document.getElementById('workoutVoiceCmdBtn').addEventListener('click', toggleVoiceCommands);


// --- Core Interval Timer Logic ---
let workoutEngine = null;
const alarmAudio = document.getElementById('alarm');
let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Screen Wake Lock released:', wakeLock.released);
            });
        }
    } catch (err) {
        console.error(`Wake Lock error: ${err.name}, ${err.message}`);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => {
            wakeLock = null;
        });
    }
}

document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(err => {
            console.error('ServiceWorker registration failed: ', err);
        });
    });
}

class WorkoutEngine {
    constructor(plan) {
        this.plan = plan;
        this.sequence = [];
        this.currentIndex = 0;
        this.timeLeft = 0;
        this.timerId = null;
        this.isRunning = false;

        this.buildSequence();
        this.initDOM();
        requestWakeLock();
    }

    buildSequence() {
        this.sequence = [];
        const totalExercises = (this.plan.exercises || []).length;

        (this.plan.exercises || []).forEach((ex, exIndex) => {
            const prepDuration = this.plan.transitionTime !== undefined ? this.plan.transitionTime : 5;
            const sides = ex.bothSides ? ['LEFT', 'RIGHT'] : [null];

            for (let s = 1; s <= ex.sets; s++) {
                const isFirstSetOfExercise = (s === 1);

                sides.forEach((side, sideIdx) => {
                    let phaseDuration = 0;
                    if (isFirstSetOfExercise && sideIdx === 0) {
                        phaseDuration = prepDuration;
                    } else if (sideIdx > 0) {
                        phaseDuration = 4; // Switch side transition
                    } else {
                        phaseDuration = (ex.restBetweenSets || 0);
                    }

                    if (phaseDuration > 0) {
                        this.sequence.push({
                            phase: 'PREPARE',
                            duration: phaseDuration,
                            exercise: ex,
                            exIndex: exIndex + 1,
                            totalExercises: totalExercises,
                            setNum: s,
                            totalSets: ex.sets,
                            repNum: 1,
                            totalReps: ex.reps,
                            side: side
                        });
                    }

                    for (let r = 1; r <= ex.reps; r++) {
                        this.sequence.push({
                            phase: 'WORK',
                            duration: ex.workTime,
                            exercise: ex,
                            exIndex: exIndex + 1,
                            totalExercises: totalExercises,
                            setNum: s,
                            totalSets: ex.sets,
                            repNum: r,
                            totalReps: ex.reps,
                            side: side
                        });

                        if (ex.restTime > 0 && r < ex.reps) {
                            this.sequence.push({
                                phase: 'REST',
                                duration: ex.restTime,
                                exercise: ex,
                                exIndex: exIndex + 1,
                                totalExercises: totalExercises,
                                setNum: s,
                                totalSets: ex.sets,
                                repNum: r,
                                totalReps: ex.reps,
                                side: side
                            });
                        }
                    }
                });
            }
        });

        // Final Done phase
        this.sequence.push({
            phase: 'DONE',
            duration: 0,
            exercise: null,
            exIndex: totalExercises,
            totalExercises: totalExercises,
            setNum: 0,
            totalSets: 0,
            repNum: 0,
            totalReps: 0,
            side: null
        });
    }

    speak(text) {
        if (appSettings.voicePrompts === 'off') return;

        fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        })
        .then(res => {
            if (!res.ok) throw new Error('TTS proxy failed');
            return res.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.playbackRate = appSettings.voiceSpeed || 1.1;
            audio.play();
            audio.onended = () => URL.revokeObjectURL(url);
        })
        .catch(e => {
            console.error("Custom TTS failed, falling back to window.speechSynthesis", e);
            this.fallbackSpeak(text);
        });
    }

    fallbackSpeak(text) {
        if (appSettings.voicePrompts === 'off') return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = appSettings.voiceSpeed || 1.1;
            window.speechSynthesis.speak(utterance);
        }
    }

    initDOM() {
        this.displayTimer = document.getElementById('timerDisplay');
        this.displayPhase = document.getElementById('phaseDisplay');
        this.displayPlanName = document.getElementById('workoutPlanName');
        this.displayExerciseName = document.getElementById('workoutExerciseName');
        this.displayExerciseNotes = document.getElementById('workoutExerciseNotes');
        this.displayProgress = document.getElementById('workoutProgress');
        this.sideBadge = document.getElementById('workoutSideBadge');
        this.exerciseCounter = document.getElementById('workoutExerciseCounter');
        this.progressBar = document.getElementById('workoutProgressBar');
        this.timerRing = document.getElementById('timerRingProgress');
        this.playPauseBtn = document.getElementById('playPauseBtn');

        this.displayPlanName.textContent = this.plan.name || 'Workout';
        this.loadCurrentStep();
    }

    updateOverallProgress() {
        const totalSteps = Math.max(1, this.sequence.length - 1);
        const progressPct = Math.min(100, Math.round((this.currentIndex / totalSteps) * 100));
        if (this.progressBar) {
            this.progressBar.style.width = `${progressPct}%`;
        }
    }

    loadCurrentStep() {
        const step = this.sequence[this.currentIndex];
        this.timeLeft = step.duration;

        triggerHaptic([150, 80, 150]);

        // Audio Announcements based on settings
        if (step.phase === 'WORK') {
            this.speak('Go');
        } else if (step.phase === 'REST') {
            this.speak('Rest');
        } else if (step.phase === 'PREPARE') {
            if (step.exercise) {
                if (appSettings.voicePrompts === 'minimal') {
                    if (step.side) {
                        this.speak(step.side === 'LEFT' ? 'Left side' : 'Right side');
                    } else {
                        this.speak('Get ready');
                    }
                } else {
                    if (step.side === 'RIGHT') {
                        this.speak('Switch sides, Right side');
                    } else if (step.setNum === 1) {
                        let prompt = `Next exercise, ${step.exercise.name}. `;
                        if (step.side) prompt += `${step.side} side first. `;
                        if (step.exercise.notes) prompt += `${step.exercise.notes}. `;
                        prompt += `${step.exercise.sets} sets of ${step.exercise.reps} reps. `;
                        prompt += `Work for ${step.exercise.workTime} seconds.`;
                        this.speak(prompt);
                    } else {
                        let prompt = `Set ${step.setNum}`;
                        if (step.side) prompt += `, ${step.side} side`;
                        this.speak(prompt);
                    }
                }
            }
        } else if (step.phase === 'DONE') {
            this.speak('Workout complete! Great job!');
            if (this.plan && this.plan.id) {
                showWorkoutCompleteModal(this.plan.id);
            }
        }

        // Update UI Elements
        this.displayPhase.textContent = step.phase;
        this.displayPhase.className = `phase-label phase-${step.phase.toLowerCase()}`;
        this.displayTimer.className = `display phase-${step.phase.toLowerCase()}`;

        if (this.sideBadge) {
            if (step.side) {
                this.sideBadge.textContent = `${step.side} SIDE`;
                this.sideBadge.classList.remove('hidden');
            } else {
                this.sideBadge.classList.add('hidden');
            }
        }

        if (step.exercise) {
            this.displayExerciseName.textContent = step.exercise.name || 'Unnamed Exercise';
            this.displayExerciseNotes.textContent = step.exercise.notes ? `Notes: ${step.exercise.notes}` : '';
            this.displayProgress.textContent = `Set ${step.setNum} of ${step.totalSets}  |  Rep ${step.repNum} of ${step.totalReps}`;
            if (this.exerciseCounter) {
                this.exerciseCounter.textContent = `Exercise ${step.exIndex} of ${step.totalExercises}`;
            }

            if (this.currentIndex === 0 || this.sequence[this.currentIndex - 1].exercise?.id !== step.exercise.id) {
                loadMedia(step.exercise);
            }
        } else {
            this.displayExerciseName.textContent = 'Workout Complete!';
            this.displayExerciseNotes.textContent = '';
            this.displayProgress.textContent = '';
            if (this.sideBadge) this.sideBadge.classList.add('hidden');
            if (this.exerciseCounter) this.exerciseCounter.textContent = 'Done';
            document.getElementById('workoutMediaContainer').classList.add('hidden');
        }

        this.updateOverallProgress();
        this.updateTimeDisplay();
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    updateTimeDisplay() {
        const step = this.sequence[this.currentIndex];
        this.displayTimer.textContent = this.formatTime(this.timeLeft);

        // Update Circular SVG Timer Ring
        if (this.timerRing) {
            const circumference = 596.9; // 2 * PI * 95
            const fraction = (step && step.duration > 0) ? (this.timeLeft / step.duration) : 0;
            const offset = circumference * (1 - fraction);
            this.timerRing.style.strokeDashoffset = offset.toFixed(1);
            this.timerRing.className = `timer-ring-progress phase-${step ? step.phase.toLowerCase() : 'done'}-stroke`;
        }

        // Update Picture-in-Picture Canvas Stream
        drawPipCanvas(step, this.timeLeft);
    }

    playBeep() {
        if (!appSettings.soundBeeps) return;
        try {
            alarmAudio.currentTime = 0;
            alarmAudio.play().catch(e => console.log('Audio play failed:', e));
        } catch(e) {}
    }

    start() {
        if (this.isRunning) return;
        const step = this.sequence[this.currentIndex];
        if (step.phase === 'DONE') return;

        this.isRunning = true;
        this.playPauseBtn.innerHTML = '&#10074;&#10074;';
        this.playPauseBtn.title = 'Pause (Spacebar)';

        this.timerId = setInterval(() => {
            this.timeLeft--;
            this.updateTimeDisplay();

            if (this.timeLeft === 3) {
                this.speak('3');
                triggerHaptic([80]);
            } else if (this.timeLeft === 2) {
                this.speak('2');
                triggerHaptic([80]);
            } else if (this.timeLeft === 1) {
                this.speak('1');
                triggerHaptic([80]);
            }

            if (this.timeLeft <= 0) {
                this.playBeep();
                this.nextStep();
            }
        }, 1000);
    }

    pause() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.timerId);
        this.playPauseBtn.innerHTML = '&#9658;';
        this.playPauseBtn.title = 'Play (Spacebar)';
    }

    togglePlayPause() {
        if (this.isRunning) this.pause();
        else this.start();
    }

    nextStep() {
        this.pause();
        if (this.currentIndex < this.sequence.length - 1) {
            this.currentIndex++;
            this.loadCurrentStep();
            if (this.sequence[this.currentIndex].phase !== 'DONE') {
                this.start();
            }
        }
    }

    prevStep() {
        this.pause();
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.loadCurrentStep();
        }
    }

    skipExercise() {
        const currentStep = this.sequence[this.currentIndex];
        if (!currentStep || currentStep.phase === 'DONE') return;

        const currentExId = currentStep.exercise?.id;
        let nextExIndex = this.sequence.findIndex((st, idx) => idx > this.currentIndex && (st.exercise?.id !== currentExId || st.phase === 'DONE'));

        if (nextExIndex !== -1) {
            this.pause();
            this.currentIndex = nextExIndex;
            this.loadCurrentStep();
            if (this.sequence[this.currentIndex].phase !== 'DONE') {
                this.start();
            }
        }
    }

    stop() {
        this.pause();
        releaseWakeLock();
    }
}

document.getElementById('startPlanBtn').addEventListener('click', () => {
    const plan = plans.find(p => p.id === currentPlanId);
    if (!plan || !plan.exercises || plan.exercises.length === 0) {
        showToast("Please add at least one exercise first!");
        return;
    }

    workoutEngine = new WorkoutEngine(plan);
    showView('workout');
});

document.getElementById('exitWorkoutBtn').addEventListener('click', () => {
    if (workoutEngine) workoutEngine.stop();
    clearInterval(imageCycleInterval);
    if (ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
    showView('planEditor');
});

document.getElementById('playPauseBtn').addEventListener('click', () => {
    if (workoutEngine) workoutEngine.togglePlayPause();
});

document.getElementById('nextPhaseBtn').addEventListener('click', () => {
    if (workoutEngine) workoutEngine.nextStep();
});

document.getElementById('prevPhaseBtn').addEventListener('click', () => {
    if (workoutEngine) workoutEngine.prevStep();
});

document.getElementById('skipExerciseBtn').addEventListener('click', () => {
    if (workoutEngine) workoutEngine.skipExercise();
});

// Fullscreen Toggle
document.getElementById('workoutFullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
    } else {
        document.exitFullscreen().catch(err => console.log('Exit fullscreen error:', err));
    }
});

// --- Modal Dismissal on Backdrop Click ---
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            if (modal.id === 'mediaLightboxModal') {
                closeLightbox();
            }
        }
    });
});

// --- Global Keyboard Shortcuts ---
document.addEventListener('keydown', (e) => {
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    const lightboxModal = document.getElementById('mediaLightboxModal');
    const isLightboxOpen = lightboxModal && !lightboxModal.classList.contains('hidden');

    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        closeLightbox();
        return;
    }

    if (isLightboxOpen) {
        if (e.key === 'ArrowRight') {
            lightboxNext();
        } else if (e.key === 'ArrowLeft') {
            lightboxPrev();
        }
        return;
    }

    if (isInput) return;

    const workoutView = document.getElementById('workoutView');
    const isWorkoutOpen = workoutView && !workoutView.classList.contains('hidden');
    if (isWorkoutOpen && workoutEngine) {
        if (e.code === 'Space') {
            e.preventDefault();
            workoutEngine.togglePlayPause();
        } else if (e.key === 'ArrowRight') {
            workoutEngine.nextStep();
        } else if (e.key === 'ArrowLeft') {
            workoutEngine.prevStep();
        }
    }
});

// Initial Load
loadState();

