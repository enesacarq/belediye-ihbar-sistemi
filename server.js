const express = require('express');
const multer = require('multer');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = 3000;

const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'YazilimBelediyesiKriptoAnahtari_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 3600000 }
}));

app.use(express.static(path.join(__dirname, 'public')));

const smsVerifications = new Map();

// ✅ SMS KOD GÖNDERME (Terminale Yazdırır)
app.post('/api/send-sms', (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, message: 'Telefon numarası gerekli.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 haneli kod
    const expires = Date.now() + 5 * 60 * 1000; // 5 dakika geçerli

    smsVerifications.set(phone, { code, expires });

    // 🖥️ Terminale yaz (test modu)
    console.log(`\n📱 SMS DOĞRULAMA KODU`);
    console.log(`   Telefon : ${phone}`);
    console.log(`   Kod     : ${code}`);
    console.log(`   Süre    : 5 dakika\n`);

    res.json({ success: true, message: 'Doğrulama kodu terminale yazıldı.' });
});

// ✅ TEK submit-report ROUTE (address dahil, çift route silindi)
app.post('/api/submit-report', upload.single('photo'), (req, res) => {
    const { name, surname, phone, title, description, address, smsCode } = req.body;
    const photoPath = req.file ? '/uploads/' + req.file.filename : null;

    const verifyData = smsVerifications.get(phone);
    if (!verifyData || verifyData.code !== smsCode || Date.now() > verifyData.expires) {
        return res.status(400).json({ success: false, message: 'SMS doğrulama kodu hatalı veya süresi dolmuş.' });
    }

    const sql = `INSERT INTO reports (name, surname, phone, title, description, address, photo_path) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, surname, phone, title, description, address, photoPath];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('DB Hatası:', err.message);
            return res.status(500).json({ success: false, message: 'Veritabanı kaydı esnasında hata oluştu.' });
        }
        smsVerifications.delete(phone);
        res.json({ success: true, message: 'İhbarınız başarıyla kurumsal sistemimize iletilmiştir.' });
    });
});

// Admin Giriş
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT * FROM admins WHERE username = ? AND password = ?`;
    db.get(sql, [username, password], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: 'Giriş hatası.' });
        if (row) {
            req.session.isAdmin = true;
            req.session.adminUser = row.username;
            res.json({ success: true, redirect: '/admin/dashboard' });
        } else {
            res.status(401).json({ success: false, message: 'Hatalı kullanıcı adı veya şifre!' });
        }
    });
});

app.get('/admin/dashboard', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/admin.html');
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/api/admin/reports', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Yetkisiz erişim.' });
    db.all(`SELECT * FROM reports ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/update-status', (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Yetkisiz erişim.' });
    const { id, status } = req.body;
    db.run(`UPDATE reports SET status = ? WHERE id = ?`, [status, id], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin.html');
});

app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`🚀 Yazılım Belediyesi İhbar Sistemi Güvenli Modda Açıldı.`);
    console.log(`🌐 Vatandaş Paneli: http://localhost:${PORT}`);
    console.log(`🔐 Yönetici Paneli: http://localhost:${PORT}/admin.html`);
    console.log(`========================================================`);
});