require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const session = require('express-session');

const app = express();

// ===============================
// 🔐 CONFIG
// ===============================
const PORT = process.env.PORT || 3003;
const SESSION_SECRET = process.env.SESSION_SECRET || 'default_secret';

// ===============================
// 🧩 MIDDLEWARES
// ===============================
app.use(express.json());

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // true só com HTTPS
}));

// ===============================
// 📁 ARQUIVOS ESTÁTICOS
// ===============================
app.use('/static', express.static(path.join(__dirname, 'static')));
// ===============================
// 🗄️ BANCO
// ===============================
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data DATETIME DEFAULT CURRENT_TIMESTAMP,
        operador TEXT,
        servico TEXT,
        nome TEXT,
        placa TEXT,
        cidade TEXT,
        statusManual TEXT DEFAULT 'ativo'
    )
    `);

    db.run(`ALTER TABLE servicos ADD COLUMN statusManual TEXT DEFAULT 'ativo'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error(err);
        }
    });
});

// ===============================
// 🔐 AUTH ADMIN
// ===============================
function authAdmin(req, res, next) {
    if (req.session.admin) return next();
    res.status(403).json({ erro: 'Acesso negado' });
}

// ===============================
// 🔑 LOGIN
// ===============================
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;

    // 👉 MELHORIA: usar .env depois se quiser
    if (usuario === 'admin' && senha === '654321') {
        req.session.admin = true;
        return res.json({ ok: true });
    }

    res.status(401).json({ ok: false });
});

// LOGOUT
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
});

// ===============================
// 📌 ROTAS
// ===============================

// SALVAR
app.post('/salvar', (req, res) => {
    const { operador, servico, nome, placa, cidade, statusManual } = req.body;

    db.run(
        `INSERT INTO servicos (operador, servico, nome, placa, cidade, statusManual)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [operador, servico, nome, placa, cidade, statusManual || 'ativo'],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send("Erro");
            }
            res.send("OK");
        }
    );
});

// LISTAR
app.get('/listar', (req, res) => {
    let query = "SELECT * FROM servicos";

    if (!req.session.admin) {
        query += " WHERE statusManual != 'finalizado'";
    }

    query += " ORDER BY id DESC";

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// EDITAR
app.put('/editar/:id', authAdmin, (req, res) => {
    const { id } = req.params;
    const { operador, servico, nome, placa, cidade } = req.body;

    db.run(
        `UPDATE servicos SET operador=?, servico=?, nome=?, placa=?, cidade=? WHERE id=?`,
        [operador, servico, nome, placa, cidade, id],
        function (err) {
            if (err) return res.status(500).send("Erro");
            res.send("OK");
        }
    );
});

// FINALIZAR
app.put('/finalizar/:id', authAdmin, (req, res) => {
    db.run(
        `UPDATE servicos SET statusManual = 'finalizado' WHERE id = ?`,
        [req.params.id],
        function (err) {
            if (err) return res.status(500).send("Erro");
            res.send("OK");
        }
    );
});

// REATIVAR
app.put('/reativar/:id', authAdmin, (req, res) => {
    db.run(
        `UPDATE servicos SET statusManual = 'ativo' WHERE id = ?`,
        [req.params.id],
        function (err) {
            if (err) return res.status(500).send("Erro");
            res.send("OK");
        }
    );
});

// DELETAR
app.delete('/deletar/:id', authAdmin, (req, res) => {
    db.run(
        `DELETE FROM servicos WHERE id = ?`,
        [req.params.id],
        function (err) {
            if (err) return res.status(500).send("Erro");
            res.send("OK");
        }
    );
});

// ===============================
// 🌐 INDEX
// ===============================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===============================
// 🚀 START
// ===============================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
