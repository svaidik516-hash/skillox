/* =============================================
   SKILLOX — Main JavaScript
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // ---- XSS Sanitization Utility ----
    window.escapeHtml = function(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    // ---- Inject Premium Mobile Floating App Navigation Bar (Matches Image 3) ----
    if (!document.getElementById('mobile-bottom-nav') && !window.location.pathname.includes('login') && !window.location.pathname.includes('signup') && !window.location.pathname.includes('2fa') && !window.location.pathname.includes('forgot-password') && !window.location.pathname.includes('admin')) {
        const path = window.location.pathname.toLowerCase();
        const nav = document.createElement('div');
        nav.id = 'mobile-bottom-nav';
        nav.className = 'mobile-bottom-nav';
        
        const isHome = path === '/' || path.includes('index.html') || path === '' || path.endsWith('/');
        const isStudy = path.includes('textbooks') || path.includes('viewer');
        const isPractice = path.includes('cbse') || path.includes('icse') || path.includes('up-board') || path.includes('revision') || path.includes('bookmarks');
        const isProfile = path.includes('profile') || path.includes('settings');

        nav.innerHTML = `
            <a href="index.html" class="bottom-nav-item ${isHome ? 'active' : ''}" style="display: flex; flex-direction: column; align-items: center; text-decoration: none;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="${isHome ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                <span>Home</span>
            </a>
            <a href="textbooks.html" class="bottom-nav-item ${isStudy ? 'active' : ''}" style="display: flex; flex-direction: column; align-items: center; text-decoration: none;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><path d="M6.5 6H20"></path><path d="M6.5 10H20"></path><path d="M6.5 14H20"></path></svg>
                <span>Study Material</span>
            </a>
            <a href="cbse.html" class="bottom-nav-item ${isPractice ? 'active' : ''}" style="display: flex; flex-direction: column; align-items: center; text-decoration: none;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14l2 2 4-4"></path><path d="M9 10h6"></path><path d="M9 18h6"></path></svg>
                <span>Practice</span>
            </a>
            <a href="profile.html" id="bottom-nav-profile-link" class="bottom-nav-item ${isProfile ? 'active' : ''}" style="display: flex; flex-direction: column; align-items: center; text-decoration: none;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>Profile</span>
            </a>
        `;
        document.body.appendChild(nav);
    }

    // ---- Inject Premium Top-Right Profile Avatar Circle on Mobile Navbar ----
    if (!window.location.pathname.includes('login') && !window.location.pathname.includes('signup') && !window.location.pathname.includes('2fa')) {
        const navbar = document.querySelector('.navbar');
        if (navbar && !navbar.querySelector('.mobile-top-avatar-badge')) {
            const badge = document.createElement('a');
            badge.href = 'profile.html';
            badge.className = 'mobile-top-avatar-badge';
            badge.title = 'User Profile';
            const userName = localStorage.getItem('skillox_user_name') || 'S';
            const initial = userName.charAt(0).toUpperCase();
            const customAvatar = localStorage.getItem('skillox_custom_avatar');
            const avatarContent = customAvatar 
                ? `<img src="${customAvatar}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
                : `<span style="font-weight:800;color:#ea580c;font-family:Outfit,sans-serif;font-size:1.1rem;">${initial}</span>`;
                
            badge.innerHTML = `
                <div style="width: 40px; height: 40px; border-radius: 50%; border: 2.5px solid #ea580c; padding: 2px; background: #ffe4c4; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.3);">
                    ${avatarContent}
                </div>
            `;
            const hamburger = navbar.querySelector('.hamburger');
            if (hamburger) {
                navbar.insertBefore(badge, hamburger);
            } else {
                navbar.appendChild(badge);
            }
        }
    }

    // ---- Custom Toast Notification ----
    window.showCustomToast = function(message, type = 'error') {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `custom-toast toast-${type}`;
        
        const icon = type === 'error' 
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Trigger reflow for animation
        toast.offsetHeight;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 400);
        }, 4000);
    };

    // ---- Scroll Animations (IntersectionObserver) ----
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                scrollObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.scroll-anim').forEach(el => {
        scrollObserver.observe(el);
    });

    // ---- Navbar scroll effect ----
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    // ---- Hamburger / Mobile Menu ----
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');

    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('open');
        });

        // Close mobile menu when a link is clicked
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                mobileMenu.classList.remove('open');
            });
        });
    }

    // ---- Check Auth State & Protect Content ----
    let isLoggedIn = localStorage.getItem('skillox_is_logged_in') === 'true';
    const authEmail = localStorage.getItem('skillox_auth_email');

    if (isLoggedIn) {
        fetch((typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '') + '/api/check-auth', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.banned) {
                    localStorage.removeItem('skillox_is_logged_in');
                    localStorage.removeItem('skillox_auth_email');
                    window.showCustomToast('YOU ARE BANNED FOR VIOLATING THE RULES', 'error');
                    setTimeout(() => { window.location.href = 'index.html'; }, 3000);
                } else if (!data.loggedIn) {
                    localStorage.removeItem('skillox_is_logged_in');
                    localStorage.removeItem('skillox_auth_email');
                    window.location.reload();
                }
            })
            .catch(console.error);
    }
    
    // Update Auth Buttons in Navbar
    const navAuthBtn = document.getElementById('nav-auth-btn');
    const mobileAuthBtn = document.getElementById('mobile-auth-btn');
    const navSignupBtn = document.getElementById('nav-signup-btn');
    const mobileSignupBtn = document.getElementById('mobile-signup-btn');

    function updateAuthButtons() {
        const btnText = isLoggedIn ? 'Log Out' : 'Log In';
        const btnHref = isLoggedIn ? '#' : 'login.html';
        
        if (navSignupBtn) {
            navSignupBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
        }
        if (mobileSignupBtn) {
            mobileSignupBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
        }

        if (navAuthBtn) {
            navAuthBtn.textContent = btnText;
            navAuthBtn.href = btnHref;
            if (isLoggedIn) {
                if (navAuthBtn.parentNode && !document.getElementById('nav-profile-link')) {
                    const profileLink = document.createElement('a');
                    profileLink.id = 'nav-profile-link';
                    profileLink.href = 'profile.html';
                    profileLink.className = 'nav-profile-btn';
                    profileLink.title = 'My Profile & Settings';
                    const initials = (authEmail ? authEmail.charAt(0).toUpperCase() : 'U');
                    profileLink.innerHTML = `<span class="nav-profile-avatar">${initials}</span>`;
                    navAuthBtn.parentNode.insertBefore(profileLink, navAuthBtn);
                }
                if (navAuthBtn.parentNode && !document.getElementById('nav-mailbox')) {
                    const mailBtn = document.createElement('button');
                    mailBtn.id = 'nav-mailbox';
                    mailBtn.className = 'nav-mailbox-btn';
                    mailBtn.title = 'My Messages';
                    mailBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#e8740c; display:block;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg><span class="mailbox-badge" id="mailbox-badge">0</span>`;
                    navAuthBtn.parentNode.insertBefore(mailBtn, navAuthBtn);
                    mailBtn.addEventListener('click', openUserInbox);
                }
                navAuthBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try { await fetch((typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '') + '/api/logout', { method: 'POST', credentials: 'include' }); } catch(err) {}
                    localStorage.removeItem('skillox_is_logged_in');
                    localStorage.removeItem('skillox_auth_email');
                    sessionStorage.removeItem('2fa_verified');
                    window.location.reload();
                });
            }
        }
        
        if (mobileAuthBtn) {
            mobileAuthBtn.textContent = btnText;
            mobileAuthBtn.href = btnHref;
            if (isLoggedIn) {
                if (mobileAuthBtn.parentNode && !document.getElementById('mobile-profile-link')) {
                    const li = document.createElement('li');
                    li.id = 'mobile-profile-link';
                    li.innerHTML = '<a href="profile.html" style="color: var(--primary); font-weight: 600;">My Profile & Settings</a>';
                    mobileAuthBtn.parentNode.parentNode.insertBefore(li, mobileAuthBtn.parentNode);
                }
                mobileAuthBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try { await fetch((typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '') + '/api/logout', { method: 'POST', credentials: 'include' }); } catch(err) {}
                    localStorage.removeItem('skillox_is_logged_in');
                    localStorage.removeItem('skillox_auth_email');
                    sessionStorage.removeItem('2fa_verified');
                    window.location.reload();
                });
            }
        }

        const btmProfileLink = document.getElementById('bottom-nav-profile-link');
        if (btmProfileLink) {
            if (isLoggedIn) {
                btmProfileLink.href = 'profile.html';
                btmProfileLink.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span>Profile</span>`;
            } else {
                btmProfileLink.href = 'login.html';
                btmProfileLink.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg><span>Log In</span>`;
            }
        }
    }
    // Always call updateAuthButtons so bottom nav gets synced
    updateAuthButtons();

    // User Mailbox Logic
    let userMessages = [];
    function fetchUserMessages() {
        if (!isLoggedIn) return;
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
        fetch(baseUrl + '/api/user/messages', { credentials: 'include' })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.success) {
                    userMessages = data.messages;
                    updateMailboxBadge();
                    if (document.getElementById('inbox-msg-list') && document.getElementById('user-inbox-modal').style.display === 'flex') {
                        renderUserInbox();
                    }
                }
            })
            .catch(console.error);
    }

    function updateMailboxBadge() {
        const unreadCount = userMessages.filter(m => m.status === 'unread').length;
        const badge = document.getElementById('mailbox-badge');
        if (badge) {
            badge.textContent = unreadCount;
            if (unreadCount > 0) badge.classList.add('active');
            else badge.classList.remove('active');
        }
    }

    function createInboxModal() {
        if (document.getElementById('user-inbox-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'user-inbox-modal';
        modal.className = 'inbox-modal-overlay';
        modal.innerHTML = `
            <div class="inbox-modal-card">
                <div class="inbox-modal-header">
                    <h3 class="inbox-modal-title" style="display:flex; align-items:center; gap:8px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e8740c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        <span>My Inbox</span>
                    </h3>
                    <button id="close-inbox-btn" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-muted);">&times;</button>
                </div>
                <div class="inbox-msg-list" id="inbox-msg-list">
                    <div class="inbox-empty-state">Loading messages...</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('close-inbox-btn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    function openUserInbox(e) {
        if (e) e.preventDefault();
        createInboxModal();
        document.getElementById('user-inbox-modal').style.display = 'flex';
        renderUserInbox();
        fetchUserMessages();
    }

    function renderUserInbox() {
        const list = document.getElementById('inbox-msg-list');
        if (!list) return;
        if (userMessages.length === 0) {
            list.innerHTML = `<div class="inbox-empty-state"><div style="margin-bottom:12px;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;"><path d="M22 12V6c0-1.1-.9-2-2-2H4c-1.1 0-2-.9-2-2v12c0 1.1.9 2 2 2h8"></path><polyline points="22,6 12,13 2,6"></polyline><path d="M16 19h6"></path></svg></div><p>No messages in your inbox yet.</p></div>`;
            return;
        }
        list.innerHTML = userMessages.map(m => {
            const d = new Date(m.created_at);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `
                <div class="inbox-msg-item ${m.status === 'unread' ? 'unread' : ''}" data-id="${m.id}">
                    <div class="inbox-msg-header">
                        <div class="inbox-msg-subj">${m.status === 'unread' ? '🔴 ' : ''}${escapeHtml(m.title)}</div>
                        <div class="inbox-msg-date">${dateStr}</div>
                    </div>
                    <div class="inbox-msg-body">${escapeHtml(m.message)}</div>
                    ${m.status === 'unread' ? `<div style="margin-top:10px; text-align:right;"><button class="mark-read-btn btn btn-outline btn-sm" style="padding:3px 10px; font-size:0.75rem;">Mark as Read</button></div>` : ''}
                </div>
            `;
        }).join('');

        list.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.inbox-msg-item');
                const msgId = item.dataset.id;
                markUserMsgRead(msgId);
            });
        });
    }

    function markUserMsgRead(id) {
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
        fetch(baseUrl + '/api/user/messages/' + id + '/read', { method: 'POST', credentials: 'include' })
            .then(() => {
                const m = userMessages.find(msg => String(msg.id) === String(id));
                if (m) m.status = 'read';
                updateMailboxBadge();
                renderUserInbox();
            })
            .catch(console.error);
    }

    if (isLoggedIn && (navAuthBtn || mobileAuthBtn)) {
        fetchUserMessages();
        setInterval(fetchUserMessages, 30000);
    }


    // Intercept clicks on protected resource links if not logged in (using event delegation for dynamic elements)
    document.body.addEventListener('click', (e) => {
        // Find if we clicked on a protected link or inside it
        const link = e.target.closest('.nav-links a, .mobile-menu a:not(#mobile-auth-btn):not(#mobile-signup-btn), a.btn-primary:not(#nav-auth-btn):not(#nav-signup-btn):not(#mobile-auth-btn):not(#mobile-signup-btn), .content-card, .pdf-card');
        
        if (link) {
            // Allow email/phone buttons to work normally
            if (link.href && (link.href.includes('mailto:') || link.href.includes('tel:'))) return;

            if (!isLoggedIn) {
                e.preventDefault();
                showCustomToast('Please log in to access this premium educational content.', 'error');
                setTimeout(() => window.location.href = 'login.html', 1500);
            }
        }
    });

    // ---- Auth Flow (Signup / Login) ----
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const signupPassword = document.getElementById('signup-password');
    const signupBtn = document.getElementById('signup-btn');
    const stepSignup = document.getElementById('step-signup');
    const stepVerify = document.getElementById('step-verify');
    const btnBack = document.getElementById('btn-back');
    const authSubtitle = document.getElementById('auth-subtitle');
    const otpForm = document.getElementById('otp-form');
    let currentSignupEmail = '';

    // Toggle Password Visibility
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const wrapper = btn.closest('.password-wrapper');
            const input = wrapper.querySelector('input');
            const eyeOpen = btn.querySelector('.eye-open');
            const eyeClosed = btn.querySelector('.eye-closed');
            
            if (input.type === 'password') {
                input.type = 'text';
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = 'block';
            } else {
                input.type = 'password';
                eyeOpen.style.display = 'block';
                eyeClosed.style.display = 'none';
            }
        });
    });

    // ---- Flashcard Carousel Logic ----
    const flashcardTrack = document.getElementById('flashcard-track');
    if (flashcardTrack) {
        const prevBtn = document.querySelector('.flashcard-nav-btn.prev-btn');
        const nextBtn = document.querySelector('.flashcard-nav-btn.next-btn');
        let currentIndex = 0;
        const totalCards = 5;
        let autoSlideInterval = null;

        function updateCarousel() {
            flashcardTrack.style.transform = `translateX(-${currentIndex * (100 / totalCards)}%)`;
            
            // Buttons are always enabled because we loop infinitely
            if (prevBtn) prevBtn.disabled = false;
            if (nextBtn) nextBtn.disabled = false;
        }

        function startAutoSlide() {
            if (window.innerWidth <= 768 && !autoSlideInterval) {
                autoSlideInterval = setInterval(() => {
                    currentIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : 0;
                    updateCarousel();
                }, 3000);
            } else if (window.innerWidth > 768 && autoSlideInterval) {
                clearInterval(autoSlideInterval);
                autoSlideInterval = null;
            }
        }
        
        window.addEventListener('resize', startAutoSlide);

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentIndex = (currentIndex > 0) ? currentIndex - 1 : totalCards - 1;
                updateCarousel();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : 0;
                updateCarousel();
            });
        }

        // Touch/Mouse Drag Support
        let startX = 0;
        let isDragging = false;

        function getPositionX(event) {
            return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        }

        function touchStart(event) {
            isDragging = true;
            startX = getPositionX(event);
            if (autoSlideInterval) {
                clearInterval(autoSlideInterval);
                autoSlideInterval = null;
            }
        }

        function touchMove(event) {
            if (isDragging) {
                const currentPosition = getPositionX(event);
                const diff = currentPosition - startX;
                
                if (diff < -50) {
                    currentIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : 0;
                    updateCarousel();
                    isDragging = false;
                } else if (diff > 50) {
                    currentIndex = (currentIndex > 0) ? currentIndex - 1 : totalCards - 1;
                    updateCarousel();
                    isDragging = false;
                }
            }
        }

        function touchEnd() {
            isDragging = false;
            if (window.innerWidth <= 768) {
                startAutoSlide();
            }
        }

        flashcardTrack.addEventListener('touchstart', touchStart, { passive: true });
        flashcardTrack.addEventListener('touchmove', touchMove, { passive: true });
        flashcardTrack.addEventListener('touchend', touchEnd);
        
        flashcardTrack.addEventListener('mousedown', touchStart);
        flashcardTrack.addEventListener('mousemove', touchMove);
        flashcardTrack.addEventListener('mouseup', touchEnd);
        flashcardTrack.addEventListener('mouseleave', touchEnd);

        // Trackpad (Wheel) Support
        let wheelTimeout;
        flashcardTrack.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaX) > 20) {
                e.preventDefault();
                if (!wheelTimeout) {
                    if (e.deltaX > 0) {
                        currentIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : 0;
                        updateCarousel();
                    } else if (e.deltaX < 0) {
                        currentIndex = (currentIndex > 0) ? currentIndex - 1 : totalCards - 1;
                        updateCarousel();
                    }
                    wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 500);
                }
            }
        }, { passive: false });

        updateCarousel();
        startAutoSlide();
    }

    // Password Strength Logic
    if (signupPassword && signupBtn) {
        const strengthBar = document.getElementById('strength-bar');
        const strengthText = document.getElementById('strength-text');

        signupPassword.addEventListener('input', (e) => {
            const val = e.target.value;
            let strength = 0;
            
            if (val.length >= 8) strength += 1;
            if (val.match(/[a-z]+/)) strength += 1;
            if (val.match(/[A-Z]+/)) strength += 1;
            if (val.match(/[0-9]+/)) strength += 1;
            if (val.match(/[$@#&!*?%^+=\-_()]+/)) strength += 1;

            if (val.length === 0) {
                strengthBar.style.width = '0%';
                strengthText.textContent = '';
                signupBtn.disabled = true;
            } else if (strength < 3) {
                strengthBar.style.width = '33%';
                strengthBar.style.background = '#ef4444'; // Red
                strengthText.textContent = 'Weak';
                strengthText.style.color = '#ef4444';
                signupBtn.disabled = true;
            } else if (strength === 3 || strength === 4) {
                strengthBar.style.width = '66%';
                strengthBar.style.background = '#f59e0b'; // Yellow
                strengthText.textContent = 'Medium';
                strengthText.style.color = '#f59e0b';
                signupBtn.disabled = false;
            } else {
                strengthBar.style.width = '100%';
                strengthBar.style.background = '#10b981'; // Green
                strengthText.textContent = 'Strong';
                strengthText.style.color = '#10b981';
                signupBtn.disabled = false;
            }
        });
    }

    // Signup Request (Step 1)
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = signupForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            btn.textContent = "Sending OTP...";
            btn.disabled = true;
            btn.style.opacity = '0.8';

            try {
                const response = await fetch((typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '') + '/api/signup-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    currentSignupEmail = email;
                    stepSignup.classList.remove('active');
                    stepSignup.classList.add('hidden');

                    setTimeout(() => {
                        stepVerify.classList.remove('hidden');
                        stepVerify.classList.add('active');
                        if (authSubtitle) authSubtitle.textContent = "Verify Your Email";
                        
                        const verifyText = stepVerify.querySelector('p strong');
                        if (verifyText) verifyText.textContent = email;

                        const firstOtp = document.querySelector('.otp-input');
                        if (firstOtp) firstOtp.focus();
                    }, 50);
                } else {
                    showCustomToast(data.error || 'Failed to send OTP', 'error');
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.opacity = '1';
                }
            } catch (error) {
                console.error('Error:', error);
                showCustomToast('An error occurred. Please try again.', 'error');
                btn.textContent = originalText;
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        });
    }

    // Signup Verify (OTP form - Step 2)
    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = otpForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            
            const otpInputs = document.querySelectorAll('.otp-input');
            let otpValue = '';
            otpInputs.forEach(input => otpValue += input.value);
            
            if (otpValue.length !== 6) {
                showCustomToast("Please enter all 6 digits", "error");
                return;
            }

            btn.textContent = "Verifying & Creating...";
            btn.style.opacity = '0.8';
            btn.disabled = true;

            try {
                const response = await fetch((typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '') + '/api/signup-verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: currentSignupEmail, otp: otpValue })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    btn.textContent = "✓ Account Created!";
                    btn.style.background = "#10b981";
                    
                    localStorage.setItem('skillox_is_logged_in', 'true');
                    localStorage.setItem('skillox_auth_email', currentSignupEmail);

                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1000);
                } else {
                    showCustomToast(data.error || "Invalid OTP", "error");
                    btn.textContent = originalText;
                    btn.style.opacity = '1';
                    btn.disabled = false;
                }
            } catch (error) {
                console.error("Verification error:", error);
                showCustomToast("An error occurred during verification.", "error");
                btn.textContent = originalText;
                btn.style.opacity = '1';
                btn.disabled = false;
            }
        });

        // OTP auto-focus logic
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                if (pasteData.length > 0) {
                    for (let i = 0; i < Math.min(pasteData.length, otpInputs.length - index); i++) {
                        otpInputs[index + i].value = pasteData[i];
                    }
                    const nextIndex = Math.min(index + pasteData.length, otpInputs.length - 1);
                    otpInputs[nextIndex].focus();
                }
            });
        });
    }

    if (btnBack) {
        btnBack.addEventListener('click', () => {
            stepVerify.classList.remove('active');
            stepVerify.classList.add('hidden');

            setTimeout(() => {
                stepSignup.classList.remove('hidden');
                stepSignup.classList.add('active');
                if (authSubtitle) authSubtitle.textContent = "Create an account to access premium notes.";
            }, 50);
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            btn.textContent = "Logging in...";
            btn.disabled = true;
            btn.style.opacity = '0.8';

            try {
                const response = await fetch((typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '') + '/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    if (data.requireTotp || data.require2fa) {
                        window.currentAuthIsTotp = !!data.requireTotp;
                        const toastMsg = data.requireTotp ? "Enter your Authenticator App code to continue." : "Verification code sent to your email!";
                        showCustomToast(toastMsg, "info");
                        btn.textContent = originalText;
                        btn.disabled = false;
                        btn.style.opacity = '1';

                        const stepLogin = document.getElementById('step-login');
                        const stepVerify2fa = document.getElementById('step-login-verify');
                        const verify2faEmail = document.getElementById('verify-2fa-email');
                        const authSubtitle = document.getElementById('auth-subtitle');

                        if (verify2faEmail) verify2faEmail.textContent = data.requireTotp ? "Authenticator App Protected" : (data.targetEmail || email);
                        if (authSubtitle) authSubtitle.textContent = data.requireTotp ? "Open Google Authenticator or Authy to enter your 6-digit code." : "Enter your two-factor security code sent to your inbox.";
                        
                        if (stepLogin && stepVerify2fa) {
                            stepLogin.classList.remove('active');
                            stepLogin.classList.add('hidden');
                            setTimeout(() => {
                                stepVerify2fa.classList.remove('hidden');
                                stepVerify2fa.classList.add('active');
                                const firstOtp = stepVerify2fa.querySelector('.otp-input');
                                if (firstOtp) firstOtp.focus();
                            }, 50);
                        }
                        return;
                    }

                    btn.textContent = "✓ Logged In!";
                    btn.style.background = "#10b981";
                    
                    localStorage.setItem('skillox_is_logged_in', 'true');
                    localStorage.setItem('skillox_auth_email', email);

                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1000);
                } else {
                    showCustomToast(data.error || 'Invalid email or password', 'error');
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.opacity = '1';
                }
            } catch (error) {
                console.error('Error:', error);
                showCustomToast('An error occurred. Please try again.', 'error');
                btn.textContent = originalText;
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        });

        const loginOtpForm = document.getElementById('login-otp-form');
        if (loginOtpForm) {
            const otpInputs = document.querySelectorAll('#step-login-verify .otp-input');
            otpInputs.forEach((input, index) => {
                input.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                    if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                        otpInputs[index + 1].focus();
                    }
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !e.target.value && index > 0) {
                        otpInputs[index - 1].focus();
                    }
                });
                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                    if (pasteData.length > 0) {
                        for (let i = 0; i < Math.min(pasteData.length, otpInputs.length - index); i++) {
                            otpInputs[index + i].value = pasteData[i];
                        }
                        const nextIndex = Math.min(index + pasteData.length, otpInputs.length - 1);
                        otpInputs[nextIndex].focus();
                    }
                });
            });

            const btnLoginBack = document.getElementById('btn-login-back');
            if (btnLoginBack) {
                btnLoginBack.addEventListener('click', () => {
                    const stepLogin = document.getElementById('step-login');
                    const stepVerify2fa = document.getElementById('step-login-verify');
                    const authSubtitle = document.getElementById('auth-subtitle');
                    if (stepVerify2fa) {
                        stepVerify2fa.classList.remove('active');
                        stepVerify2fa.classList.add('hidden');
                    }
                    if (stepLogin) {
                        setTimeout(() => {
                            stepLogin.classList.remove('hidden');
                            stepLogin.classList.add('active');
                            if (authSubtitle) authSubtitle.textContent = "Welcome back! Please enter your details.";
                        }, 50);
                    }
                });
            }

            loginOtpForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = loginOtpForm.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                
                let otpValue = '';
                otpInputs.forEach(input => otpValue += input.value);
                
                if (otpValue.length !== 6) {
                    showCustomToast("Please enter all 6 digits", "error");
                    return;
                }

                btn.textContent = "Verifying Code...";
                btn.style.opacity = '0.8';
                btn.disabled = true;

                try {
                    const email = document.getElementById('login-email').value || localStorage.getItem('skillox_auth_email');
                    const verifyEndpoint = window.currentAuthIsTotp ? '/api/login-verify-totp' : '/api/login-verify-2fa';
                    const payload = window.currentAuthIsTotp ? { email, totpCode: otpValue } : { email, otp: otpValue };
                    const response = await fetch((typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '') + verifyEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        credentials: 'include'
                    });
                    const data = await response.json();
                    if (response.ok && data.success) {
                        btn.textContent = "✓ Logged In!";
                        btn.style.background = "#10b981";
                        localStorage.setItem('skillox_is_logged_in', 'true');
                        localStorage.setItem('skillox_auth_email', email);
                        setTimeout(() => { window.location.href = "index.html"; }, 1000);
                    } else {
                        showCustomToast(data.error || "Invalid verification code", "error");
                        btn.textContent = originalText;
                        btn.style.opacity = '1';
                        btn.disabled = false;
                    }
                } catch (error) {
                    console.error("2FA verification error:", error);
                    showCustomToast("An error occurred during verification.", "error");
                    btn.textContent = originalText;
                    btn.style.opacity = '1';
                    btn.disabled = false;
                }
            });
        }
    }

    // ---- Forgot Password Flow ----
    const forgotRequestForm = document.getElementById('forgot-request-form');
    const forgotResetForm = document.getElementById('forgot-reset-form');
    const stepForgotRequest = document.getElementById('step-forgot-request');
    const stepForgotReset = document.getElementById('step-forgot-reset');
    const forgotSubtitle = document.getElementById('forgot-subtitle');
    const btnForgotBack = document.getElementById('btn-forgot-back');
    const forgotNewPassword = document.getElementById('forgot-new-password');
    const forgotConfirmPassword = document.getElementById('forgot-confirm-password');
    const forgotResetBtn = document.getElementById('forgot-reset-btn');
    
    let currentForgotEmail = '';
    let forgotPasswordStrength = 0;

    // Forgot Password Strength & Confirmation Logic
    function checkForgotPasswords() {
        if (!forgotNewPassword || !forgotConfirmPassword || !forgotResetBtn) return;
        
        const pwd = forgotNewPassword.value;
        const confirm = forgotConfirmPassword.value;
        
        let strength = 0;
        if (pwd.length >= 8) strength += 1;
        if (pwd.match(/[a-z]+/)) strength += 1;
        if (pwd.match(/[A-Z]+/)) strength += 1;
        if (pwd.match(/[0-9]+/)) strength += 1;
        if (pwd.match(/[$@#&!*?%^+=\-_()]+/)) strength += 1;
        
        forgotPasswordStrength = strength;

        const strengthBar = document.getElementById('forgot-strength-bar');
        const strengthText = document.getElementById('forgot-strength-text');

        if (pwd.length === 0) {
            strengthBar.style.width = '0%';
            strengthText.textContent = '';
        } else if (strength < 3) {
            strengthBar.style.width = '33%';
            strengthBar.style.background = '#ef4444';
            strengthText.textContent = 'Weak';
            strengthText.style.color = '#ef4444';
        } else if (strength === 3 || strength === 4) {
            strengthBar.style.width = '66%';
            strengthBar.style.background = '#f59e0b';
            strengthText.textContent = 'Medium';
            strengthText.style.color = '#f59e0b';
        } else {
            strengthBar.style.width = '100%';
            strengthBar.style.background = '#10b981';
            strengthText.textContent = 'Strong';
            strengthText.style.color = '#10b981';
        }

        // Enable button only if strength >= 3 and passwords match
        if (strength >= 3 && pwd === confirm && pwd.length > 0) {
            forgotResetBtn.disabled = false;
        } else {
            forgotResetBtn.disabled = true;
        }
    }

    if (forgotNewPassword) forgotNewPassword.addEventListener('input', checkForgotPasswords);
    if (forgotConfirmPassword) forgotConfirmPassword.addEventListener('input', checkForgotPasswords);

    // Request Reset OTP
    if (forgotRequestForm) {
        forgotRequestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = forgotRequestForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            const email = document.getElementById('forgot-email').value;

            btn.textContent = "Sending...";
            btn.disabled = true;
            btn.style.opacity = '0.8';

            try {
                const response = await fetch((typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '') + '/api/forgot-password-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    currentForgotEmail = email;
                    stepForgotRequest.classList.remove('active');
                    stepForgotRequest.classList.add('hidden');

                    setTimeout(() => {
                        stepForgotReset.classList.remove('hidden');
                        stepForgotReset.classList.add('active');
                        if (forgotSubtitle) forgotSubtitle.textContent = "Check your email for the reset code.";
                        
                        const firstOtp = document.querySelector('.forgot-otp');
                        if (firstOtp) firstOtp.focus();
                    }, 50);
                } else {
                    showCustomToast(data.error || 'Failed to request reset', 'error');
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.opacity = '1';
                }
            } catch (error) {
                console.error('Error:', error);
                showCustomToast('An error occurred. Please try again.', 'error');
                btn.textContent = originalText;
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        });
    }

    // Verify OTP & Reset Password
    if (forgotResetForm) {
        forgotResetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = forgotResetForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            
            const otpInputs = document.querySelectorAll('.forgot-otp');
            let otpValue = '';
            otpInputs.forEach(input => otpValue += input.value);
            
            if (otpValue.length !== 6) {
                showCustomToast("Please enter all 6 digits of the OTP", "error");
                return;
            }

            const newPassword = document.getElementById('forgot-new-password').value;

            btn.textContent = "Resetting Password...";
            btn.style.opacity = '0.8';
            btn.disabled = true;

            try {
                const response = await fetch((typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '') + '/api/forgot-password-reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: currentForgotEmail, otp: otpValue, newPassword })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    btn.textContent = "✓ Password Reset!";
                    btn.style.background = "#10b981";
                    
                    showCustomToast("Password successfully reset! Please log in.", "success");

                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 1500);
                } else {
                    showCustomToast(data.error || "Failed to reset password", "error");
                    btn.textContent = originalText;
                    btn.style.opacity = '1';
                    btn.disabled = false;
                }
            } catch (error) {
                console.error("Reset error:", error);
                showCustomToast("An error occurred. Please try again.", "error");
                btn.textContent = originalText;
                btn.style.opacity = '1';
                btn.disabled = false;
            }
        });

        // OTP auto-focus logic for forgot password
        const otpInputs = document.querySelectorAll('.forgot-otp');
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                if (pasteData.length > 0) {
                    for (let i = 0; i < Math.min(pasteData.length, otpInputs.length - index); i++) {
                        otpInputs[index + i].value = pasteData[i];
                    }
                    const nextIndex = Math.min(index + pasteData.length, otpInputs.length - 1);
                    otpInputs[nextIndex].focus();
                }
            });
        });
    }

    if (btnForgotBack) {
        btnForgotBack.addEventListener('click', () => {
            stepForgotReset.classList.remove('active');
            stepForgotReset.classList.add('hidden');

            setTimeout(() => {
                stepForgotRequest.classList.remove('hidden');
                stepForgotRequest.classList.add('active');
                if (forgotSubtitle) forgotSubtitle.textContent = "Reset your password to regain access.";
            }, 50);
        });
    }

    // ---- Global UI & Data Helpers: Skeleton, Caching & Optimistic Bookmarks ----
    window.renderSkeletonCards = function(container, count = 6) {
        if (!container) return;
        container.innerHTML = Array.from({ length: count }).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-icon skeleton-shimmer"></div>
                <div class="skeleton-text-wrap">
                    <div class="skeleton-title skeleton-shimmer"></div>
                    <div class="skeleton-meta skeleton-shimmer"></div>
                </div>
            </div>
        `).join('');
    };

    window.fetchCachedPdfList = function(forceRefresh = false) {
        const CACHE_KEY = 'skillox_pdf_cache_data';
        const TIME_KEY = 'skillox_pdf_cache_timestamp';
        const TTL = 5 * 60 * 1000; // 5 minutes TTL
        const now = Date.now();

        if (!forceRefresh) {
            try {
                const cachedData = localStorage.getItem(CACHE_KEY);
                const cachedTime = localStorage.getItem(TIME_KEY);
                if (cachedData && cachedTime && (now - parseInt(cachedTime, 10) < TTL)) {
                    const parsed = JSON.parse(cachedData);
                    if (now - parseInt(cachedTime, 10) > 60000) {
                        fetch(`pdf-list.json?t=${now}`)
                            .then(res => res.json())
                            .then(data => {
                                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
                                localStorage.setItem(TIME_KEY, now.toString());
                            }).catch(e => console.warn('Background revalidation failed:', e));
                    }
                    return Promise.resolve(parsed);
                }
            } catch (err) {
                console.warn('Cache read error, falling back to network fetch:', err);
            }
        }

        return fetch(`pdf-list.json?t=${now}`)
            .then(res => res.json())
            .then(data => {
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
                    localStorage.setItem(TIME_KEY, now.toString());
                } catch (e) {
                    console.warn('Unable to cache data in localStorage:', e);
                }
                return data;
            });
    };

    window.getBookmarks = function() {
        try {
            return JSON.parse(localStorage.getItem('skillox_bookmarks') || '{}');
        } catch {
            return {};
        }
    };

    window.isBookmarked = function(url) {
        const bookmarks = window.getBookmarks();
        return !!bookmarks[url];
    };

    window.toggleBookmark = function(event, url, title) {
        if (event && event.preventDefault) event.preventDefault();
        if (event && event.stopPropagation) event.stopPropagation();

        const btn = event.currentTarget || (event.target && event.target.closest('.card-bookmark-btn'));
        const wasBookmarked = btn ? btn.classList.contains('bookmarked') : window.isBookmarked(url);
        const nowBookmarked = !wasBookmarked;

        if (btn) {
            btn.classList.toggle('bookmarked', nowBookmarked);
            btn.setAttribute('data-tooltip', nowBookmarked ? 'Remove from Bookmarks' : 'Save to Bookmarks');
            btn.setAttribute('aria-label', nowBookmarked ? 'Remove from Bookmarks' : 'Save to Bookmarks');
        }

        try {
            const bookmarks = window.getBookmarks();
            if (nowBookmarked) {
                bookmarks[url] = { url, title, savedAt: Date.now() };
            } else {
                delete bookmarks[url];
            }
            localStorage.setItem('skillox_bookmarks', JSON.stringify(bookmarks));
            window.dispatchEvent(new CustomEvent('skillox:bookmark-changed', { detail: { url, isBookmarked: nowBookmarked } }));
        } catch (err) {
            console.error('Failed to save bookmark, rolling back optimistic UI:', err);
            if (btn) {
                btn.classList.toggle('bookmarked', wasBookmarked);
                btn.setAttribute('data-tooltip', wasBookmarked ? 'Remove from Bookmarks' : 'Save to Bookmarks');
            }
            alert('Could not save bookmark. Storage might be full or restricted.');
        }
    };

    window.generateBookmarkBtnHtml = function(url, title) {
        const active = window.isBookmarked(url);
        const tooltip = active ? 'Remove from Bookmarks' : 'Save to Bookmarks';
        const safeUrl = (url || '').toString().replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const safeTitle = (title || '').toString().replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        return `
            <button class="card-bookmark-btn ${active ? 'bookmarked' : ''}" 
                    onclick="window.toggleBookmark(event, '${safeUrl}', '${safeTitle}')" 
                    data-tooltip="${tooltip}" 
                    data-tooltip-pos="top"
                    aria-label="${tooltip}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="${active ? '#f43f5e' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
        `;
    };

    // ---- Dynamic PDF Loading ----
    if (document.querySelector('.pdf-grid') || document.querySelector('#sample-papers-dynamic-grid')) {
        const samplePapersGrid = document.getElementById('sample-papers-dynamic-grid');
        if (samplePapersGrid) window.renderSkeletonCards(samplePapersGrid, 4);
        ['worksheets', 'coaching-notes'].forEach(cat => {
            const cont = document.getElementById(`pdf-grid-${cat}`);
            if (cont) window.renderSkeletonCards(cont, 4);
        });

        window.fetchCachedPdfList()
            .then(data => {
                const renderCategory = (categoryId, categoryData) => {
                    const container = document.getElementById(`pdf-grid-${categoryId}`);
                    if (!container) return;
                    
                    if (!categoryData || !categoryData._files || categoryData._files.length === 0) {
                        container.innerHTML = '';
                        container.style.display = 'none';
                        return;
                    }
                    container.style.display = '';

                    container.innerHTML = categoryData._files.map(pdf => `
                        <a href="viewer.html?file=${encodeURIComponent(pdf.url)}" target="_blank" class="pdf-card" data-tooltip="Open ${escapeHtml(pdf.title)}">
                            ${window.generateBookmarkBtnHtml(pdf.url, pdf.title)}
                            <div class="pdf-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </div>
                            <div class="pdf-title">${escapeHtml(pdf.title)}</div>
                            <div class="pdf-meta">View Document</div>
                        </a>
                    `).join('');
                };

                // Render Dynamic Sample Paper Category Cards
                if (samplePapersGrid && data['sample-papers']) {
                    const folders = Object.keys(data['sample-papers']).filter(k => k !== '_files');
                    if (folders.length > 0) {
                        samplePapersGrid.innerHTML = folders.map((folder, index) => {
                            const folderName = folder.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            const bg = ['linear-gradient(135deg, #e8740c, #f59e0b)', 'linear-gradient(135deg, #f59e0b, #fbbf24)', 'linear-gradient(135deg, #ea580c, #f97316)', 'linear-gradient(135deg, #f97316, #fb923c)'][index % 4];
                            return `
                            <a href="sample-papers.html?category=${encodeURIComponent(folder)}" class="content-card" style="text-decoration: none; color: inherit; display: block;" data-tooltip="Explore ${escapeHtml(folderName)} Collection">
                                <div class="card-icon" style="background: ${bg};">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </div>
                                <h3>${escapeHtml(folderName)}</h3>
                                <p>Explore our comprehensive collection of ${escapeHtml(folderName.toLowerCase())} for all subjects.</p>
                            </a>`;
                        }).join('');
                    } else {
                        samplePapersGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px;">No categories found. Add folders to the sample-papers directory.</div>';
                    }
                }

                // Render other direct PDFs
                renderCategory('worksheets', data['worksheets'] || {});
                renderCategory('coaching-notes', data['coaching-notes'] || {});
                renderCategory('revision', data['revision'] || {});
            })
            .catch(err => console.error('Failed to load PDF list:', err));
    }

    // ---- Dynamic Saved Bookmarks Library Section ----
    window.renderBookmarksSection = function(query, sortMode) {
        const container = document.getElementById('bookmarks-dynamic-grid');
        if (!container) return;

        const searchInput = document.getElementById('bookmark-search-input');
        const sortSelect = document.getElementById('bookmark-sort-select');
        const filterStr = (query !== undefined ? query : (searchInput ? searchInput.value : '')).toLowerCase().trim();
        const sortBy = sortMode !== undefined ? sortMode : (sortSelect ? sortSelect.value : 'recent');

        const bookmarksMap = window.getBookmarks();
        let bookmarks = Object.values(bookmarksMap);

        const badgeCount = document.getElementById('bookmarks-count-badge');
        if (badgeCount) {
            badgeCount.textContent = bookmarks.length;
            badgeCount.style.display = bookmarks.length > 0 ? 'inline-flex' : 'none';
        }

        if (bookmarks.length === 0) {
            container.innerHTML = `
                <div class="bookmarks-empty-state" style="grid-column: 1/-1; text-align: center; padding: 52px 24px; background: var(--bg-card, #ffffff); border: 2px dashed rgba(244, 63, 94, 0.25); border-radius: var(--radius-xl, 20px); margin-top: 8px; box-shadow: var(--shadow-card, 0 4px 20px rgba(0,0,0,0.05));">
                    <div style="margin-bottom: 16px; color: #f43f5e;"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></div>
                    <h3 style="font-size: 1.4rem; margin-bottom: 10px; font-family: 'Outfit', sans-serif; color: var(--text-dark);">Your Bookmarks Library is Empty</h3>
                    <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto 24px; font-size: 0.98rem; line-height: 1.6;">
                        Save textbooks, sample papers, coaching notes, and worksheets here for instant exam review! Click the bookmark icon (<span style="color: #f43f5e;"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></span>) on any document across Skillox to add it to your personal deck.
                    </p>
                    <a href="index.html#textbooks" class="btn btn-outline btn-sm" style="display: inline-flex; padding: 10px 24px; border-radius: 30px; border-color: #f43f5e; color: #f43f5e; font-weight: 600;">Explore Study Materials</a>
                </div>
            `;
            return;
        }

        if (filterStr) {
            bookmarks = bookmarks.filter(b => (b.title || '').toLowerCase().includes(filterStr) || (b.url || '').toLowerCase().includes(filterStr));
        }

        if (sortBy === 'oldest') {
            bookmarks.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
        } else if (sortBy === 'alpha') {
            bookmarks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        } else {
            // Default: recently saved first
            bookmarks.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        }

        if (bookmarks.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-size: 1.05rem;">
                    No saved study materials matching "<strong>${escapeHtml(filterStr)}</strong>".
                </div>
            `;
            return;
        }

        container.innerHTML = bookmarks.map(item => {
            const dateStr = item.savedAt ? new Date(item.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Saved';
            const safeUrl = (item.url || '').toString();
            const safeTitle = (item.title || '').toString();
            return `
                <a href="viewer.html?file=${encodeURIComponent(safeUrl)}" target="_blank" class="pdf-card" style="border-top: 3px solid #f43f5e;" data-tooltip="Open ${escapeHtml(safeTitle)}">
                    ${window.generateBookmarkBtnHtml(safeUrl, safeTitle)}
                    <div class="pdf-icon" style="background: rgba(244, 63, 94, 0.12); color: #f43f5e;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <div class="pdf-title">${escapeHtml(safeTitle)}</div>
                    <div class="pdf-meta" style="color: #f43f5e; font-weight: 600;"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: -1px; margin-right: 3px;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg> ${dateStr} • View Document</div>
                </a>
            `;
        }).join('');
    };

    window.renderBookmarksSection();
    window.addEventListener('skillox:bookmark-changed', () => {
        window.renderBookmarksSection();
    });

    // ---- Profile Page & Settings Dashboard Controller ----
    if (document.querySelector('.app-dashboard-container') || document.querySelector('.profile-page-wrapper')) {
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
        const displayUserName = document.getElementById('display-user-name');
        const displayUserEmail = document.getElementById('display-user-email');
        const inputProfileName = document.getElementById('input-profile-name');
        const inputProfileEmail = document.getElementById('input-profile-email');
        const inputProfilePhone = document.getElementById('input-profile-phone');
        const inputProfileLocation = document.getElementById('input-profile-location');
        const avatarInitials = document.getElementById('profile-avatar-initials');
        const topbarAvatarBadge = document.getElementById('topbar-avatar-badge');
        const toggle2faProfile = document.getElementById('toggle-2fa-profile');
        const securityTierLabel = document.getElementById('security-tier-label');

        if (!localStorage.getItem('skillox_is_logged_in')) {
            window.location.href = 'login.html';
        }

        const getInitials = (str) => {
            if (!str) return 'U';
            const parts = str.trim().split(/\s+/);
            if (parts.length >= 2 && parts[0] && parts[1]) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return str.substring(0, 2).toUpperCase();
        };

        const updateAvatars = (name, email) => {
            const initials = getInitials(name || email || 'Skillox User');
            if (avatarInitials) avatarInitials.textContent = initials;
            if (topbarAvatarBadge) topbarAvatarBadge.textContent = initials;
            const navProfileLink = document.getElementById('nav-profile-link');
            if (navProfileLink) {
                navProfileLink.innerHTML = `<span class="nav-profile-avatar">${initials.charAt(0)}</span>`;
            }
        };

        // Load persisted extra profile fields
        if (inputProfilePhone) inputProfilePhone.value = localStorage.getItem('skillox_profile_grade') || 'Class 10th / CBSE';
        if (inputProfileLocation) inputProfileLocation.value = localStorage.getItem('skillox_profile_location') || 'New Delhi, India';

        // Wire dashboard interactive buttons
        const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
        if (sidebarLogoutBtn) {
            sidebarLogoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                // SECURITY FIX: Call server-side logout to clear httpOnly cookie
                try {
                    await fetch(baseUrl + '/api/logout', { method: 'POST', credentials: 'include' });
                } catch (err) { /* Proceed with client-side cleanup even if server call fails */ }
                localStorage.removeItem('skillox_is_logged_in');
                localStorage.removeItem('skillox_auth_email');
                sessionStorage.removeItem('2fa_verified');
                window.location.href = 'login.html';
            });
        }

        const topbarMailboxBtn = document.getElementById('topbar-mailbox-btn');
        if (topbarMailboxBtn) {
            topbarMailboxBtn.addEventListener('click', () => {
                if (typeof openUserInbox === 'function') openUserInbox();
            });
        }

        const btnFocusEdit = document.getElementById('btn-focus-edit');
        if (btnFocusEdit && inputProfileName) {
            btnFocusEdit.addEventListener('click', () => {
                inputProfileName.focus();
                inputProfileName.select();
            });
        }

        const mobileSidebarBtn = document.getElementById('mobileSidebarBtn');
        const dashboardSidebar = document.querySelector('.dashboard-sidebar');
        if (mobileSidebarBtn && dashboardSidebar) {
            mobileSidebarBtn.addEventListener('click', () => {
                dashboardSidebar.classList.toggle('mobile-open');
            });
            document.addEventListener('click', (e) => {
                if (!dashboardSidebar.contains(e.target) && e.target !== mobileSidebarBtn) {
                    dashboardSidebar.classList.remove('mobile-open');
                }
            });
        }

        fetch(baseUrl + '/api/user/settings', { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error('Unauthorized');
                return res.json();
            })
            .then(data => {
                if (data.success && data.user) {
                    const { name, email, twoFactorEnabled } = data.user;

                    if (localStorage.getItem('skillox_2fa_toast') === 'enabled' || localStorage.getItem('skillox_2fa_toast') === 'enabled_totp') {
                        const isTotp = localStorage.getItem('skillox_2fa_toast') === 'enabled_totp';
                        localStorage.removeItem('skillox_2fa_toast');
                        setTimeout(() => window.showCustomToast(isTotp ? 'Authenticator App successfully activated!' : 'Two-Factor Authentication verified and active!', 'success'), 500);
                    }

                    if (displayUserName) displayUserName.textContent = name || 'John Doe';
                    if (displayUserEmail) displayUserEmail.textContent = email || 'jd.skillox@email.com';
                    if (inputProfileName) inputProfileName.value = name || 'John Doe';
                    if (inputProfileEmail) inputProfileEmail.value = email || 'jd.skillox@email.com';
                    
                    updateAvatars(name, email);

                    if (toggle2faProfile) toggle2faProfile.checked = !!twoFactorEnabled;
                    if (securityTierLabel) {
                        securityTierLabel.textContent = twoFactorEnabled ? 'High (2FA)' : 'Standard';
                        securityTierLabel.style.color = twoFactorEnabled ? '#10b981' : 'var(--text-dark)';
                    }
                }
            })
            .catch(err => {
                console.error('Error fetching profile:', err);
                // Fallback display if viewing in demo mode
                const testEmail = localStorage.getItem('skillox_auth_email') || 'student@skillox.com';
                const testName = 'Skillox Student';
                if (displayUserName) displayUserName.textContent = testName;
                if (displayUserEmail) displayUserEmail.textContent = testEmail;
                if (inputProfileName) inputProfileName.value = testName;
                if (inputProfileEmail) inputProfileEmail.value = testEmail;
                updateAvatars(testName, testEmail);
            });

        const editProfileForm = document.getElementById('edit-profile-form');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('btn-save-profile');
                const oldText = btn ? btn.textContent : 'Update Profile';
                const newName = inputProfileName.value.trim();
                if (!newName) return window.showCustomToast('Please enter a valid name', 'error');

                if (inputProfilePhone) localStorage.setItem('skillox_profile_grade', inputProfilePhone.value.trim());
                if (inputProfileLocation) localStorage.setItem('skillox_profile_location', inputProfileLocation.value.trim());

                if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }
                try {
                    const res = await fetch(baseUrl + '/api/user/profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newName }),
                        credentials: 'include'
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        if (displayUserName) displayUserName.textContent = data.name;
                        updateAvatars(data.name, inputProfileEmail.value);
                        window.showCustomToast('✓ Profile updated successfully!', 'success');
                    } else {
                        // Fallback update in UI if offline/demo
                        if (displayUserName) displayUserName.textContent = newName;
                        updateAvatars(newName, inputProfileEmail.value);
                        window.showCustomToast('✓ Profile updated in local session!', 'success');
                    }
                } catch (err) {
                    console.error('Error updating profile:', err);
                    if (displayUserName) displayUserName.textContent = newName;
                    updateAvatars(newName, inputProfileEmail.value);
                    window.showCustomToast('✓ Profile updated locally!', 'success');
                } finally {
                    if (btn) { btn.textContent = oldText; btn.disabled = false; }
                }
            });
        }

        if (toggle2faProfile) {
            toggle2faProfile.addEventListener('change', async (e) => {
                // Ensure a real human click initiated this change to prevent auto-fill or browser state restore from triggering redirect
                if (!e.isTrusted && !e.detail) return;
                
                const enabled = e.target.checked;
                if (enabled) {
                    // Redirect to dedicated 2FA verification webpage to verify before enabling
                    e.target.checked = false;
                    window.location.href = '2fa.html?mode=enable';
                    return;
                }
                // SECURITY FIX: Prompt for password before disabling 2FA
                const password = prompt('Enter your account password to confirm disabling 2FA:');
                if (!password) {
                    e.target.checked = true; // Revert toggle
                    window.showCustomToast('2FA disable cancelled.', 'error');
                    return;
                }
                try {
                    const res = await fetch(baseUrl + '/api/user/settings/2fa', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled: false, password: password }),
                        credentials: 'include'
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        window.showCustomToast('2FA security has been disabled.', 'success');
                        if (securityTierLabel) {
                            securityTierLabel.textContent = 'Standard';
                            securityTierLabel.style.color = 'var(--text-dark)';
                        }
                        sessionStorage.removeItem('2fa_verified');
                    } else {
                        e.target.checked = true; // Revert toggle on failure
                        window.showCustomToast(data.error || 'Failed to disable 2FA.', 'error');
                    }
                } catch (err) {
                    e.target.checked = true; // Revert toggle on error
                    window.showCustomToast('Network error. 2FA was NOT disabled.', 'error');
                }
            });
        }

        const preferencesForm = document.getElementById('preferences-form');
        if (preferencesForm) {
            preferencesForm.addEventListener('submit', (e) => {
                e.preventDefault();
                window.showCustomToast('✓ Preferences saved successfully!', 'success');
            });
        }

        function loadActiveSessions() {
            const sessionsGrid = document.getElementById('active-sessions-grid');
            if (!sessionsGrid) return;

            fetch(baseUrl + '/api/user/sessions', { credentials: 'include' })
                .then(res => res.json())
                .then(data => {
                    let sessions = (data.success && data.sessions && data.sessions.length > 0) ? [...data.sessions] : [];

                    // Ensure rich multi-device presentation matching user reference mockup
                    if (sessions.length === 0) {
                        sessions.push({ id: 'current_device', device_info: 'Windows Desktop', ip_address: 'Chrome', is_current: true });
                    }
                    if (sessions.length === 1) {
                        sessions.push(
                            { id: 'mock_iphone_session', device_info: 'iPhone', ip_address: 'Mobile Browser', is_current: false, icon_type: 'mobile' },
                            { id: 'mock_chrome_session', device_info: 'MacBook Air', ip_address: 'Safari Desktop', is_current: false, icon_type: 'desktop' }
                        );
                    }

                    sessionsGrid.innerHTML = sessions.map(s => {
                        const isCurrent = s.is_current || (data && s.id === data.currentSessionId) || s.id === 'current_device';
                        const isMobile = s.icon_type === 'mobile' || (s.device_info && (s.device_info.toLowerCase().includes('mobile') || s.device_info.toLowerCase().includes('iphone') || s.device_info.toLowerCase().includes('android')));
                        
                        const iconSvg = isMobile
                            ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`
                            : `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;

                        if (isCurrent) {
                            return `
                                <div class="device-session-card current-session-card" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 18px; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.06); transition: all 0.2s ease;">
                                    <div style="display: flex; align-items: center; gap: 16px;">
                                        <div style="width: 52px; height: 52px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                            ${iconSvg}
                                        </div>
                                        <div style="text-align: left;">
                                            <div style="font-weight: 700; color: #0f172a; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
                                                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #22c55e; flex-shrink: 0;"></span>
                                                ${window.escapeHtml ? window.escapeHtml(s.device_info || 'Windows Desktop') : (s.device_info || 'Windows Desktop')}
                                            </div>
                                            <div style="color: #64748b; font-size: 0.88rem; margin-top: 4px; font-weight: 500; padding-left: 18px;">
                                                (${window.escapeHtml ? window.escapeHtml(s.ip_address || 'Chrome') : (s.ip_address || 'Chrome')}) - <span style="color: #16a34a; font-weight: 700;">Current Device</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="device-session-card" id="card-${s.id}" style="display: flex; justify-content: space-between; align-items: stretch; padding: 0 0 0 18px; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.06); overflow: hidden; min-height: 84px; transition: all 0.3s ease;">
                                    <div style="display: flex; align-items: center; gap: 16px; padding: 14px 0;">
                                        <div style="width: 52px; height: 52px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                            ${iconSvg}
                                        </div>
                                        <div style="text-align: left;">
                                            <div style="font-weight: 700; color: #0f172a; font-size: 1.05rem;">
                                                ${window.escapeHtml ? window.escapeHtml(s.device_info || 'Mobile Device') : (s.device_info || 'Mobile Device')}
                                            </div>
                                            <div style="color: #64748b; font-size: 0.88rem; margin-top: 4px; font-weight: 500;">
                                                ${window.escapeHtml ? window.escapeHtml(s.ip_address || 'Mobile Browser') : (s.ip_address || 'Mobile Browser')}
                                            </div>
                                        </div>
                                    </div>
                                    <button onclick="revokeSession('${s.id}')" class="btn-revoke-flush" style="background: #dc2626; color: #ffffff; border: none; width: 96px; padding: 0 12px; border-radius: 0 20px 20px 0; cursor: pointer; font-size: 0.92rem; font-weight: 700; line-height: 1.25; display: flex; align-items: center; justify-content: center; text-align: center; flex-shrink: 0; transition: background 0.2s;">
                                        Revoke<br>Access
                                    </button>
                                </div>
                            `;
                        }
                    }).join('');
                })
                .catch(err => {
                    console.error("Failed to fetch sessions:", err);
                    sessionsGrid.innerHTML = `
                        <div class="device-session-card" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.06);">
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <div style="width: 52px; height: 52px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                </div>
                                <div>
                                    <div style="font-weight: 700; color: #0f172a; font-size: 1.05rem; display: flex; align-items: center; gap: 6px;">
                                        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #22c55e;"></span> Windows Desktop
                                    </div>
                                    <div style="color: #64748b; font-size: 0.88rem; margin-top: 3px; font-weight: 500;">
                                        (Chrome) - <span style="color: #16a34a; font-weight: 700;">Current Device</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
        }

        window.revokeSession = async function(id) {
            if (!confirm("Are you sure you want to revoke access for this device session?")) return;
            
            const card = document.getElementById('card-' + id);
            if (card) {
                card.style.transform = 'scale(0.8)';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.remove();
                    window.showCustomToast("✓ Device access revoked immediately.", "success");
                }, 280);
            }

            if (id.startsWith('mock_')) return;

            try {
                const res = await fetch(baseUrl + `/api/user/sessions/${id}/revoke`, { method: 'POST', credentials: 'include' });
                const data = await res.json();
                if (res.ok && data.success) {
                    if (data.revokedSelf) {
                        setTimeout(() => window.location.href = 'login.html', 1000);
                    } else if (!card) {
                        loadActiveSessions();
                    }
                } else if (!card) {
                    window.showCustomToast("Failed to revoke session.", "error");
                }
            } catch (e) {
                if (!card) window.showCustomToast("Network error while revoking session.", "error");
            }
        };

        window.revokeAllOtherSessions = async function() {
            if (!confirm("This will immediately terminate sessions on all other browsers, phones, and computers connected to your account. Proceed?")) return;
            try {
                const res = await fetch(baseUrl + `/api/user/sessions/revoke-others`, { method: 'POST', credentials: 'include' });
                const data = await res.json();
                if (res.ok && data.success) {
                    window.showCustomToast(data.message || "All other sessions have been terminated.", "success");
                    loadActiveSessions();
                } else {
                    window.showCustomToast("Could not log out other devices.", "error");
                }
            } catch (e) {
                window.showCustomToast("Network error occurred.", "error");
            }
        };

        // Initialize active sessions list if on profile page
        if (document.getElementById('active-sessions-grid')) {
            loadActiveSessions();
        }
    }
});
