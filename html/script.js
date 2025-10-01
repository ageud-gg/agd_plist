let gradeColors = [];

minInput = document.getElementById('minGrade');
maxInput = document.getElementById('maxGrade');
nameInput = document.getElementById('gradeName');
colorInput = document.getElementById('color');

let gradeList, gradePreview;

document.addEventListener("DOMContentLoaded", () => {
    gradeList = document.getElementById('gradeColorsList');
    gradePreview = document.getElementById('gradePreview');
});

// ========================
// Player List Overlay Elements
// ========================
const playerOverlay = document.getElementById("playerListOverlay");
const playerOverlayHeader = document.getElementById("playerListHeader");
const playerOverlayContent = document.getElementById("playerListContent");
const playerOverlayCheckbox = document.getElementById("playerListCheckbox");

// ========================
// NUI Event Listener
// ========================
window.addEventListener('message', (event) => {
    const msg = event.data;

    if (msg.action === 'open') {
        const menu = document.getElementById('menu');
        menu.style.display = 'flex';

        // Default to settings tab
        document.getElementById('settings').style.display = 'block';
        document.getElementById('bossPage').style.display = 'none';

        const bossBtn = document.querySelector('.tab-btn.boss');
        bossBtn.style.display = msg.isBoss ? 'block' : 'none';

        // Apply saved settings
        document.getElementById('opacitySlider').value = msg.opacity || 100;
        document.getElementById('sizeSlider').value = msg.size || 1;
        playerOverlayCheckbox.checked = msg.policeListEnabled || false;
        document.getElementById('callsignInput').value = msg.callsign || '';
		
        const opacity = event.data.opacity || 100;
        const size = event.data.size || 1;
        applyOverlaySettings(opacity, size);
		
		fetchGrades();
		fetchPlayerList();
		
        if (msg.isBoss) {
			fetchGrades(); // must run here
		}
        if (playerOverlayCheckbox.checked) fetchPlayerList();
    }

	if (msg.action === "updateGrades") {
		gradeColors = msg.grades || [];
		renderGradeColors();
	}
	
	if (event.data.action === "refreshPlayerList") {
		const players = event.data.players;
		players.forEach(p => {
			const gradeObj = gradeColors.find(g => {
				const min = Math.min(g.grade_min, g.grade_max);
				const max = Math.max(g.grade_min, g.grade_max);
				return p.gradeNum >= min && p.gradeNum <= max;
			});
			p.gradeName = gradeObj ? gradeObj.grade_name : "Unknown";
		});

		renderPlayerList(players);
    }

    if (msg.action === "updatePlayerList") {
        renderPlayerList(msg.players || []);
    }

    if (msg.action === 'close') {
        document.getElementById('menu').style.display = 'none';
    }
});

// ========================
// Fetch Player List
// ========================
function fetchPlayerList() {
    fetch(`https://${GetParentResourceName()}/requestPlayerList`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: '{}'
    });
}

// ========================
// Render Player List
// ========================

const overlay = document.getElementById("playerListOverlay");
const overlayContent = document.getElementById("playerListContent");
const overlayHeader = document.getElementById("playerListHeader");
const checkbox = document.getElementById("playerListCheckbox");

// Store expanded/collapsed state
const categoryState = {};

function renderPlayerList(players) {
    overlayContent.innerHTML = ""; // clear previous

    if (!gradeColors || gradeColors.length === 0) {
        setTimeout(() => renderPlayerList(players), 50);
        return;
    }

	players.forEach(p => {
		const playerLevel = p.gradeNum; // use the numeric level
		const gradeLabel = p.grade; // use the numeric level
		
		const gradeObj = gradeColors.find(g => {
			const min = Math.min(g.grade_min, g.grade_max);
			const max = Math.max(g.grade_min, g.grade_max);
			return playerLevel >= min && playerLevel <= max;
		});

		p.gradeName = gradeObj ? gradeObj.grade_name : "Unknown";
	});

    // Group players by gradeName
    const categories = {};
    players.forEach(p => {
        if (!categories[p.gradeName]) categories[p.gradeName] = [];
        categories[p.gradeName].push(p);
    });

    Object.keys(categories).forEach(gradeName => {
        const catDiv = document.createElement("div");
        catDiv.className = "category-title";
        catDiv.textContent = `${gradeName}`;
        catDiv.style.cursor = "pointer";

        // Collapse / expand toggle
        if (categoryState[gradeName] === undefined) categoryState[gradeName] = true;
		const isExpanded = categoryState[gradeName];
		if (!isExpanded) catDiv.classList.add("collapsed");
		else catDiv.classList.remove("collapsed");
		
		catDiv.addEventListener("click", () => {
			categoryState[gradeName] = !categoryState[gradeName];
			renderPlayerList(players);
		});
        overlayContent.appendChild(catDiv);

        // Player entries
		if (isExpanded) {
			categories[gradeName].forEach(p => {
				const div = document.createElement("div");
				div.className = "player-entry";

				// Use the color of the grade for this player
				const gradeObj = gradeColors.find(g => {
					const min = Math.min(g.grade_min, g.grade_max);
					const max = Math.max(g.grade_min, g.grade_max);
					return p.gradeNum >= min && p.gradeNum <= max;
				});

				// Callsign pill
				let callsignSpan = null;
				if (p.callsign) {
					callsignSpan = document.createElement("span");
					callsignSpan.textContent = p.callsign;
					callsignSpan.style.backgroundColor = gradeObj ? gradeObj.color : "#888";
					callsignSpan.style.color = "#fff";
					callsignSpan.style.padding = "2px 8px";
					callsignSpan.style.borderRadius = "12px";
					callsignSpan.style.marginRight = "6px";
					callsignSpan.style.fontSize = "12px";
					callsignSpan.style.fontWeight = "600";
					callsignSpan.style.display = "inline-block";
				}

				// Player name span
				const nameSpan = document.createElement("span");
				nameSpan.textContent = `${p.firstname} ${p.lastname} (${p.grade})`;

				// Clear previous content
				div.innerHTML = "";

				// Append pill and name
				if (callsignSpan) div.appendChild(callsignSpan);
				div.appendChild(nameSpan);

				overlayContent.appendChild(div);
			});
		}
    });
}

function applyOverlaySettings(opacity, size) {
    const overlay = document.getElementById('playerListOverlay');
    const alpha = opacity / 100;
    overlay.style.transform = `translate(-50%, -50%) scale(${size})`;
    overlay.style.backgroundColor = `rgba(20, 20, 20, ${alpha})`;
    overlay.style.boxShadow = `0 0 25px rgba(0,0,0,${0.6 * alpha})`;
}

// Update overlay when sliders change
document.getElementById('opacitySlider').addEventListener('input', () => {
    const opacity = document.getElementById('opacitySlider').value;
    const size = document.getElementById('sizeSlider').value;
    applyOverlaySettings(opacity, size);
});

document.getElementById('sizeSlider').addEventListener('input', () => {
    const opacity = document.getElementById('opacitySlider').value;
    const size = document.getElementById('sizeSlider').value;
    applyOverlaySettings(opacity, size);
});

// ========================
// Toggle Overlay
// ========================
checkbox.addEventListener("change", (e) => {
    overlay.style.display = e.target.checked ? "block" : "none";
    if (e.target.checked) {
        fetchPlayerList();
    }
});

// ========================
// Draggable Overlay
// ========================
// Reset list position button
document.getElementById("resetListPosBtn").addEventListener("click", () => {
    // Reset overlay to center
    pos.x = window.innerWidth / 2;
    pos.y = window.innerHeight / 2;
    updateOverlayPosition();
});

let isDragging = false;
let pos = { x: window.innerWidth/2, y: window.innerHeight/2 };
let offset = { x: 0, y: 0 };
let scale = 1;

// Initialize overlay center
function updateOverlayPosition() {
    overlay.style.left = `${pos.x}px`;
    overlay.style.top = `${pos.y}px`;
    overlay.style.transform = `translate(-50%, -50%) scale(${scale})`;
    overlay.style.transformOrigin = "center center";
}
updateOverlayPosition();

// Dragging
overlayHeader.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = overlay.getBoundingClientRect();
    offset.x = e.clientX - rect.left;
    offset.y = e.clientY - rect.top;
});
document.addEventListener("mouseup", () => isDragging = false);
document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    pos.x = e.clientX - offset.x + overlay.offsetWidth/2;
    pos.y = e.clientY - offset.y + overlay.offsetHeight/2;
    updateOverlayPosition();
});

// Size slider
document.getElementById("sizeSlider").addEventListener("input", (e) => {
    scale = parseFloat(e.target.value);
    updateOverlayPosition();
});

// Opacity slider
document.getElementById("opacitySlider").addEventListener("input", (e) => {
    overlay.style.backgroundColor = `rgba(20,20,20,${parseFloat(e.target.value)/100})`;
    overlay.style.boxShadow = `0 0 25px rgba(0,0,0,${parseFloat(e.target.value)/100 * 0.6})`;
});

// ========================
// Grade Colors Preview & Management
// ========================
function renderGradeColors() {
    if (!gradeList || !gradePreview) {
        // Retry after a short delay if DOM not ready
        setTimeout(renderGradeColors, 50);
        return;
    }

    gradeList.innerHTML = '';

    gradeColors.forEach(c => {
        const div = document.createElement('div');
        div.textContent = `${c.grade_name || 'Grade'} ${c.grade_min}-${c.grade_max}`;
        div.style.color = c.color;
        div.style.marginBottom = '5px';

        const delBtn = document.createElement('button');
        delBtn.textContent = 'X';
        delBtn.style.marginLeft = '10px';
        delBtn.addEventListener('click', () => deleteGrade(c.grade_min, c.grade_max));

        div.appendChild(delBtn);
        gradeList.appendChild(div);
    });

    updatePreview();
}
function updatePreview() {
    gradePreview.innerHTML = '';

    const min = parseInt(minInput.value);
    const max = parseInt(maxInput.value);
    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (!isNaN(min) && !isNaN(max)) {
        const div = document.createElement('div');
        div.textContent = `${name || 'Grade'} ${min}-${max} (preview)`;
        div.style.color = color;
        div.style.fontStyle = 'italic';
        div.style.marginBottom = '5px';
        gradePreview.appendChild(div);
    }
}

minInput.addEventListener('input', updatePreview);
maxInput.addEventListener('input', updatePreview);
nameInput.addEventListener('input', updatePreview);
colorInput.addEventListener('input', updatePreview);

document.getElementById('addGradeBtn').addEventListener('click', () => {
    const min = parseInt(minInput.value);
    const max = parseInt(maxInput.value);
    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (!isNaN(min) && !isNaN(max) && color) {
        fetch(`https://${GetParentResourceName()}/addGrade`, {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({ min, max, name, color })
        });
    }
});

function deleteGrade(min, max) {
    fetch(`https://${GetParentResourceName()}/deleteGrade`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ min, max })
    });
}

// ========================
// Tab Switching
// ========================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');

        const target = btn.dataset.tab;
        document.getElementById(target).style.display = 'block';

        if (target === 'bossPage') {
            renderGradeColors(); // render grades when boss tab opens
        }
    });
});

function fetchGrades() {
    fetch(`https://${GetParentResourceName()}/requestGradeColors`, {
        method: 'POST',
        body: '{}'
    });
}

// ========================
// Settings sliders & callsign
// ========================
function updateSettings() {
    const opacity = document.getElementById('opacitySlider').value;
    const size = document.getElementById('sizeSlider').value;
    const policeListEnabled = playerOverlayCheckbox.checked;

    fetch(`https://${GetParentResourceName()}/updateSettings`, {
        method: 'POST',
        body: JSON.stringify({ opacity, size, policeListEnabled })
    });
}

document.getElementById('opacitySlider').addEventListener('input', updateSettings);
document.getElementById('sizeSlider').addEventListener('input', updateSettings);
playerOverlayCheckbox.addEventListener('change', updateSettings);

document.getElementById('saveCallsign').addEventListener('click', () => {
    const callsign = document.getElementById('callsignInput').value;
    fetch(`https://${GetParentResourceName()}/saveCallsign`, { method: 'POST', body: JSON.stringify({ callsign }) });
});

// ========================
// ESC closes only menu, not overlay
// ========================
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const menu = document.getElementById("menu");
        if (menu && menu.style.display === "flex") {
            fetch(`https://${GetParentResourceName()}/closeMenu`, { method: 'POST', body: '{}' });
            menu.style.display = "none";
        }
    }
});
