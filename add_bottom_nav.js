const fs = require('fs');
const path = require('path');

const dir = 'c:\\Desktop\\skillox';
const bottomNavHtml = `
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
`;

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.html')) {
        let content = fs.readFileSync(path.join(dir, file), 'utf8');
        if (!content.includes('mobile-bottom-nav')) {
            content = content.replace('</body>', bottomNavHtml + '\n</body>');
            fs.writeFileSync(path.join(dir, file), content);
            console.log('Updated ' + file);
        }
    }
});
