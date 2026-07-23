document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('contact-submit');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('contact-name').value;
            const email = document.getElementById('contact-email').value;
            const subject = document.getElementById('contact-subject').value;
            const message = document.getElementById('contact-message').value;
            
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/contact`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, subject, message })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showCustomToast(data.message || 'Your message has been sent!', 'success');
                    contactForm.reset();
                } else {
                    showCustomToast(data.error || 'Failed to send message.', 'error');
                }
            } catch (error) {
                console.error('Contact error:', error);
                showCustomToast('An unexpected error occurred. Please try again.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});
