/**
 * Student Performance Dashboard
 * Vanilla JavaScript Implementation
 * Features: Inline editing, live updates, charts, comparison, filtering
 */

// ============ STUDENT DATA ============
const studentsData = [
    { id: 104, rollNo: "104", name: "Ananya Singh", marks: { math: 95, science: 92, english: 88, history: 90, computer: 98 } }, // A+ (~92.6)
    { id: 101, rollNo: "101", name: "Aarav Sharma", marks: { math: 92, science: 88, english: 76, history: 85, computer: 95 } }, // A (~87.2)
    { id: 103, rollNo: "103", name: "Rohan Kumar", marks: { math: 65, science: 58, english: 70, history: 62, computer: 68 } }, // B (~64.6)
    { id: 102, rollNo: "102", name: "Priya Patel", marks: { math: 55, science: 52, english: 58, history: 54, computer: 56 } }, // C (55.0)
    { id: 105, rollNo: "105", name: "Vikram Reddy", marks: { math: 45, science: 52, english: 48, history: 40, computer: 55 } }  // Fail (~48.0)
];

// Subject list for consistency
const SUBJECTS = ['math', 'science', 'english', 'history', 'computer'];
const SUBJECT_LABELS = { math: 'Math', science: 'Science', english: 'English', history: 'History', computer: 'Computer' };

// ============ STATE MANAGEMENT ============
let students = JSON.parse(JSON.stringify(studentsData)); // Deep clone
let selectedStudents = []; // For comparison (max 2)
let selectedStudentForRadar = null; // For radar chart

// ============ DOM ELEMENTS ============
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const filterSelect = document.getElementById('filterSelect');
const sortSelect = document.getElementById('sortSelect');
const compareBtn = document.getElementById('compareBtn');
const insightPanel = document.getElementById('insightPanel');
const radarChartTitle = document.getElementById('radarChartTitle');
const radarCanvas = document.getElementById('radarChart');
const comparisonModal = document.getElementById('comparisonModal');
const comparisonChart = document.getElementById('comparisonChart');
const comparisonNames = document.getElementById('comparisonNames');
const comparisonLegend = document.getElementById('comparisonLegend');
const closeModalBtn = document.getElementById('closeModal');

// Action Buttons & Modals
const addStudentBtn = document.getElementById('addStudentBtn');
const printBtn = document.getElementById('printBtn');
const addStudentModal = document.getElementById('addStudentModal');
const closeAddModalBtn = document.getElementById('closeAddModal');
const addStudentForm = document.getElementById('addStudentForm');
const cancelAddBtn = document.getElementById('cancelAdd');

// ============ UTILITY FUNCTIONS ============

/**
 * Calculate average marks for a student
 * @param {Object} marks - Subject-wise marks object
 * @returns {number} Average rounded to 1 decimal
 */
function calculateAverage(marks) {
    const values = Object.values(marks);
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 10) / 10;
}

/**
 * Determine grade based on average
 * @param {number} average - Student average
 * @returns {string} Grade (A+, A, B, C, Fail)
 */
function getGrade(average) {
    if (average >= 90) return 'A+';
    if (average >= 75) return 'A';
    if (average >= 60) return 'B';
    if (average >= 50) return 'C';
    return 'Fail';
}

/**
 * Get performance category based on marks
 * @param {number} mark - Individual subject mark
 * @returns {string} Category class name
 */
function getPerformanceClass(mark) {
    if (mark >= 75) return 'mark-excellent';
    if (mark >= 50) return 'mark-average';
    return 'mark-needs-improvement';
}

/**
 * Get grade CSS class
 * @param {string} grade - Grade string
 * @returns {string} CSS class
 */
function getGradeClass(grade) {
    const classes = { 'A+': 'grade-aplus', 'A': 'grade-a', 'B': 'grade-b', 'C': 'grade-c', 'Fail': 'grade-fail' };
    return classes[grade] || '';
}

/**
 * Get rank badge emoji
 * @param {number} rank - Student rank
 * @returns {string} Emoji or empty string
 */
function getRankBadge(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
}

/**
 * Calculate ranks for all students
 * @returns {Array} Students array with ranks
 */
function calculateRanks() {
    // Calculate averages and sort
    const studentsWithAvg = students.map(s => ({
        ...s,
        average: calculateAverage(s.marks)
    }));

    // Sort by average descending
    studentsWithAvg.sort((a, b) => b.average - a.average);

    // Assign ranks (handle ties)
    let currentRank = 1;
    for (let i = 0; i < studentsWithAvg.length; i++) {
        if (i > 0 && studentsWithAvg[i].average < studentsWithAvg[i - 1].average) {
            currentRank = i + 1;
        }
        studentsWithAvg[i].rank = currentRank;
    }

    return studentsWithAvg;
}

/**
 * Get performance insight text
 * @param {Object} student - Student object with marks
 * @returns {Object} Insight data
 */
function getInsight(student) {
    const average = calculateAverage(student.marks);
    let status, statusClass;

    if (average >= 75) {
        status = 'Excellent';
        statusClass = 'insight-excellent';
    } else if (average >= 50) {
        status = 'Average';
        statusClass = 'insight-average';
    } else {
        status = 'Needs Improvement';
        statusClass = 'insight-needs-improvement';
    }

    // Find strengths and weaknesses
    const strengths = [];
    const weaknesses = [];

    for (const [subject, mark] of Object.entries(student.marks)) {
        if (mark >= 75) strengths.push(SUBJECT_LABELS[subject]);
        else if (mark < 50) weaknesses.push(SUBJECT_LABELS[subject]);
    }

    return { status, statusClass, strengths, weaknesses, average };
}

// ============ TABLE RENDERING ============

/**
 * Render the student table with current filters/sorting
 */
function renderTable() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filter = filterSelect.value;
    const sort = sortSelect.value;

    // Calculate ranks
    let rankedStudents = calculateRanks();

    // Apply search filter
    if (searchTerm) {
        rankedStudents = rankedStudents.filter(s =>
            s.name.toLowerCase().includes(searchTerm) ||
            s.rollNo.toLowerCase().includes(searchTerm)
        );
    }

    // Apply performance filter
    if (filter === 'top') {
        rankedStudents = rankedStudents.filter(s => s.average >= 75);
    } else if (filter === 'below') {
        rankedStudents = rankedStudents.filter(s => s.average < 50);
    }

    // Apply sorting
    if (sort === 'name') {
        rankedStudents.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'roll') {
        rankedStudents.sort((a, b) => a.rollNo.localeCompare(b.rollNo));
    }
    // Default is by rank (already sorted)

    // Clear and rebuild table
    tableBody.innerHTML = '';

    rankedStudents.forEach(student => {
        const row = document.createElement('tr');
        row.dataset.id = student.id;

        // Check if student is selected for comparison
        const isSelected = selectedStudents.includes(student.id);
        if (isSelected) row.classList.add('selected');

        const grade = getGrade(student.average);
        const badge = getRankBadge(student.rank);

        row.innerHTML = `
            <td class="checkbox-col">
                <input type="checkbox" class="student-checkbox" data-id="${student.id}" 
                    ${isSelected ? 'checked' : ''} aria-label="Select ${student.name} for comparison">
            </td>
            <td class="rank-cell">
                <span class="rank-badge">${badge}</span>
                <span>${student.rank}</span>
            </td>
            <td>${student.rollNo}</td>
            <td>${student.name}</td>
            ${SUBJECTS.map(subject => `
                <td>
                    <span class="mark-cell ${getPerformanceClass(student.marks[subject])}" 
                        contenteditable="true" 
                        data-id="${student.id}" 
                        data-subject="${subject}"
                        role="textbox"
                        aria-label="${SUBJECT_LABELS[subject]} marks for ${student.name}">${student.marks[subject]}</span>
                </td>
            `).join('')}
            <td class="average-cell ${getPerformanceClass(student.average)}">${student.average}</td>
            <td class="grade-cell ${getGradeClass(grade)}">${grade}</td>
            <td class="actions-col">
                <button class="delete-btn" data-id="${student.id}" aria-label="Delete ${student.name}">
                    🗑
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Setup event listeners for new content
    setupMarkEditing();
    setupRowHover();
    setupCheckboxes();
    setupDeleteButtons(); // NEW
}

// ============ EVENT HANDLERS ============

/**
 * Setup inline mark editing with validation
 */
function setupMarkEditing() {
    const markCells = tableBody.querySelectorAll('.mark-cell');

    markCells.forEach(cell => {
        // Handle blur (when user finishes editing)
        cell.addEventListener('blur', handleMarkEdit);

        // Handle keydown for validation and Enter key
        cell.addEventListener('keydown', (e) => {
            // Allow navigation keys
            if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return;

            // Enter key submits
            if (e.key === 'Enter') {
                e.preventDefault();
                cell.blur();
                return;
            }

            // Escape key cancels
            if (e.key === 'Escape') {
                const studentId = parseInt(cell.dataset.id);
                const subject = cell.dataset.subject;
                const student = students.find(s => s.id === studentId);
                cell.textContent = student.marks[subject];
                cell.blur();
                return;
            }

            // Only allow numbers
            if (!/^\d$/.test(e.key)) {
                e.preventDefault();
            }
        });

        // Select all text on focus for easy editing
        cell.addEventListener('focus', () => {
            const range = document.createRange();
            range.selectNodeContents(cell);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
    });
}

/**
 * Setup delete buttons
 */
function setupDeleteButtons() {
    const deleteBtns = tableBody.querySelectorAll('.delete-btn');

    deleteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent row click
            const studentId = parseInt(btn.dataset.id);
            if (confirm('Are you sure you want to delete this student record?')) {
                deleteStudent(studentId);
            }
        });
    });
}

/**
 * Handle mark edit validation and update
 * @param {Event} e - Blur event
 */
function handleMarkEdit(e) {
    const cell = e.target;
    const studentId = parseInt(cell.dataset.id);
    const subject = cell.dataset.subject;

    let newValue = parseInt(cell.textContent.trim());
    const student = students.find(s => s.id === studentId);

    // Validate mark (0-100)
    if (isNaN(newValue) || newValue < 0 || newValue > 100) {
        // Reset to original value
        cell.textContent = student.marks[subject];
        return;
    }

    // Update student data
    student.marks[subject] = newValue;

    // Update UI efficiently
    updateAllVisuals();
}

/**
 * Setup row hover for insights
 */
function setupRowHover() {
    const rows = tableBody.querySelectorAll('tr');

    rows.forEach(row => {
        row.addEventListener('mouseenter', () => {
            const studentId = parseInt(row.dataset.id);
            showInsight(studentId);
        });

        row.addEventListener('mouseleave', () => {
            restoreInsightState();
        });

        row.addEventListener('click', (e) => {
            // Don't trigger on checkbox, editable cell, or delete button click
            if (e.target.closest('.student-checkbox') ||
                e.target.closest('.mark-cell') ||
                e.target.closest('.delete-btn')) return;

            const studentId = parseInt(row.dataset.id);
            selectStudentForRadar(studentId);
            showInsight(studentId);
        });
    });
}

/**
 * Setup checkbox selection for comparison
 */
function setupCheckboxes() {
    const checkboxes = tableBody.querySelectorAll('.student-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const studentId = parseInt(checkbox.dataset.id);

            if (checkbox.checked) {
                if (selectedStudents.length < 2) {
                    selectedStudents.push(studentId);
                } else {
                    // Already have 2 selected, uncheck this one
                    checkbox.checked = false;
                    return;
                }
            } else {
                selectedStudents = selectedStudents.filter(id => id !== studentId);
            }

            updateCompareButton();
            updateCompareButton();
            updateRowSelection();
            restoreInsightState(); // Update insight panel
        });
    });
}

/**
 * Restore insight panel state based on selection
 */
function restoreInsightState() {
    // If multiple students selected, show blank
    if (selectedStudents.length > 1) {
        insightPanel.innerHTML = '<p class="insight-placeholder">Multiple students selected. Analysis hidden.</p>';
        return;
    }

    // If exactly one student selected via checkbox, show them
    if (selectedStudents.length === 1) {
        showInsight(selectedStudents[0]);
        return;
    }

    // Fallback: If no checkboxes, check if we have a clicked row (Radar selection)
    if (selectedStudentForRadar) {
        showInsight(selectedStudentForRadar);
        return;
    }

    // Default blank
    insightPanel.innerHTML = '<p class="insight-placeholder">Hover over or click a student row to see detailed insights.</p>';
}

/**
 * Update compare button state
 */
function updateCompareButton() {
    const count = selectedStudents.length;
    compareBtn.textContent = `Compare Selected (${count}/2)`;
    compareBtn.disabled = count !== 2;
}

/**
 * Update row selection visual
 */
function updateRowSelection() {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const studentId = parseInt(row.dataset.id);
        row.classList.toggle('selected', selectedStudents.includes(studentId));
    });
}

/**
 * Show insight for a student
 * @param {number} studentId - Student ID
 */
function showInsight(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const insight = getInsight(student);

    const strengthsText = insight.strengths.length > 0
        ? insight.strengths.join(', ')
        : 'None';
    const weaknessesText = insight.weaknesses.length > 0
        ? insight.weaknesses.join(', ')
        : 'None';

    insightPanel.innerHTML = `
        <div class="insight-content">
            <div class="insight-header">
                <span class="insight-name">${student.name}</span>
                <span class="insight-badge ${insight.statusClass}">${insight.status}</span>
            </div>
            <div class="insight-details">
                <div class="insight-item">
                    <span class="insight-label">Average:</span>
                    <span class="${getPerformanceClass(insight.average)}">${insight.average}%</span>
                </div>
                <div class="insight-item">
                    <span class="insight-label">Grade:</span>
                    <span class="${getGradeClass(getGrade(insight.average))}">${getGrade(insight.average)}</span>
                </div>
                <div class="insight-item">
                    <span class="insight-label">Strengths:</span>
                    <span class="insight-strengths">${strengthsText}</span>
                </div>
                <div class="insight-item">
                    <span class="insight-label">Needs Work:</span>
                    <span class="insight-weaknesses">${weaknessesText}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Select student for radar chart display
 * @param {number} studentId - Student ID
 */
function selectStudentForRadar(studentId) {
    selectedStudentForRadar = studentId;
    const student = students.find(s => s.id === studentId);
    if (student) {
        radarChartTitle.textContent = `${student.name}'s Performance`;
        drawRadarChart(student);
    }
}

// ============ RADAR CHART ============

/**
 * Draw radar chart for a student
 * @param {Object} student - Student object
 */
function drawRadarChart(student) {
    const ctx = radarCanvas.getContext('2d');
    const width = radarCanvas.width;
    const height = radarCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 50;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const subjects = SUBJECTS;
    const numPoints = subjects.length;
    const angleStep = (2 * Math.PI) / numPoints;
    const startAngle = -Math.PI / 2; // Start from top

    // Draw background circles (grid)
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius * i) / 5, 0, 2 * Math.PI);
        ctx.stroke();
    }

    // Draw axis lines and labels
    ctx.strokeStyle = '#30363d';
    ctx.fillStyle = '#8b949e';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < numPoints; i++) {
        const angle = startAngle + i * angleStep;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        // Draw axis line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Draw label
        const labelRadius = radius + 25;
        const labelX = centerX + labelRadius * Math.cos(angle);
        const labelY = centerY + labelRadius * Math.sin(angle);
        ctx.fillText(SUBJECT_LABELS[subjects[i]], labelX, labelY);
    }

    // Draw scale labels
    ctx.fillStyle = '#6e7681';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    for (let i = 1; i <= 5; i++) {
        const value = i * 20;
        const labelY = centerY - (radius * i) / 5 - 5;
        ctx.fillText(value.toString(), centerX + 5, labelY);
    }

    // Draw data polygon
    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const angle = startAngle + i * angleStep;
        const value = student.marks[subjects[i]] / 100; // Normalize to 0-1
        const x = centerX + radius * value * Math.cos(angle);
        const y = centerY + radius * value * Math.sin(angle);
        points.push({ x, y });
    }

    // Fill polygon
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(88, 166, 255, 0.3)';
    ctx.fill();

    // Draw polygon border
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#58a6ff';
    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    });
}

/**
 * Draw empty radar chart placeholder
 */
function drawEmptyRadarChart() {
    const ctx = radarCanvas.getContext('2d');
    const width = radarCanvas.width;
    const height = radarCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 50;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const numPoints = SUBJECTS.length;
    const angleStep = (2 * Math.PI) / numPoints;
    const startAngle = -Math.PI / 2;

    // Draw background circles
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius * i) / 5, 0, 2 * Math.PI);
        ctx.stroke();
    }

    // Draw axis lines and labels
    ctx.fillStyle = '#6e7681';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < numPoints; i++) {
        const angle = startAngle + i * angleStep;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();

        const labelRadius = radius + 25;
        const labelX = centerX + labelRadius * Math.cos(angle);
        const labelY = centerY + labelRadius * Math.sin(angle);
        ctx.fillText(SUBJECT_LABELS[SUBJECTS[i]], labelX, labelY);
    }
}

// ============ COMPARISON CHART ============

/**
 * Draw comparison bar chart for two students
 */
function drawComparisonChart() {
    if (selectedStudents.length !== 2) return;

    const student1 = students.find(s => s.id === selectedStudents[0]);
    const student2 = students.find(s => s.id === selectedStudents[1]);

    if (!student1 || !student2) return;

    // Update names display
    comparisonNames.innerHTML = `
        <div class="comparison-name">
            <div class="comparison-color-box" style="background-color: #58a6ff;"></div>
            <span>${student1.name}</span>
        </div>
        <div class="comparison-name">
            <div class="comparison-color-box" style="background-color: #f78166;"></div>
            <span>${student2.name}</span>
        </div>
    `;

    const ctx = comparisonChart.getContext('2d');
    const width = comparisonChart.width;
    const height = comparisonChart.height;
    const padding = { top: 30, right: 30, bottom: 50, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const subjects = SUBJECTS;
    const numBars = subjects.length;
    const groupWidth = chartWidth / numBars;
    const barWidth = groupWidth * 0.35;
    const barGap = groupWidth * 0.1;

    // Draw Y-axis and grid lines
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8b949e';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 5; i++) {
        const y = padding.top + chartHeight - (chartHeight * i) / 5;

        // Grid line
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        // Y-axis label
        ctx.fillText((i * 20).toString(), padding.left - 10, y);
    }

    // Draw bars
    const colors = ['#58a6ff', '#f78166'];
    const legendItems = [];

    subjects.forEach((subject, index) => {
        const groupX = padding.left + index * groupWidth + groupWidth / 2;

        const marks = [student1.marks[subject], student2.marks[subject]];
        const winner = marks[0] > marks[1] ? 0 : marks[1] > marks[0] ? 1 : -1;

        marks.forEach((mark, barIndex) => {
            const barHeight = (mark / 100) * chartHeight;
            const barX = groupX + (barIndex === 0 ? -barWidth - barGap / 2 : barGap / 2);
            const barY = padding.top + chartHeight - barHeight;

            // Draw bar
            ctx.fillStyle = colors[barIndex];
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Draw value on top
            ctx.fillStyle = '#f0f6fc';
            ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(mark.toString(), barX + barWidth / 2, barY - 8);

            // Winner indicator
            if (winner === barIndex) {
                ctx.fillStyle = '#3fb950';
                ctx.fillText('★', barX + barWidth / 2, barY - 20);
            }
        });

        // Subject label
        ctx.fillStyle = '#8b949e';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(SUBJECT_LABELS[subject], groupX, padding.top + chartHeight + 10);

        // Track winner for legend
        if (winner >= 0) {
            legendItems.push({ subject: SUBJECT_LABELS[subject], winner: winner === 0 ? student1.name : student2.name });
        }
    });

    // Update legend
    comparisonLegend.innerHTML = legendItems.map(item =>
        `<div class="legend-item"><span class="legend-winner">★ ${item.subject}:</span> ${item.winner}</div>`
    ).join('');
}

/**
 * Open comparison modal
 */
function openComparisonModal() {
    if (selectedStudents.length !== 2) return;

    comparisonModal.classList.add('active');
    comparisonModal.setAttribute('aria-hidden', 'false');
    drawComparisonChart();
}

/**
 * Close comparison modal
 */
function closeComparisonModal() {
    comparisonModal.classList.remove('active');
    comparisonModal.setAttribute('aria-hidden', 'true');
}

// ============ LIVE UPDATES ============

/**
 * Update all visual elements after data change
 * Optimized for minimal DOM operations
 */
function updateAllVisuals() {
    // Re-render table (updates colors, grades, ranks)
    renderTable();

    // Update radar chart if a student is selected
    if (selectedStudentForRadar) {
        // Check if student still exists
        const student = students.find(s => s.id === selectedStudentForRadar);
        if (student) {
            drawRadarChart(student);
            showInsight(selectedStudentForRadar);
        } else {
            // Student deleted
            drawEmptyRadarChart();
            insightPanel.innerHTML = '<p class="insight-placeholder">Hover over or click a student row to see detailed insights.</p>';
            selectedStudentForRadar = null;
            radarChartTitle.textContent = 'Select a student to view radar chart';
        }
    }
}

// ============ DATA MANAGEMENT ============

/**
 * Add a new student
 * @param {Object} studentData - Form data
 */
function addStudent(studentData) {
    // Generate new ID
    const newId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;

    const newStudent = {
        id: newId,
        ...studentData
    };

    students.push(newStudent);
    updateAllVisuals();

    // Reset and close modal
    addStudentForm.reset();
    closeAddStudentModal();
}

/**
 * Delete a student
 * @param {number} id - Student ID
 */
function deleteStudent(id) {
    students = students.filter(s => s.id !== id);

    // Clean up selections
    if (selectedStudents.includes(id)) {
        selectedStudents = selectedStudents.filter(sId => sId !== id);
        updateCompareButton();
        if (comparisonModal.classList.contains('active')) {
            drawComparisonChart(); // Re-draw or clear
            if (selectedStudents.length < 2) {
                // If marks dropped below 2, maybe close modal or show specific message?
                // For now, let's just close it if it becomes invalid
                closeComparisonModal();
            }
        }
    }

    updateAllVisuals();
}

/**
 * Handle Print Logic
 * - If 1 student selected (checkbox): Print ONLY that student + Graph.
 * - Else (None/Result): Print ALL table + NO Graph.
 */
function handlePrint() {
    // Check checkboxes first
    if (selectedStudents.length === 1) {
        // Print Single Mode
        document.body.classList.add('print-single');

        // Ensure radar chart is showing this student
        const studentId = selectedStudents[0];
        const student = students.find(s => s.id === studentId);
        if (student) {
            drawRadarChart(student);
            showInsight(studentId);
            radarChartTitle.textContent = `${student.name}'s Performance Report`;
        }

        // Mark the selected row for CSS to find
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            if (parseInt(row.dataset.id) === studentId) {
                row.classList.add('print-target');
            } else {
                row.classList.remove('print-target');
            }
        });

    } else {
        // Print All Mode
        document.body.classList.add('print-all');
    }

    // Print
    window.print();

    // Cleanup after print dialog closes
    document.body.classList.remove('print-single');
    document.body.classList.remove('print-all');
}

/**
 * Export students to CSV
 */
function exportToCSV() {
    const headers = ['Rank', 'Roll No', 'Name', ...SUBJECTS.map(s => SUBJECT_LABELS[s]), 'Average', 'Grade'];
    const rows = calculateRanks().map(s => [
        s.rank,
        s.rollNo,
        s.name,
        ...SUBJECTS.map(sub => s.marks[sub]),
        s.average,
        getGrade(s.average)
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'student_performance_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============ MODAL HANDLERS ============

function openAddStudentModal() {
    addStudentModal.classList.add('active');
    addStudentModal.setAttribute('aria-hidden', 'false');
    document.getElementById('studentName').focus();
}

function closeAddStudentModal() {
    addStudentModal.classList.remove('active');
    addStudentModal.setAttribute('aria-hidden', 'true');
}

// ============ INITIALIZATION ============

/**
 * Initialize the dashboard
 */
function init() {
    // Initial render
    renderTable();
    drawEmptyRadarChart();

    // Setup event listeners
    searchInput.addEventListener('input', debounce(renderTable, 150));
    filterSelect.addEventListener('change', renderTable);
    sortSelect.addEventListener('change', renderTable);

    compareBtn.addEventListener('click', openComparisonModal);
    closeModalBtn.addEventListener('click', closeComparisonModal);

    // New Action Buttons
    addStudentBtn.addEventListener('click', openAddStudentModal);
    printBtn.addEventListener('click', handlePrint);

    // Add Student Modal
    closeAddModalBtn.addEventListener('click', closeAddStudentModal);
    cancelAddBtn.addEventListener('click', closeAddStudentModal);

    addStudentForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const rollNo = document.getElementById('rollNo').value.trim();

        // Check duplicate roll number
        if (students.some(s => s.rollNo === rollNo)) {
            alert('Roll Number already exists!');
            return;
        }

        const studentData = {
            name: document.getElementById('studentName').value.trim(),
            rollNo: rollNo,
            marks: {
                math: parseInt(document.getElementById('markMath').value),
                science: parseInt(document.getElementById('markScience').value),
                english: parseInt(document.getElementById('markEnglish').value),
                history: parseInt(document.getElementById('markHistory').value),
                computer: parseInt(document.getElementById('markComputer').value)
            }
        };

        addStudent(studentData);
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === comparisonModal) closeComparisonModal();
        if (e.target === addStudentModal) closeAddStudentModal();
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (comparisonModal.classList.contains('active')) closeComparisonModal();
            if (addStudentModal.classList.contains('active')) closeAddStudentModal();
        }
    });
}

/**
 * Debounce function for performance
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Start the dashboard
document.addEventListener('DOMContentLoaded', init);
