const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const app = express();
const port = process.env.PORT || 80;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path to data file
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'plans.yml');

// Ensure data directory and file exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, yaml.dump([])); // Start with empty array
}

// API Routes
app.get('/api/plans', (req, res) => {
    try {
        const fileContents = fs.readFileSync(dataFile, 'utf8');
        const data = yaml.load(fileContents) || [];
        res.json(data);
    } catch (e) {
        console.error("Error reading YAML:", e);
        res.status(500).json({ error: "Failed to read plans" });
    }
});

app.post('/api/plans', (req, res) => {
    try {
        const plans = req.body;
        const yamlStr = yaml.dump(plans);
        fs.writeFileSync(dataFile, yamlStr, 'utf8');
        res.json({ success: true });
    } catch (e) {
        console.error("Error writing YAML:", e);
        res.status(500).json({ error: "Failed to save plans" });
    }
});


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
