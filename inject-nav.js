const fs = require('fs');

const cssToInject = `
    <style>
        @media (max-width: 768px) {
            .mobile-bottom-nav {
                display: flex;
                position: fixed;
                bottom: 14px;
                left: 16px;
                right: 16px;
                height: 70px;
                background: rgba(255, 255, 255, 0.97);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.9);
                border-radius: 36px;
                box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.14), 0 4px 12px rgba(0, 0, 0, 0.04);
                z-index: 9995;
                justify-content: space-around;
                align-items: center;
                padding: 0 8px;
            }

            .bottom-nav-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #475569;
                text-decoration: none;
                font-size: 0.75rem;
                font-weight: 500;
                gap: 4px;
                flex: 1;
                transition: all 0.2s ease;
                padding: 6px 0;
                border-radius: 20px;
                -webkit-tap-highlight-color: transparent;
            }

            .bottom-nav-item.active,
            .bottom-nav-item:hover {
                color: #0f172a !important;
                font-weight: 700 !important;
            }
            .bottom-nav-item.active svg {
                fill: #0f172a !important;
                stroke: #0f172a !important;
            }

            .bottom-nav-item.active svg,
            .bottom-nav-item:hover svg {
                transform: translateY(-2px) scale(1.12);
                stroke: #e8740c;
                stroke-width: 2.3;
            }

            .bottom-nav-item svg {
                transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
        }
        @media (min-width: 769px) {
            .mobile-bottom-nav { display: none; }
        }
    </style>
</head>`;

const htmlToInject = `
    <!-- Mobile Bottom Navigation -->
    <div class="mobile-bottom-nav">
        <a href="index.html" class="bottom-nav-item" id="nav-home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Home</span>
        </a>
        <a href="textbooks.html" class="bottom-nav-item" id="nav-library">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            <span>Library</span>
        </a>
        <a href="bookmarks.html" class="bottom-nav-item" id="nav-saved">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            <span>Saved</span>
        </a>
        <a href="profile.html" class="bottom-nav-item" id="nav-profile">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Profile</span>
        </a>
    </div>
    
    <script>
        document.addEventListener("DOMContentLoaded", () => {
            const path = window.location.pathname;
            const page = path.split("/").pop();
            if(page === "" || page === "index.html") document.getElementById("nav-home")?.classList.add("active");
            else if(["textbooks.html", "cbse.html", "icse.html", "up-board.html", "revision.html"].includes(page)) document.getElementById("nav-library")?.classList.add("active");
            else if(page === "bookmarks.html") document.getElementById("nav-saved")?.classList.add("active");
            else if(page === "profile.html" || page === "login.html" || page === "signup.html" || page === "admin.html") document.getElementById("nav-profile")?.classList.add("active");
        });
    </script>
</body>`;

fs.readdirSync(__dirname).forEach(file => {
    if (file.endsWith('.html') && file !== 'viewer.html') {
        let content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('mobile-bottom-nav')) {
            return;
        }

        content = content.replace(/<\/head>/i, cssToInject);
        content = content.replace(/<\/body>/i, htmlToInject);

        fs.writeFileSync(file, content);
        console.log('Updated', file);
    }
});
