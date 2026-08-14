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

// The local folder where your PDFs are stored
const localPdfsFolder = path.join(__dirname, '..', 'pdfs');

// Helper to recursively find all files in a directory
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            // Only grab .pdf files
            if (file.toLowerCase().endsWith('.pdf')) {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        }
    });

    return arrayOfFiles;
}

async function uploadAllPdfs() {
    if (!fs.existsSync(localPdfsFolder)) {
        console.error(`❌ Error: Could not find the local folder: ${localPdfsFolder}`);
        console.log(`Please create a "pdfs" folder in your project and put your files inside it.`);
        return;
    }

    console.log('🔍 Scanning local pdfs folder...');
    const allFiles = getAllFiles(localPdfsFolder);
    
    if (allFiles.length === 0) {
        console.log('⚠️ No PDF files found to upload.');
        return;
    }

    console.log(`🚀 Found ${allFiles.length} PDFs. Starting upload to Supabase...`);

    let successCount = 0;
    let failCount = 0;

    for (const filePath of allFiles) {
        // Convert the absolute path on your laptop to a relative path for the cloud
        // e.g., C:\Desktop\skillox\pdfs\textbooks\math.pdf -> textbooks/math.pdf
        let relativePath = path.relative(localPdfsFolder, filePath);
        
        // Force forward slashes for Cloud Storage (important for Windows!)
        relativePath = relativePath.split(path.sep).join('/');

        try {
            console.log(`Uploading: ${relativePath}...`);
            const fileBuffer = fs.readFileSync(filePath);
            
            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(relativePath, fileBuffer, {
                    upsert: true, // If file already exists, overwrite it
                    contentType: 'application/pdf'
                });

            if (error) {
                console.error(`   ❌ Failed to upload ${relativePath}:`, error.message);
                failCount++;
            } else {
                console.log(`   ✅ Success!`);
                successCount++;
            }
        } catch (err) {
            console.error(`   ❌ Error reading/uploading ${relativePath}:`, err.message);
            failCount++;
        }
    }

    console.log('\n======================================');
    console.log('🎉 UPLOAD COMPLETE!');
    console.log(`✅ Successfully uploaded: ${successCount}`);
    if (failCount > 0) {
        console.log(`❌ Failed to upload: ${failCount}`);
    }
    console.log('======================================\n');
    console.log('Next step: Run "node scripts/generate-pdf-list.js" to update your website menu!');
}

uploadAllPdfs();
