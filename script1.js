const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Initialize Express
const app = express();

// Multer setup for handling file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');  // Save uploaded files to "uploads" folder
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);  // Save file with the original name
    }
});
const upload = multer({ storage: storage });

// API endpoint to handle image upload
app.post('/upload-image', upload.single('image'), (req, res) => {
    console.log('Received request to /upload-image');

    if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).send('No file uploaded.');
    }

    const imagePath = req.file.path;  // Path to the uploaded image
    console.log('Uploaded file path:', imagePath);

    // Send a success response
    res.status(200).json({ message: 'Image uploaded successfully', filePath: imagePath });
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
