const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const axios = require('axios');
const { EdgeTTS } = require('node-edge-tts');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 80;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path to data file
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'plans.yml');
const configFile = path.join(dataDir, 'config.yml');
const statsFile = path.join(dataDir, 'stats.yml');
const assetsDir = path.join(dataDir, 'assets', 'plans');

// Ensure data directory and file exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, yaml.dump([])); // Start with empty array
}

if (!fs.existsSync(configFile)) {
    const defaultConfig = {
        tts: {
            enabled: false,
            url: "http://10.1.1.150:8280/v1",
            voice: "af_heart"
        }
    };
    fs.writeFileSync(configFile, yaml.dump(defaultConfig));
}

if (!fs.existsSync(statsFile)) {
    fs.writeFileSync(statsFile, yaml.dump({})); // Start with empty object
}

// Cleanup assets task
function cleanupAssets() {
    console.log("Running assets cleanup...");
    try {
        if (!fs.existsSync(dataFile) || !fs.existsSync(assetsDir)) return;

        const fileContents = fs.readFileSync(dataFile, 'utf8');
        const plans = yaml.load(fileContents) || [];

        const validPlanIds = new Set(plans.map(p => p.id));
        const validImageHashes = new Set();

        plans.forEach(plan => {
            plan.exercises.forEach(ex => {
                if (ex.images) {
                    ex.images.forEach(url => {
                        const hash = crypto.createHash('md5').update(url).digest('hex');
                        validImageHashes.add(hash);
                    });
                }
            });
        });

        const planFolders = fs.readdirSync(assetsDir);
        planFolders.forEach(planFolder => {
            const planFolderPath = path.join(assetsDir, planFolder);
            if (fs.statSync(planFolderPath).isDirectory()) {
                if (!validPlanIds.has(planFolder)) {
                    console.log(`Deleting obsolete plan folder: ${planFolder}`);
                    fs.rmSync(planFolderPath, { recursive: true, force: true });
                } else {
                    const files = fs.readdirSync(planFolderPath);
                    files.forEach(file => {
                        // match the hash part before extension
                        const hash = file.split('.')[0];
                        if (!validImageHashes.has(hash)) {
                            console.log(`Deleting unreferenced image: ${file} in plan ${planFolder}`);
                            fs.unlinkSync(path.join(planFolderPath, file));
                        }
                    });
                }
            }
        });
        console.log("Assets cleanup finished.");
    } catch (e) {
        console.error("Error during assets cleanup:", e.message);
    }
}

// Run cleanup on startup
cleanupAssets();

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

app.get('/api/stats', (req, res) => {
    try {
        const fileContents = fs.readFileSync(statsFile, 'utf8');
        const data = yaml.load(fileContents) || {};
        res.json(data);
    } catch (e) {
        console.error("Error reading stats YAML:", e);
        res.status(500).json({ error: "Failed to read stats" });
    }
});

app.post('/api/stats', (req, res) => {
    try {
        const { planId, timestamp } = req.body;
        if (!planId || !timestamp) {
            return res.status(400).json({ error: "Missing planId or timestamp" });
        }

        const fileContents = fs.readFileSync(statsFile, 'utf8');
        const data = yaml.load(fileContents) || {};
        if (!data[planId]) {
            data[planId] = [];
        }
        data[planId].push(timestamp);

        fs.writeFileSync(statsFile, yaml.dump(data), 'utf8');
        res.json({ success: true });
    } catch (e) {
        console.error("Error writing stats YAML:", e);
        res.status(500).json({ error: "Failed to save stats" });
    }
});

app.delete('/api/stats/:planId', (req, res) => {
    try {
        const { planId } = req.params;
        const fileContents = fs.readFileSync(statsFile, 'utf8');
        const data = yaml.load(fileContents) || {};

        if (data[planId]) {
            delete data[planId];
            fs.writeFileSync(statsFile, yaml.dump(data), 'utf8');
        }
        res.json({ success: true });
    } catch (e) {
        console.error("Error deleting stats:", e);
        res.status(500).json({ error: "Failed to delete stats" });
    }
});

app.get('/api/config', (req, res) => {
    try {
        const fileContents = fs.readFileSync(configFile, 'utf8');
        const data = yaml.load(fileContents) || {};
        res.json(data);
    } catch (e) {
        console.error("Error reading config YAML:", e);
        res.status(500).json({ error: "Failed to read config" });
    }
});

app.post('/api/config', (req, res) => {
    try {
        const config = req.body;
        const yamlStr = yaml.dump(config);
        fs.writeFileSync(configFile, yamlStr, 'utf8');
        res.json({ success: true });
    } catch (e) {
        console.error("Error writing config YAML:", e);
        res.status(500).json({ error: "Failed to save config" });
    }
});

app.get('/api/image', async (req, res) => {
    const { url, planId } = req.query;
    if (!url || !planId) {
        return res.status(400).json({ error: "Missing url or planId" });
    }

    // Sanitize planId to prevent path traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(planId)) {
        return res.status(400).json({ error: "Invalid planId format" });
    }

    // Basic SSRF protection: only allow http/https URLs to external services
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return res.status(400).json({ error: "Invalid URL protocol" });
        }
        // Disallow loopback and common local IP blocks
        if (['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'].includes(parsedUrl.hostname)) {
            return res.status(400).json({ error: "URL not allowed" });
        }
    } catch (e) {
        return res.status(400).json({ error: "Invalid URL" });
    }

    try {
        const hash = crypto.createHash('md5').update(url).digest('hex');

        // simple heuristic to preserve extension if it exists before query params
        const urlWithoutQuery = url.split('?')[0];
        let ext = path.extname(urlWithoutQuery);
        if (!ext || ext.length > 5) {
            ext = '.jpg'; // default fallback
        }

        const filename = `${hash}${ext}`;
        const planDir = path.join(assetsDir, planId);
        const filepath = path.join(planDir, filename);

        if (!fs.existsSync(planDir)) {
            fs.mkdirSync(planDir, { recursive: true });
        }

        if (fs.existsSync(filepath)) {
            return res.sendFile(filepath);
        }

        // Image not in cache, download it
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 5000 // Add timeout
        });

        // Verify content type is an image or octet-stream
        const contentType = response.headers['content-type'];
        if (!contentType || (!contentType.startsWith('image/') && !contentType.includes('octet-stream'))) {
            return res.status(400).json({ error: "URL does not point to an image" });
        }

        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);

        writer.on('finish', () => {
            res.sendFile(filepath);
        });

        writer.on('error', (err) => {
            console.error('Error saving image:', err);
            // Attempt to clean up
            fs.unlink(filepath, () => {});
            res.status(500).json({ error: "Failed to download image" });
        });

    } catch (e) {
        console.error("Image Proxy error:", e.message);
        res.status(500).json({ error: "Failed to fetch image" });
    }
});

app.post('/api/tts', async (req, res) => {
    try {
        const text = req.body.text;
        if (!text) return res.status(400).json({ error: "Text is required" });

        const tempFilePath = path.join(require('os').tmpdir(), `tts-${crypto.randomUUID()}.mp3`);
        const tts = new EdgeTTS();

        await tts.ttsPromise(text, tempFilePath);

        res.set('Content-Type', 'audio/mpeg');
        const stream = fs.createReadStream(tempFilePath);

        stream.pipe(res);

        stream.on('end', () => {
            fs.unlink(tempFilePath, (err) => {
                if (err) console.error("Error deleting temp file:", err);
            });
        });

        stream.on('error', (err) => {
            console.error("Stream error:", err);
            res.status(500).end();
            fs.unlink(tempFilePath, () => {});
        });

    } catch (e) {
        console.error("TTS error:", e.message);
        res.status(500).json({ error: "TTS failed" });
    }
});


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
