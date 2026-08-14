const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const bucketName = 'Skillox';
const outputFile = path.join(__dirname, '..', 'pdf-list.json');

// Recursively fetch all files from Supabase bucket
async function listAllFiles(prefix = '') {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
    });

    if (error) {
        console.error('Error fetching list from Supabase:', error.message);
        return [];
    }

    if (!data) return [];

    let allFiles = [];

    for (const item of data) {
        // Skip hidden files like .emptyFolderPlaceholder
        if (item.name.startsWith('.')) continue;

        // In Supabase, items with an ID or metadata are files. Folders just have a name.
        if (item.id || item.metadata) {
            if (item.name.toLowerCase().endsWith('.pdf')) {
                const fullPath = prefix === '' ? item.name : `${prefix}/${item.name}`;
                allFiles.push(fullPath);
            }
        } else {
            // It is a folder, recurse into it
            const subPrefix = prefix === '' ? item.name : `${prefix}/${item.name}`;
            const subFiles = await listAllFiles(subPrefix);
            allFiles = allFiles.concat(subFiles);
        }
    }
    
    return allFiles;
}

// Convert a flat list of paths into a nested tree structure
function buildTree(paths) {
    // Pre-populate standard structure so tabs always show up even if empty!
    const tree = {
        textbooks: {},
        revision: {},
        "coaching-notes": {},
        "sample-papers": {
            "CBSE": {},
            "ICSE": {},
            "UP_Board": {}
        },
        worksheets: {}
    };

    const standardSubjects = ['Math', 'Science', 'English', 'Social Science', 'Hindi'];
    const higherSubjects = ['Physics', 'Chemistry', 'Math', 'Biology', 'English', 'Accountancy', 'Business Studies', 'Economics'];

    // Create Class 1-12 and their subjects
    for (const category of Object.keys(tree)) {
        if (category === 'sample-papers') {
            for (const board of Object.keys(tree[category])) {
                for (let i = 1; i <= 12; i++) {
                    const clsKey = `Class_${i}`;
                    tree[category][board][clsKey] = {};
                    const subjects = i >= 11 ? higherSubjects : standardSubjects;
                    subjects.forEach(sub => {
                        tree[category][board][clsKey][sub] = { _files: [] };
                    });
                }
            }
        } else {
            for (let i = 1; i <= 12; i++) {
                const clsKey = `Class_${i}`;
                tree[category][clsKey] = {};
                
                const subjects = i >= 11 ? higherSubjects : standardSubjects;
                subjects.forEach(sub => {
                    tree[category][clsKey][sub] = { _files: [] };
                });
            }
        }
    }

    // Now populate the actual files found in Supabase
    paths.forEach(filePath => {
        const parts = filePath.split('/');
        const fileName = parts.pop(); 
        
        let currentLevel = tree;

        parts.forEach(part => {
            if (!currentLevel[part]) {
                currentLevel[part] = {};
            }
            currentLevel = currentLevel[part];
        });

        if (!currentLevel._files) {
            currentLevel._files = [];
        }

        const title = fileName
            .replace(/\.pdf$/i, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());

        currentLevel._files.push({
            filename: fileName,
            title: title,
            url: filePath
        });
    });

    return tree;
}

async function generateList() {
    console.log('🔄 Fetching PDF list from Supabase Storage...');
    
    const filePaths = await listAllFiles('');
    
    if (filePaths.length === 0) {
        console.warn('⚠️ No PDFs found in the bucket. Did you upload any?');
    }
    
    const tree = buildTree(filePaths);
    
    fs.writeFileSync(outputFile, JSON.stringify(tree, null, 2));
    console.log(`✓ Successfully generated pdf-list.json with ${filePaths.length} PDFs from Supabase!`);
}

generateList();
