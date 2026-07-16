// State Management
let plans = JSON.parse(localStorage.getItem('intervalTimerPlans')) || [];
let currentPlanId = null;
let currentExerciseId = null;

// DOM Elements
const views = {
    dashboard: document.getElementById('dashboardView'),
    planEditor: document.getElementById('planEditorView'),
    workout: document.getElementById('workoutView')
};

// --- Helper Functions ---
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function saveState() {
    localStorage.setItem('intervalTimerPlans', JSON.stringify(plans));
}

function showView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}

// --- Navigation & UI ---

function renderDashboard() {
    const list = document.getElementById('planList');
    list.innerHTML = '';

    if (plans.length === 0) {
        list.innerHTML = '<p class="text-muted text-center mt-2">No plans yet. Create one!</p>';
        return;
    }

    plans.forEach(plan => {
        const div = document.createElement('div');
        div.className = 'plan-item card';
        div.innerHTML = `
            <div class="item-details" onclick="editPlan('${plan.id}')">
                <h3>${plan.name || 'Untitled Plan'}</h3>
                <p>${plan.exercises.length} exercises</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-danger btn-sm" onclick="deletePlan('${plan.id}', event)">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

document.getElementById('createNewPlanBtn').addEventListener('click', () => {
    const newPlan = { id: generateId(), name: '', exercises: [] };
    plans.push(newPlan);
    saveState();
    editPlan(newPlan.id);
});

window.deletePlan = function(id, e) {
    e.stopPropagation();
    if(confirm('Delete this plan?')) {
        plans = plans.filter(p => p.id !== id);
        saveState();
        renderDashboard();
    }
}

function editPlan(id) {
    currentPlanId = id;
    const plan = plans.find(p => p.id === id);
    document.getElementById('planName').value = plan.name;
    renderExerciseList();
    showView('planEditor');
}

document.getElementById('backToDashboardBtn').addEventListener('click', () => {
    saveCurrentPlan();
    renderDashboard();
    showView('dashboard');
});

document.getElementById('savePlanBtn').addEventListener('click', () => {
    saveCurrentPlan();
    alert('Plan saved!');
});

function saveCurrentPlan() {
    if (!currentPlanId) return;
    const plan = plans.find(p => p.id === currentPlanId);
    if (plan) {
        plan.name = document.getElementById('planName').value;
        saveState();
    }
}

function renderExerciseList() {
    const plan = plans.find(p => p.id === currentPlanId);
    const list = document.getElementById('exerciseList');
    list.innerHTML = '';

    if (plan.exercises.length === 0) {
        list.innerHTML = '<p class="text-muted text-center mt-2">No exercises added yet.</p>';
        return;
    }

    plan.exercises.forEach((ex, index) => {
        const div = document.createElement('div');
        div.className = 'exercise-item card';
        div.innerHTML = `
            <div class="item-details" onclick="editExercise('${ex.id}')">
                <h4>${index + 1}. ${ex.name || 'Unnamed'}</h4>
                <p>${ex.sets} sets | ${ex.workTime}s work / ${ex.restTime}s rest</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteExercise('${ex.id}', event)">X</button>
            </div>
        `;
        list.appendChild(div);
    });
}

document.getElementById('addExerciseBtn').addEventListener('click', () => {
    currentExerciseId = null; // New exercise
    document.getElementById('exerciseName').value = '';
    document.getElementById('exerciseNotes').value = '';
    document.getElementById('exerciseSets').value = '1';
    document.getElementById('exerciseReps').value = '10';
    document.getElementById('exerciseWorkTime').value = '30';
    document.getElementById('exerciseRestTime').value = '10';
    document.getElementById('exerciseImages').value = '';
    document.getElementById('exerciseYoutube').value = '';
    document.getElementById('exerciseEditorModal').classList.remove('hidden');
});

window.editExercise = function(id) {
    currentExerciseId = id;
    const plan = plans.find(p => p.id === currentPlanId);
    const ex = plan.exercises.find(e => e.id === id);

    document.getElementById('exerciseName').value = ex.name;
    document.getElementById('exerciseNotes').value = ex.notes || '';
    document.getElementById('exerciseSets').value = ex.sets;
    document.getElementById('exerciseReps').value = ex.reps;
    document.getElementById('exerciseWorkTime').value = ex.workTime;
    document.getElementById('exerciseRestTime').value = ex.restTime;
    document.getElementById('exerciseImages').value = (ex.images || []).join(', ');
    document.getElementById('exerciseYoutube').value = ex.youtubeUrl || '';

    document.getElementById('exerciseEditorModal').classList.remove('hidden');
}

window.deleteExercise = function(id, e) {
    e.stopPropagation();
    if(confirm('Delete exercise?')) {
        const plan = plans.find(p => p.id === currentPlanId);
        plan.exercises = plan.exercises.filter(ex => ex.id !== id);
        saveState();
        renderExerciseList();
    }
}

document.getElementById('cancelExerciseBtn').addEventListener('click', () => {
    document.getElementById('exerciseEditorModal').classList.add('hidden');
});

document.getElementById('saveExerciseBtn').addEventListener('click', () => {
    const plan = plans.find(p => p.id === currentPlanId);

    const exData = {
        name: document.getElementById('exerciseName').value,
        notes: document.getElementById('exerciseNotes').value,
        sets: parseInt(document.getElementById('exerciseSets').value) || 1,
        reps: parseInt(document.getElementById('exerciseReps').value) || 10,
        workTime: parseInt(document.getElementById('exerciseWorkTime').value) || 30,
        restTime: parseInt(document.getElementById('exerciseRestTime').value) || 10,
        images: document.getElementById('exerciseImages').value.split(',').map(s=>s.trim()).filter(s=>s),
        youtubeUrl: document.getElementById('exerciseYoutube').value.trim()
    };

    if (currentExerciseId) {
        // Update
        const exIndex = plan.exercises.findIndex(e => e.id === currentExerciseId);
        plan.exercises[exIndex] = { ...plan.exercises[exIndex], ...exData };
    } else {
        // Create
        plan.exercises.push({ id: generateId(), ...exData });
    }

    saveState();
    renderExerciseList();
    document.getElementById('exerciseEditorModal').classList.add('hidden');
});

// --- Media Logic (YouTube and Images) ---
let ytPlayer = null;
let ytReady = false;
let imageCycleInterval = null;

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
    const mediaContainer = document.getElementById('workoutMediaContainer');
    const toggle = document.getElementById('mediaToggle');
    const ytContainer = document.getElementById('youtubeContainer');
    const imgContainer = document.getElementById('imageCycleContainer');
    const workoutImage = document.getElementById('workoutImage');

    clearInterval(imageCycleInterval);
    if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
        ytPlayer.stopVideo();
    }

    if (!exercise) return;

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
            ytPlayer.loadVideoById(ytId);
            ytPlayer.pauseVideo();
        }
    }

    if (hasImages) {
        workoutImage.src = exercise.images[0];
        if (exercise.images.length > 1) {
            let imgIndex = 0;
            imageCycleInterval = setInterval(() => {
                imgIndex = (imgIndex + 1) % exercise.images.length;
                workoutImage.src = exercise.images[imgIndex];
            }, 3000);
        }
    }
}

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


// --- Core Interval Timer Logic ---
let workoutEngine = null;
const alarmAudio = document.getElementById('alarm');

class WorkoutEngine {
    constructor(plan) {
        this.plan = plan;
        this.sequence = []; // array of { phase, duration, exercise, setNum, totalSets }
        this.currentIndex = 0;
        this.timeLeft = 0;
        this.timerId = null;
        this.isRunning = false;

        this.buildSequence();
        this.initDOM();
    }

    buildSequence() {
        this.sequence = [];
        this.plan.exercises.forEach((ex, exIndex) => {
            // Prepare phase before each exercise
            this.sequence.push({
                phase: 'PREPARE',
                duration: 5, // fixed 5 second prep
                exercise: ex,
                setNum: 1,
                totalSets: ex.sets
            });

            for (let s = 1; s <= ex.sets; s++) {
                this.sequence.push({
                    phase: 'WORK',
                    duration: ex.workTime,
                    exercise: ex,
                    setNum: s,
                    totalSets: ex.sets
                });

                // Add rest phase if it's not the last set, OR if it's not the last exercise
                if (ex.restTime > 0 && (s < ex.sets || exIndex < this.plan.exercises.length - 1)) {
                    this.sequence.push({
                        phase: 'REST',
                        duration: ex.restTime,
                        exercise: ex,
                        setNum: s,
                        totalSets: ex.sets
                    });
                }
            }
        });

        // Add final Done phase
        this.sequence.push({
            phase: 'DONE',
            duration: 0,
            exercise: null,
            setNum: 0,
            totalSets: 0
        });
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1;
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
        this.playPauseBtn = document.getElementById('playPauseBtn');
        
        this.displayPlanName.textContent = this.plan.name || 'Workout';
        this.loadCurrentStep();
    }

    loadCurrentStep() {
        const step = this.sequence[this.currentIndex];
        this.timeLeft = step.duration;

        // Announce phase
        if (step.phase === 'WORK') {
            this.speak('Go');
        } else if (step.phase === 'REST') {
            this.speak('Rest');
        } else if (step.phase === 'PREPARE') {
            if (step.exercise) {
                this.speak(`Next exercise, ${step.exercise.name}`);
            }
        } else if (step.phase === 'DONE') {
            this.speak('Workout complete! Great job!');
        }

        // Update UI Text
        this.displayPhase.textContent = step.phase;
        this.displayPhase.className = `phase-label phase-${step.phase.toLowerCase()}`;
        this.displayTimer.className = `display phase-${step.phase.toLowerCase()}`;
        
        if (step.exercise) {
            this.displayExerciseName.textContent = step.exercise.name || 'Unnamed Exercise';
            this.displayExerciseNotes.textContent = step.exercise.notes ? `Notes: ${step.exercise.notes}` : '';
            this.displayProgress.textContent = `Set ${step.setNum} of ${step.totalSets}  |  Reps: ${step.exercise.reps}`;

            // Only load media if we shifted to a new exercise step
            // to avoid reloading youtube iframe constantly on set changes
            if (this.currentIndex === 0 || this.sequence[this.currentIndex - 1].exercise?.id !== step.exercise.id) {
                loadMedia(step.exercise);
            }
        } else {
            this.displayExerciseName.textContent = 'Workout Complete!';
            this.displayExerciseNotes.textContent = '';
            this.displayProgress.textContent = '';
            document.getElementById('workoutMediaContainer').classList.add('hidden');
        }
        
        this.updateTimeDisplay();
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    updateTimeDisplay() {
        this.displayTimer.textContent = this.formatTime(this.timeLeft);
    }

    playBeep() {
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
        this.playPauseBtn.textContent = 'Pause';
        
        this.timerId = setInterval(() => {
            this.timeLeft--;
            this.updateTimeDisplay();

            if (this.timeLeft === 3) {
                this.speak('3');
            } else if (this.timeLeft === 2) {
                this.speak('2');
            } else if (this.timeLeft === 1) {
                this.speak('1');
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
        this.playPauseBtn.textContent = 'Play';
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
                this.start(); // Auto-continue
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

    stop() {
        this.pause();
    }
}

document.getElementById('startPlanBtn').addEventListener('click', () => {
    const plan = plans.find(p => p.id === currentPlanId);
    if (!plan || plan.exercises.length === 0) {
        alert("Add some exercises first!");
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

// Initial Render
renderDashboard();
