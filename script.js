/* =============================================
   SKILLOX — Main JavaScript
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

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
    const isLoggedIn = localStorage.getItem('skillox_is_logged_in') === 'true';
    const authEmail = localStorage.getItem('skillox_auth_email');
    
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
                navAuthBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('skillox_is_logged_in');
                    localStorage.removeItem('skillox_auth_email');
                    window.location.reload();
                });
            }
        }
        
        if (mobileAuthBtn) {
            mobileAuthBtn.textContent = btnText;
            mobileAuthBtn.href = btnHref;
            if (isLoggedIn) {
                mobileAuthBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('skillox_is_logged_in');
                    localStorage.removeItem('skillox_auth_email');
                    window.location.reload();
                });
            }
        }
    }
    // Only run this if we are on a page that has these buttons
    if (navAuthBtn || mobileAuthBtn) {
        updateAuthButtons();
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

        function updateCarousel() {
            flashcardTrack.style.transform = `translateX(-${currentIndex * (100 / totalCards)}%)`;
            
            if (prevBtn) prevBtn.disabled = currentIndex === 0;
            if (nextBtn) nextBtn.disabled = currentIndex === totalCards - 1;
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    updateCarousel();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentIndex < totalCards - 1) {
                    currentIndex++;
                    updateCarousel();
                }
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
        }

        function touchMove(event) {
            if (isDragging) {
                const currentPosition = getPositionX(event);
                const diff = currentPosition - startX;
                
                if (diff < -50 && currentIndex < totalCards - 1) {
                    currentIndex++;
                    updateCarousel();
                    isDragging = false;
                } else if (diff > 50 && currentIndex > 0) {
                    currentIndex--;
                    updateCarousel();
                    isDragging = false;
                }
            }
        }

        function touchEnd() {
            isDragging = false;
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
                    if (e.deltaX > 0 && currentIndex < totalCards - 1) {
                        currentIndex++;
                        updateCarousel();
                    } else if (e.deltaX < 0 && currentIndex > 0) {
                        currentIndex--;
                        updateCarousel();
                    }
                    wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 500);
                }
            }
        }, { passive: false });

        updateCarousel();
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

    // ---- Dynamic PDF Loading ----
    if (document.querySelector('.pdf-grid') || document.querySelector('#sample-papers-dynamic-grid')) {
        fetch('pdf-list.json')
            .then(res => res.json())
            .then(data => {
                const renderCategory = (categoryId, categoryData) => {
                    const container = document.getElementById(`pdf-grid-${categoryId}`);
                    if (!container) return;
                    
                    if (!categoryData || !categoryData._files || categoryData._files.length === 0) {
                        return;
                    }

                    container.innerHTML = categoryData._files.map(pdf => `
                        <a href="viewer.html?file=${encodeURIComponent(pdf.url)}" target="_blank" class="pdf-card">
                            <div class="pdf-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            </div>
                            <div class="pdf-title">${pdf.title}</div>
                            <div class="pdf-meta">View Document</div>
                        </a>
                    `).join('');
                };

                // Render Dynamic Sample Paper Category Cards
                const samplePapersGrid = document.getElementById('sample-papers-dynamic-grid');
                if (samplePapersGrid && data['sample-papers']) {
                    const folders = Object.keys(data['sample-papers']).filter(k => k !== '_files');
                    if (folders.length > 0) {
                        samplePapersGrid.innerHTML = folders.map((folder, index) => {
                            const folderName = folder.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            const bg = ['linear-gradient(135deg, #e8740c, #f59e0b)', 'linear-gradient(135deg, #f59e0b, #fbbf24)', 'linear-gradient(135deg, #ea580c, #f97316)', 'linear-gradient(135deg, #f97316, #fb923c)'][index % 4];
                            return `
                            <a href="sample-papers.html?category=${encodeURIComponent(folder)}" class="content-card" style="text-decoration: none; color: inherit; display: block;">
                                <div class="card-icon" style="background: ${bg};">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </div>
                                <h3>${folderName}</h3>
                                <p>Explore our comprehensive collection of ${folderName.toLowerCase()} for all subjects.</p>
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
});
