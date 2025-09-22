
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const archiver = require('archiver');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { generatePdfs } = require('./run.js');

const app = express();
const port = 3000;

// --- Configuration ---
const PASSWORD = process.env.APP_PASSWORD;
if (!PASSWORD) {
    console.error('Error: La variable de entorno APP_PASSWORD no está definida.');
    process.exit(1);
}
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'carnets_generados');

// Create necessary directories
(async () => {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (e) {
        console.error("Couldn't create directories", e)
    }
})();


// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

const upload = multer({ dest: UPLOAD_DIR });

// Middleware to check if the user is authenticated
function checkAuth(req, res, next) {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
}

// --- Routes ---
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === PASSWORD) {
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.send('Contraseña incorrecta');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

app.get('/', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', checkAuth, upload.single('excelFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No se ha subido ningún archivo.');
    }

    const excelPath = req.file.path;
    const { school_year } = req.body;

    try {
        // Clean previous output directory
        await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
        await fs.mkdir(OUTPUT_DIR, { recursive: true });

        await generatePdfs(excelPath, OUTPUT_DIR, school_year);

        const zipPath = path.join(__dirname, 'carnets.zip');
        const output = fsSync.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => {
            res.cookie('generationComplete', 'true', { maxAge: 20000 }); // Cookie expires in 20 seconds
            res.download(zipPath, 'carnets.zip', async (err) => {
                if (err) {
                    console.error('Error al descargar el archivo:', err);
                }
                // Clean up zip and uploaded file
                try {
                    await fs.unlink(zipPath);
                    await fs.unlink(excelPath);
                } catch (e) {
                    console.error("Couldn't clean up files", e)
                }
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);
        archive.directory(OUTPUT_DIR, false);
        await archive.finalize();

    } catch (error) {
        console.error('Error al generar los PDFs:', error);
        res.status(500).send('Error interno al procesar el archivo.');
    }
});

// Serve static files from 'public' directory
app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Aplicación iniciada en http://localhost:${port}`);
});
