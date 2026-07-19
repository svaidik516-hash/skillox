const fs = require('fs');
const path = require('path');

const pdfsDir = path.join(__dirname, '..', 'pdfs');
const outputFile = path.join(__dirname, '..', 'pdf-list.json');

// Ensure root pdfs directory exists
if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir);
}

function scanDirectory(dirPath, rootDir) {
    const result = {};
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = [];

    items.forEach(item => {
        if (item.isDirectory()) {
            // Recursively scan subdirectories
            result[item.name] = scanDirectory(path.join(dirPath, item.name), rootDir);
        } else if (item.isFile() && item.name.toLowerCase().endsWith('.pdf')) {
            // Create a human readable title
            const title = item.name
                .replace(/\.pdf$/i, '')
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, char => char.toUpperCase());
                
            files.push({
                filename: item.name,
                title: title,
                url: path.relative(rootDir, path.join(dirPath, item.name)).replace(/\\/g, '/')
            });
        }
    });

    if (files.length > 0) {
        result._files = files;
    }
    return result;
}

const tree = scanDirectory(pdfsDir, path.join(__dirname, '..'));

fs.writeFileSync(outputFile, JSON.stringify(tree, null, 2));
console.log('✓ pdf-list.json generated successfully with nested structure.');
