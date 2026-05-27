const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'belediye_ihbar.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Veritabanı bağlantı hatası:', err.message);
    else console.log('SQLite veritabanı aktif ve güvenli bağlantı kuruldu.');
});

db.serialize(() => {
    // Vatandaş İhbarları Tablosu (address sütunu eklendi)
    db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        surname TEXT NOT NULL,
        phone TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        address TEXT,
        photo_path TEXT,
        status TEXT DEFAULT 'Beklemede',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Yönetici Yetkilendirme Tablosu
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // Varsayılan Güvenli Admin Hesabı
    db.get(`SELECT * FROM admins WHERE username = ?`, ['admin'], (err, row) => {
        if (!row) {
            const stmt = db.prepare(`INSERT INTO admins (username, password) VALUES (?, ?)`);
            stmt.run('admin', 'BelediyeA123!'); 
            stmt.finalize();
        }
    });
});

module.exports = db;