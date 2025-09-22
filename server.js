
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const archiver = require('archiver');
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

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// Configure multer for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

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

    const { school_year } = req.body;
    const excelBuffer = req.file.buffer;

    try {
        const generatedPdfs = await generatePdfs(excelBuffer, school_year);

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        // Set cookie for the frontend
        res.cookie('generationComplete', 'true', { maxAge: 20000 });

        // Set the response headers to prompt for download
        res.attachment('carnets.zip');

        // Pipe the archive to the response
        archive.pipe(res);

        // Add the generated PDFs to the archive
        for (const pdf of generatedPdfs) {
            archive.append(pdf.data, { name: pdf.filename });
        }

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
