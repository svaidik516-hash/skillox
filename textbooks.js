document.addEventListener('DOMContentLoaded', () => {
    // ---- Auth Check ----
    if (localStorage.getItem('skillox_is_logged_in') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    const classListContainer = document.getElementById('class-list');
    const subjectListContainer = document.getElementById('subject-list');
    const pdfGridContainer = document.getElementById('pdf-grid');

    let textbooksData = {};
    let currentClass = null;
    let currentSubject = null;

    // Fetch the data
    fetch('pdf-list.json')
        .then(res => res.json())
        .then(data => {
            textbooksData = data.textbooks || {};
            renderClasses();
            
            // Check URL parameters for an initial class selection
            const urlParams = new URLSearchParams(window.location.search);
            const initialClass = urlParams.get('class');
            
            if (initialClass && textbooksData[initialClass]) {
                selectClass(initialClass);
            } else {
                // Select first class by default
                const classes = Object.keys(textbooksData).sort((a, b) => {
                    // Extract numbers to sort Class_1, Class_2, ..., Class_10 properly
                    const numA = parseInt(a.replace('Class_', ''));
                    const numB = parseInt(b.replace('Class_', ''));
                    return numA - numB;
                });
                if (classes.length > 0) {
                    selectClass(classes[0]);
                } else {
                    classListContainer.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">No classes found.</div>';
                }
            }
        })
        .catch(err => {
            console.error('Failed to load textbooks data:', err);
            classListContainer.innerHTML = '<div style="padding: 20px; color: #ef4444;">Error loading data.</div>';
        });

    function renderClasses() {
        const classes = Object.keys(textbooksData).sort((a, b) => {
            const numA = parseInt(a.replace('Class_', ''));
            const numB = parseInt(b.replace('Class_', ''));
            return numA - numB;
        });

        classListContainer.innerHTML = classes.map(cls => `
            <button class="class-btn" data-class="${cls}">
                ${cls.replace('_', ' ')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        `).join('');

        // Add event listeners
        document.querySelectorAll('.class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cls = e.currentTarget.getAttribute('data-class');
                selectClass(cls);
            });
        });
    }

    function selectClass(cls) {
        currentClass = cls;
        
        // Update active state in sidebar
        document.querySelectorAll('.class-btn').forEach(btn => {
            if (btn.getAttribute('data-class') === cls) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const subjects = Object.keys(textbooksData[cls] || {}).filter(k => k !== '_files');
        
        if (subjects.length > 0) {
            renderSubjects(subjects);
            selectSubject(subjects[0]);
        } else {
            subjectListContainer.innerHTML = '';
            // Maybe there are files directly in the class folder
            renderPDFs(textbooksData[cls]._files || []);
        }
        
        // Update URL without reloading
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?class=' + cls;
        window.history.pushState({path:newUrl}, '', newUrl);
    }

    function renderSubjects(subjects) {
        subjectListContainer.innerHTML = subjects.map(sub => `
            <button class="subject-pill" data-subject="${sub}">${sub}</button>
        `).join('');

        // Add event listeners
        document.querySelectorAll('.subject-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sub = e.currentTarget.getAttribute('data-subject');
                selectSubject(sub);
            });
        });
    }

    function selectSubject(sub) {
        currentSubject = sub;
        
        // Update active state in pills
        document.querySelectorAll('.subject-pill').forEach(btn => {
            if (btn.getAttribute('data-subject') === sub) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const subjectData = textbooksData[currentClass][sub] || {};
        renderPDFs(subjectData._files || []);
    }

    function renderPDFs(files) {
        if (!files || files.length === 0) {
            pdfGridContainer.innerHTML = `
                <div class="empty-hub" style="grid-column: 1/-1;">
                    <div style="font-size: 40px; margin-bottom: 15px;">📭</div>
                    <h3>No PDFs uploaded yet</h3>
                    <p>Drop some PDFs into the corresponding folder to see them here.</p>
                </div>
            `;
            return;
        }

        pdfGridContainer.innerHTML = files.map(pdf => `
            <a href="viewer.html?file=${encodeURIComponent(pdf.url)}" target="_blank" class="pdf-card">
                <div class="pdf-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div class="pdf-title">${pdf.title}</div>
                <div class="pdf-meta">View Document</div>
            </a>
        `).join('');
    }
});
