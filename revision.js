document.addEventListener('DOMContentLoaded', () => {
    // ---- Auth Check ----
    if (localStorage.getItem('skillox_is_logged_in') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    const classListContainer = document.getElementById('class-list');
    const categoryListContainer = document.getElementById('category-list');
    const pdfGridContainer = document.getElementById('pdf-grid');

    let revisionData = {};
    let currentClass = null;
    let currentCategory = null;
    let isPopState = false;
    let isInitialLoad = true;

    window.addEventListener('popstate', () => {
        isPopState = true;
        const urlParams = new URLSearchParams(window.location.search);
        const urlClass = urlParams.get('class');
        const urlCategory = urlParams.get('category');
        
        if (urlClass && revisionData[urlClass]) {
            selectClass(urlClass, urlCategory);
        } else {
            const classes = Object.keys(revisionData).filter(k => k !== '_files').sort((a, b) => {
                const numA = parseInt(a.replace('Class_', ''));
                const numB = parseInt(b.replace('Class_', ''));
                return numA - numB;
            });
            if (classes.length > 0) {
                selectClass(classes[0], null);
            }
        }
        isPopState = false;
    });

    fetch(`pdf-list.json?t=${new Date().getTime()}`)
        .then(res => res.json())
        .then(data => {
            revisionData = data.revision || {};
            renderClasses();
            
            const urlParams = new URLSearchParams(window.location.search);
            const initialClass = urlParams.get('class');
            const initialCategory = urlParams.get('category');
            
            if (initialClass && revisionData[initialClass]) {
                selectClass(initialClass, initialCategory);
            } else {
                const classes = Object.keys(revisionData).filter(k => k !== '_files').sort((a, b) => {
                    const numA = parseInt(a.replace('Class_', ''));
                    const numB = parseInt(b.replace('Class_', ''));
                    return numA - numB;
                });
                if (classes.length > 0) {
                    selectClass(classes[0], initialCategory);
                } else {
                    classListContainer.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">No classes found.</div>';
                }
            }
        })
        .catch(err => {
            console.error('Failed to load revision data:', err);
            classListContainer.innerHTML = '<div style="padding: 20px; color: #ef4444;">Error loading data.</div>';
        });

    function renderClasses() {
        const classes = Object.keys(revisionData).filter(k => k !== '_files').sort((a, b) => {
            const numA = parseInt(a.replace('Class_', ''));
            const numB = parseInt(b.replace('Class_', ''));
            return numA - numB;
        });

        classListContainer.innerHTML = classes.map(cls => `
            <button class="class-btn" data-class="${escapeHtml(cls)}">
                ${escapeHtml(cls.replace('_', ' '))}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        `).join('');

        document.querySelectorAll('.class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                selectClass(e.currentTarget.getAttribute('data-class'));
            });
        });
    }

    function selectClass(cls, preferredCategory = null) {
        currentClass = cls;
        
        document.querySelectorAll('.class-btn').forEach(btn => {
            if (btn.getAttribute('data-class') === cls) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const categories = Object.keys(revisionData[cls] || {}).filter(k => k !== '_files');
        
        if (categories.length > 0) {
            renderCategories(categories);
            if (preferredCategory && categories.includes(preferredCategory)) {
                selectCategory(preferredCategory);
            } else {
                selectCategory(categories[0]);
            }
        } else {
            categoryListContainer.innerHTML = '';
            renderPDFs(revisionData[cls]?._files || []);
            updateUrl();
        }
    }

    function renderCategories(categories) {
        categoryListContainer.innerHTML = categories.map(cat => `
            <button class="subject-pill" data-category="${escapeHtml(cat)}">
                ${escapeHtml(cat.replace(/_/g, ' ').replace(' and ', ' & '))}
            </button>
        `).join('');

        document.querySelectorAll('.subject-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                selectCategory(e.currentTarget.getAttribute('data-category'));
            });
        });
    }

    function selectCategory(cat) {
        currentCategory = cat;
        
        document.querySelectorAll('.subject-pill').forEach(btn => {
            if (btn.getAttribute('data-category') === cat) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const files = revisionData[currentClass]?.[cat]?._files || [];
        renderPDFs(files);
        updateUrl();
    }

    function updateUrl() {
        if (isPopState) return;
        
        let newSearch = '?class=' + encodeURIComponent(currentClass);
        if (currentCategory) {
            newSearch += '&category=' + encodeURIComponent(currentCategory);
        }
        
        const currentSearch = window.location.search;
        if (currentSearch !== newSearch) {
            if (isInitialLoad) {
                window.history.replaceState(null, '', newSearch);
                isInitialLoad = false;
            } else {
                window.history.pushState(null, '', newSearch);
            }
        } else {
            isInitialLoad = false;
        }
    }

    function renderPDFs(files) {
        if (!files || files.length === 0) {
            pdfGridContainer.innerHTML = `
                <div class="empty-hub" style="grid-column: 1 / -1;">
                    <div style="font-size: 40px; margin-bottom: 10px;">📄</div>
                    <h3>No revision notes found</h3>
                    <p>We are currently updating materials for this section. Check back soon!</p>
                </div>
            `;
            return;
        }

        pdfGridContainer.innerHTML = files.map(file => `
            <a href="viewer.html?file=${encodeURIComponent(file.url)}&title=${encodeURIComponent(file.title)}" class="pdf-card">
                <div class="pdf-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div class="pdf-details">
                    <h4>${escapeHtml(file.title)}</h4>
                    <p>PDF Document</p>
                </div>
            </a>
        `).join('');
    }

    function escapeHtml(unsafe) {
        return (unsafe || '').toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
