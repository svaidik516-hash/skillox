const fs = require('fs');
const path = require('path');

const rootRevisionPath = path.join(__dirname, '..', 'pdfs', 'revision');

const categories = [
    'Formula_Sheets',
    'Mind_Maps',
    'One_Page_Summaries',
    'Key_Points_and_Definitions',
    'Solved_Examples',
    'Diagram_Collections'
];

if (!fs.existsSync(rootRevisionPath)) {
    fs.mkdirSync(rootRevisionPath, { recursive: true });
}

let createdCount = 0;

for (let i = 1; i <= 12; i++) {
    const classDir = path.join(rootRevisionPath, `Class_${i}`);
    if (!fs.existsSync(classDir)) {
        fs.mkdirSync(classDir, { recursive: true });
        createdCount++;
    }

    for (const category of categories) {
        const categoryDir = path.join(classDir, category);
        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
            createdCount++;
        }
    }
}

console.log(`Created ${createdCount} directories in pdfs/revision/.`);
