const fs = require('fs');
const path = require('path');
const { DocumentAnalysisClient, AzureKeyCredential } = require('@azure/ai-form-recognizer');




if (!AZURE_FORM_RECOGNIZER_ENDPOINT || !AZURE_FORM_RECOGNIZER_KEY) {
    console.error('Azure Form Recognizer endpoint or key is not set in environment variables.');
    process.exit(1);
}

async function analyzeDocument(filePath, endpoint, key) {
    /**
     * Analyzes a document using Azure Form Recognizer.
     *
     * @param {string} filePath Path to the document file.
     * @param {string} endpoint Azure Form Recognizer endpoint URL.
     * @param {string} key Azure Form Recognizer API key.
     * @returns {Object} Result of document analysis.
     */

    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));

    try {
        const fileBuffer = fs.readFileSync(filePath);
        const poller = await client.beginAnalyzeDocument("prebuilt-document", fileBuffer);
        const result = await poller.pollUntilDone();

        return result;
    } catch (err) {
        console.error(`Error analyzing document ${filePath}:`, err.message);
        return null;
    }
}

function findProvisionalDiagnosis(text) {
    /**
     * Extracts the provisional diagnosis from the provided text.
     *
     * @param {string} text The text from which to extract the provisional diagnosis.
     * @returns {string} The extracted provisional diagnosis.
     */

    const match = text.match(/Provisional diagnosis:\s*(.*?)(?:\n|$)/i);
    if (match) {
        let diagnosis = match[1].trim();
        diagnosis = diagnosis.replace('RE)', '').replace('RE ', '').trim();
        return diagnosis;
    }
    return 'Not found';
}

async function processImagesInFolder(folderPath, outputCsvPath, endpoint, key) {
    /**
     * Processes all images in a folder and saves the provisional diagnosis in a CSV file.
     *
     * @param {string} folderPath Path to the folder containing images.
     * @param {string} outputCsvPath Path to the CSV file where results will be saved.
     * @param {string} endpoint Azure Form Recognizer endpoint URL.
     * @param {string} key Azure Form Recognizer API key.
     */
    
    if (!fs.existsSync(folderPath)) {
        console.log(`Folder not found: ${folderPath}`);
        return;
    }

    const files = fs.readdirSync(folderPath);
    const csvStream = fs.createWriteStream(outputCsvPath, { flags: 'w', encoding: 'utf8' });

    // Write CSV header
    csvStream.write('Image_Name,Provisional_Diagnosis\n');

    for (const fileName of files) {
        if (['.png', '.jpg', '.jpeg'].includes(path.extname(fileName).toLowerCase())) {
            const imagePath = path.join(folderPath, fileName);
            try {
                const result = await analyzeDocument(imagePath, endpoint, key);
                const text = result.content || '';  
                saveCsvToFile(text,'./medical/extractoutput','output.csv')
                const provisionalDiagnosis = findProvisionalDiagnosis(text).toUpperCase();
                // Write to CSV
                csvStream.write(`${fileName},${provisionalDiagnosis}\n`);
                saveCsvToFile(provisionalDiagnosis,'./medical/extractoutput','output1.csv')
                console.log(`Processed ${fileName}: ${provisionalDiagnosis}`);
            } catch (error) {
                console.error(`Error processing ${fileName}: ${error.message}`);
            }
        }
    }

    csvStream.end();
    console.log('Processing complete.');
}

// Define folder paths
const folderPath = "./uploads";
const outputCsvPath = "./test_folder/provisional_diagnosis_results2.csv";

// Start processing images
console.log('Start processing images...');
processImagesInFolder(folderPath, outputCsvPath, AZURE_FORM_RECOGNIZER_ENDPOINT, AZURE_FORM_RECOGNIZER_KEY);



// csv file store function
function saveCsvToFile(csvString, folderPath, fileName) {
    // Ensure the folder exists, if not create it
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    // Define the full path to the CSV file
    const filePath = path.join(folderPath, fileName);

    // Append the string to the CSV file, or create it if it doesn't exist
    fs.appendFile(filePath, csvString + '\n', (err) => {
        if (err) {
            console.error('Error writing to CSV file:', err);
            return;
        }
        // console.log(`CSV data has been appended successfully to ${filePath}!`);
    });
}