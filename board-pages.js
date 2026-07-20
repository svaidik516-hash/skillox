document.addEventListener('DOMContentLoaded', () => {
    // ---- Auth Check ----
    if (localStorage.getItem('skillox_is_logged_in') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    const classListContainer = document.getElementById('class-list');
    const subjectListContainer = document.getElementById('subject-list');
    const pdfGridContainer = document.getElementById('pdf-grid');

    let sectionData = {};
    let currentClass = null;
    let currentSubject = null;
    
    // Determine the current board from the filename
    const path = window.location.pathname;
    let boardKey = 'CBSE';
    if (path.includes('icse.html')) boardKey = 'ICSE';
    else if (path.includes('up-board.html')) boardKey = 'UP_Board';

    fetch('pdf-list.json')
        .then(res => res.json())
        .then(data => {
            sectionData = data['sample-papers']?.[boardKey] || {};
            renderClasses();
            
            const urlParams = new URLSearchParams(window.location.search);
            const initialClass = urlParams.get('class');
            
            if (initialClass && sectionData[initialClass]) {
                selectClass(initialClass);
            } else {
                const classes = Object.keys(sectionData).filter(k => k !== '_files').sort((a, b) => {
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
            console.error('Failed to load data:', err);
            classListContainer.innerHTML = '<div style="padding: 20px; color: #ef4444;">Error loading data.</div>';
        });

    function renderClasses() {
        const classes = Object.keys(sectionData).filter(k => k !== '_files').sort((a, b) => {
            const numA = parseInt(a.replace('Class_', ''));
            const numB = parseInt(b.replace('Class_', ''));
            return numA - numB;
        });

        classListContainer.innerHTML = classes.map(cls => {
            const displayName = cls.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `
            <button class="class-btn" data-class="${cls}">
                ${displayName}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        `}).join('');

        document.querySelectorAll('.class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                selectClass(e.currentTarget.getAttribute('data-class'));
            });
        });
    }

    function selectClass(cls) {
        currentClass = cls;
        
        document.querySelectorAll('.class-btn').forEach(btn => {
            if (btn.getAttribute('data-class') === cls) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const classContent = sectionData[cls] || {};
        const subfolders = Object.keys(classContent).filter(k => k !== '_files');
        
        if (subfolders.length > 0) {
            renderSubjects(subfolders);
            selectSubject(subfolders[0]);
        } else {
            subjectListContainer.innerHTML = '';
            renderPDFs(classContent._files || []);
        }
        
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?class=' + encodeURIComponent(cls);
        window.history.pushState({path:newUrl}, '', newUrl);
    }

    function renderSubjects(subjects) {
        subjectListContainer.innerHTML = subjects.map(sub => {
            const displayName = sub.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `
            <button class="subject-pill" data-subject="${sub}">${displayName}</button>
        `}).join('');

        document.querySelectorAll('.subject-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                selectSubject(e.currentTarget.getAttribute('data-subject'));
            });
        });
    }

    function selectSubject(sub) {
        currentSubject = sub;
        
        document.querySelectorAll('.subject-pill').forEach(btn => {
            if (btn.getAttribute('data-subject') === sub) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const subjectData = sectionData[currentClass][sub] || {};
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
