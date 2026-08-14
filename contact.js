document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('contact-submit');

    // 1. Personalize user greeting name if available in local storage or session
    const greetingNameEl = document.getElementById('user-greeting-name');
    if (greetingNameEl) {
        try {
            const storedUser = localStorage.getItem('user') || localStorage.getItem('skillox_user') || sessionStorage.getItem('username');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                if (parsed.name) greetingNameEl.textContent = parsed.name.split(' ')[0];
            }
        } catch (e) {
            // Leave default as "Student" if JSON parse fails or no name is found
        }
    }

    // 2. Accordion Category Expanding & Collapsing
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.accordion-card');
            if (card) {
                card.classList.toggle('expanded');
            }
        });
    });

    // 3. Individual Q&A Item Toggle (+ / -)
    const qaQuestions = document.querySelectorAll('.qa-question');
    qaQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.closest('.qa-item');
            if (item) {
                item.classList.toggle('active');
                const toggleIcon = item.querySelector('.qa-toggle-icon');
                if (toggleIcon) {
                    toggleIcon.innerHTML = item.classList.contains('active') ? '&minus;' : '&plus;';
                }
            }
        });
    });

    // 4. Live FAQ Search Filtering
    const faqSearchInput = document.getElementById('faq-search');
    const faqSearchBtn = document.getElementById('faq-search-btn');

    const filterFaqs = () => {
        const query = (faqSearchInput.value || '').toLowerCase().trim();
        const qaItems = document.querySelectorAll('.qa-item');
        const cards = document.querySelectorAll('.accordion-card');

        if (!query) {
            // Restore default view if search is cleared
            qaItems.forEach(item => item.style.display = 'block');
            cards.forEach(card => card.style.display = 'block');
            return;
        }

        cards.forEach(card => {
            let hasMatch = false;
            const itemsInCard = card.querySelectorAll('.qa-item');
            
            itemsInCard.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(query)) {
                    item.style.display = 'block';
                    hasMatch = true;
                    // Auto-expand matched QA item
                    item.classList.add('active');
                    const icon = item.querySelector('.qa-toggle-icon');
                    if (icon) icon.innerHTML = '&minus;';
                } else {
                    item.style.display = 'none';
                }
            });

            if (hasMatch) {
                card.style.display = 'block';
                card.classList.add('expanded'); // Auto expand category with matches
            } else {
                card.style.display = 'none';
            }
        });
    };

    if (faqSearchInput) {
        faqSearchInput.addEventListener('input', filterFaqs);
    }
    if (faqSearchBtn) {
        faqSearchBtn.addEventListener('click', filterFaqs);
    }

    // 5. Direct Community & Chat Action Buttons Feedback
    const joinForumBtn = document.getElementById('join-forum-btn');
    const startChatBtn = document.getElementById('start-chat-btn');

    if (joinForumBtn) {
        joinForumBtn.addEventListener('click', () => {
            if (typeof showCustomToast === 'function') {
                showCustomToast('Connecting you to Skillox Community Forums...', 'success');
            } else {
                alert('Connecting you to Skillox Community Forums...');
            }
        });
    }

    if (startChatBtn) {
        startChatBtn.addEventListener('click', () => {
            if (typeof showCustomToast === 'function') {
                showCustomToast('Initiating live student chat with a Support Agent...', 'success');
            } else {
                alert('Initiating live student chat with a Support Agent...');
            }
        });
    }

    // 6. Handle Ticket Form Submission via Backend API
    if (contactForm && submitBtn) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const subject = document.getElementById('contact-subject').value;
            const message = document.getElementById('contact-message').value;
            
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting Ticket...';
            submitBtn.disabled = true;
            
            try {
                const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
                const response = await fetch(`${apiBase}/api/contact`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, subject, message })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    if (typeof showCustomToast === 'function') {
                        showCustomToast(data.message || 'Your support ticket has been submitted!', 'success');
                    } else {
                        alert('Your support ticket has been submitted!');
                    }
                    contactForm.reset();
                } else {
                    if (typeof showCustomToast === 'function') {
                        showCustomToast(data.error || 'Failed to submit ticket.', 'error');
                    } else {
                        alert(data.error || 'Failed to submit ticket.');
                    }
                }
            } catch (error) {
                console.error('Contact error:', error);
                if (typeof showCustomToast === 'function') {
                    showCustomToast('An unexpected error occurred. Please try again.', 'error');
                } else {
                    alert('An unexpected error occurred. Please try again.');
                }
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
