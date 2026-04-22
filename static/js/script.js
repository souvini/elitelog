let isAdmin = false;
let todosServicos = [], cidades = [], currentPage = 1, itemsPerPage = 10;

// Elementos DOM
document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.getElementById("mainContainer");
    const loginOverlay = document.getElementById("loginOverlay");

    function iniciarSessao() {
        mainContainer.style.display = "block";
        loginOverlay.style.display = "none";
    }

    iniciarSessao();
});

const userTypeBadge = document.getElementById("userTypeBadge");
const logoutBtn = document.getElementById("logoutBtn");

const form = document.getElementById("form");
const submitBtn = document.getElementById("submitBtn");
const loadingDiv = document.getElementById("loading");
const successDiv = document.getElementById("msg");
const errorDiv = document.getElementById("errorMsg");
const cidadeInput = document.getElementById("cidade");
const suggestionsList = document.getElementById("suggestionsList");
const loadingIndicator = document.getElementById("loadingIndicator");
const placaInput = document.getElementById("placa");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const refreshBtn = document.getElementById("refreshBtn");
const loadingTable = document.getElementById("loadingTable");
const tableContent = document.getElementById("tableContent");
const paginationDiv = document.getElementById("pagination");
const statsContainer = document.getElementById("statsContainer");

// ========== DICIONÁRIO DE ROTAS AGRUPADAS ==========
function obterRotaPorCidade(cidade) {
    const ROTAS = {
        "Rota Horizonte": ["Horizonte", "Pacajus", "Chorozinho", "Ocara"],
        "Rota Oeste": ["Caucaia", "São Gonçalo do Amarante", "Paracuru", "São José do Ribamar"],
        "Rota Sul": ["Maracanaú", "Maranguape", "Pacatuba", "Guaiúba"],
        "Rota Norte": ["Fortaleza", "Aquiraz", "Eusébio", "Itaitinga"],
        "Rota Sertão Central": ["Quixadá", "Quixeramobim", "Senador Pompeu", "Mombaça"],
        "Rota Vale do Jaguaribe": ["Limoeiro do Norte", "Russas", "Morada Nova", "Jaguaribe"],
        "Rota Cariri": ["Juazeiro do Norte", "Crato", "Barbalha", "Missão Velha"],
        "Rota Sobral": ["Sobral", "Forquilha", "Groaíras", "Cariré"],
        "Rota Itapipoca": ["Itapipoca", "Amontada", "Itarema", "Trairi"],
        "Rota Canindé": ["Canindé", "Boa Viagem", "Madalena", "Paramoti"]
    };
    
    for (const [nomeRota, cidades] of Object.entries(ROTAS)) {
        if (cidades.includes(cidade)) {
            return nomeRota;
        }
    }
    return null;
}

// ========== FUNÇÕES DE STATUS POR ROTA ==========
function calcularStatusPorRota(servicos) {
    const rotasCount = {};
    const servicosAtivos = servicos.filter(s => s.statusManual !== 'finalizado');
    
    servicosAtivos.forEach(servico => {
        const rota = obterRotaPorCidade(servico.cidade);
        if (rota) {
            rotasCount[rota] = (rotasCount[rota] || 0) + 1;
        }
    });
    
    return rotasCount;
}

function obterStatusServico(servico, rotasCount) {
    if (servico.statusManual === 'finalizado') {
        return { status: "finalizado", texto: "✔️ Finalizado", classe: "status-finalizado" };
    }
    
    const rota = obterRotaPorCidade(servico.cidade);
    
    if (rota) {
        const quantidade = rotasCount[rota] || 0;
        if (quantidade >= 4) {
            return { status: "rota", texto: "✅ Rota Pré-montada", classe: "status-rota" };
        } else {
            const faltam = 4 - quantidade;
            return { status: "espera", texto: `⏳ Aguardando +${faltam} na rota`, classe: "status-espera" };
        }
    }
    
    return { status: "individual", texto: "📍 Rota em Espera", classe: "status-espera" };
}

function renderizarEstatisticas(servicos) {
    const rotasCount = calcularStatusPorRota(servicos);
    const finalizados = servicos.filter(s => s.statusManual === 'finalizado').length;
    
    const rotasComRota = Object.entries(rotasCount).filter(([_, count]) => count >= 4);
    const rotasSemRota = Object.entries(rotasCount).filter(([_, count]) => count < 4);
    
    let html = `<div class="stats-title">📊 Status das Rotas Agrupadas <small>(Mínimo 4 serviços por rota)</small></div><div class="stats-grid">`;
    
    rotasComRota.forEach(([rota, q]) => {
        html += `<div class="stat-card"><span class="stat-city">✅ ${rota}</span><span class="stat-count highlight">${q} serviços</span></div>`;
    });
    
    rotasSemRota.forEach(([rota, q]) => {
        const faltam = 4 - q;
        html += `<div class="stat-card"><span class="stat-city">⏳ ${rota}</span><span class="stat-count">${q} serviços (faltam ${faltam})</span></div>`;
    });
    
    const servicosAtivos = servicos.filter(s => s.statusManual !== 'finalizado');
    const cidadesNaoMapeadas = servicosAtivos.filter(s => !obterRotaPorCidade(s.cidade));
    if (cidadesNaoMapeadas.length > 0) {
        html += `<div class="stat-card"><span class="stat-city">📍Rota em Espera</span><span class="stat-count">${cidadesNaoMapeadas.length} serviços</span></div>`;
    }
    
    if (rotasComRota.length === 0 && rotasSemRota.length === 0 && finalizados === 0 && cidadesNaoMapeadas.length === 0) {
        html += '<div class="stat-card"><span class="stat-city">Nenhum serviço ativo</span></div>';
    }
    
    if (finalizados > 0) {
        html += `<div class="stat-card"><span class="stat-city">✔️ Finalizados</span><span class="stat-count">${finalizados} serviços</span></div>`;
    }
    
    statsContainer.innerHTML = html + `</div>`;
}

// ========== FUNÇÕES DE LOGIN ==========
window.abrirLoginAdmin = function () {
    const loginOverlay = document.getElementById("loginOverlay");
    loginOverlay.style.display = "flex";
    document.getElementById("loginUser").value = "";
    document.getElementById("loginPass").value = "";
    document.getElementById("loginError").textContent = "";
};

window.fecharLogin = function () {
    const loginOverlay = document.getElementById("loginOverlay");
    loginOverlay.style.display = "none";
};

window.fazerLogin = async function () {
    const usuario = document.getElementById("loginUser").value;
    const senha = document.getElementById("loginPass").value;
    const errorSpan = document.getElementById("loginError");

    if (!usuario || !senha) {
        errorSpan.textContent = "❌ Preencha usuário e senha";
        return;
    }

    try {
        const res = await fetch(`/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({ usuario, senha })
        });

        const data = await res.json();

        if (data.ok) {
            isAdmin = true;
            localStorage.setItem("isAdmin", "true");
            const loginOverlay = document.getElementById("loginOverlay");
            loginOverlay.style.display = "none";
            atualizarInterfaceAdmin();
            carregarServicos();
            alert("✅ Login realizado com sucesso! Agora você tem permissões de administrador.");
        } else {
            errorSpan.textContent = "❌ Usuário ou senha incorretos";
        }
    } catch (err) {
        console.error("Erro no login:", err);
        errorSpan.textContent = "❌ Erro de conexão com o servidor";
    }
};

window.logout = async function () {
    if (confirm("Deseja sair do modo administrador?")) {
        try {
            await fetch(`/logout`, {
                method: "POST",
                credentials: 'include'
            });
        } catch (e) { }
        localStorage.removeItem("isAdmin");
        isAdmin = false;
        atualizarInterfaceAdmin();
        carregarServicos();
        alert("👋 Você voltou ao modo visitante");
    }
};

function atualizarInterfaceAdmin() {
    if (isAdmin) {
        userTypeBadge.style.display = "inline-block";
        logoutBtn.style.display = "inline-block";
        const adminBar = document.querySelector('.admin-bar');
        if (!document.querySelector('.admin-login-btn')) {
            const loginBtn = document.createElement('button');
            loginBtn.className = 'logout-btn admin-login-btn';
            loginBtn.textContent = '👑 Modo Admin Ativo';
            loginBtn.style.background = '#10b981';
            loginBtn.style.cursor = 'default';
            adminBar.insertBefore(loginBtn, adminBar.firstChild);
        }
    } else {
        userTypeBadge.style.display = "none";
        logoutBtn.style.display = "none";
        const adminBtn = document.querySelector('.admin-login-btn');
        if (adminBtn) adminBtn.remove();

        const adminBar = document.querySelector('.admin-bar');
        if (!document.querySelector('.fazer-login-btn')) {
            const loginBtn = document.createElement('button');
            loginBtn.className = 'logout-btn fazer-login-btn';
            loginBtn.textContent = '🔐 Login Admin';
            loginBtn.onclick = () => {
                const loginOverlay = document.getElementById("loginOverlay");
                loginOverlay.style.display = "flex";
            };
            loginBtn.style.background = '#3e927b';
            adminBar.insertBefore(loginBtn, adminBar.firstChild);
        }
    }
}

// Iniciar como visitante
function iniciarSessao() {
    const mainContainer = document.getElementById("mainContainer");
    const loginOverlay = document.getElementById("loginOverlay");
    mainContainer.style.display = "block";
    loginOverlay.style.display = "none";

    const savedAdmin = localStorage.getItem("isAdmin");
    if (savedAdmin === "true") {
        isAdmin = true;
    } else {
        isAdmin = false;
        localStorage.setItem("isAdmin", "false");
    }

    atualizarInterfaceAdmin();
    carregarCidades();
    carregarServicos();
}

// Iniciar automaticamente como visitante
iniciarSessao();

// Abas
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(`tab-${tabId}`).classList.add("active");
        if (tabId === "list") carregarServicos();
    });
});

// API Calls
window.finalizarServico = async function (id) {
    if (!isAdmin) { alert("⚠️ Esta ação requer login de administrador! Clique em 'Login Admin' no topo da página."); return; }
    if (!confirm("Finalizar este serviço?")) return;
    try {
        const res = await fetch(`/finalizar/${id}`, {
            method: "PUT",
            credentials: 'include'
        });
        if (res.ok) { alert("✅ Finalizado!"); carregarServicos(); }
        else throw new Error();
    } catch { alert("❌ Erro!"); }
};

window.reativarServico = async function (id) {
    if (!isAdmin) { alert("⚠️ Esta ação requer login de administrador! Clique em 'Login Admin' no topo da página."); return; }
    if (!confirm("Reativar este serviço?")) return;
    try {
        const res = await fetch(`/reativar/${id}`, {
            method: "PUT",
            credentials: 'include'
        });
        if (res.ok) { alert("✅ Reativado!"); carregarServicos(); }
        else throw new Error();
    } catch { alert("❌ Erro!"); }
};

window.deletarServico = async function (id) {
    if (!isAdmin) { alert("⚠️ Esta ação requer login de administrador! Clique em 'Login Admin' no topo da página."); return; }
    if (!confirm("⚠️ Deletar permanentemente? Esta ação não pode ser desfeita!")) return;
    try {
        const res = await fetch(`/deletar/${id}`, {
            method: "DELETE",
            credentials: 'include'
        });
        if (res.ok) { alert("🗑️ Deletado!"); carregarServicos(); }
        else throw new Error();
    } catch { alert("❌ Erro!"); }
};

// FUNÇÃO PRINCIPAL DE CARREGAR SERVIÇOS (ATUALIZADA COM ROTAS)
async function carregarServicos() {
    loadingTable.style.display = "block";
    tableContent.innerHTML = "";
    try {
        const res = await fetch(`/listar`, {
            credentials: 'include'
        });
        if (!res.ok) throw new Error();
        todosServicos = await res.json();
        todosServicos = todosServicos.map(s => ({ ...s, statusManual: s.statusManual || "ativo" }));
        
        // Usar a nova função de contagem por ROTA
        const rotasCount = calcularStatusPorRota(todosServicos);
        todosServicos = todosServicos.map(s => ({ ...s, ...obterStatusServico(s, rotasCount) }));
        
        renderizarEstatisticas(todosServicos);
        aplicarFiltro();
    } catch (err) {
        console.error(err);
        tableContent.innerHTML = `<div class="no-data">❌ Erro ao carregar serviços. Verifique se o servidor está online.</div>`;
    } finally { loadingTable.style.display = "none"; }
}

function aplicarFiltro() {
    let filtrados = [...todosServicos];
    const texto = searchInput.value.toLowerCase();
    const status = filterStatus.value;
    if (texto) filtrados = filtrados.filter(s =>
        (s.nome && s.nome.toLowerCase().includes(texto)) ||
        (s.placa && s.placa.includes(texto)) ||
        (s.cidade && s.cidade.toLowerCase().includes(texto)) ||
        (s.operador && s.operador.toLowerCase().includes(texto))
    );
    if (status) filtrados = filtrados.filter(s => s.status === status);
    const total = Math.ceil(filtrados.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    renderizarTabela(filtrados.slice(start, start + itemsPerPage));
    renderizarPaginacao(total);
}

function renderizarTabela(servicos) {
    if (!servicos.length) { tableContent.innerHTML = `<div class="no-data">📭 Nenhum serviço encontrado</div>`; return; }

    let html = `<table><thead><tr><th>ID</th><th>Data</th><th>Operador</th><th>Serviço</th><th>Cliente</th><th>Placa</th><th>Cidade</th><th>Status</th><th>Ações</th></tr></thead><tbody>`;

    for (const s of servicos) {
        html += `<tr class="${s.status === 'finalizado' ? 'finalizado' : ''}">
                    <td>${s.id}</td>
                    <td>${new Date(s.data).toLocaleString('pt-BR')}</td>
                    <td>${escapeHtml(s.operador)}</td`;
        html += `<td>${escapeHtml(s.servico)}</td`;
        html += `<td>${escapeHtml(s.nome)}</td`;
        html += `<td><strong>${escapeHtml(s.placa)}</strong></td`;
        html += `<td>${escapeHtml(s.cidade)}</td`;
        html += `<td><span class="status-badge ${s.classe}">${s.texto}</span></td`;
        html += `<td>`;

        if (isAdmin) {
            if (s.status !== 'finalizado') {
                html += `<button class="btn-finalizar" onclick="finalizarServico(${s.id})" title="Finalizar">✔️</button>`;
            } else {
                html += `<button class="btn-reativar" onclick="reativarServico(${s.id})" title="Reativar">🔄</button>`;
            }
            html += `<button class="btn-deletar" onclick="deletarServico(${s.id})" title="Deletar">🗑️</button>`;
        } else {
            html += `<span style="color:#999; font-size:12px; display:inline-block; padding:5px;">🔒 Login admin necessário</span>`;
        }

        html += `</td></tr>`;
    }

    html += `</tbody></table>`;
    tableContent.innerHTML = html;
}

function renderizarPaginacao(total) {
    if (total <= 1) { paginationDiv.innerHTML = ""; return; }
    let html = `<button class="page-btn" onclick="mudarPagina(1)" ${currentPage === 1 ? 'disabled' : ''}>⏮️</button>`;
    html += `<button class="page-btn" onclick="mudarPagina(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>◀</button>`;
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(total, currentPage + 2); i++)
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="mudarPagina(${i})">${i}</button>`;
    html += `<button class="page-btn" onclick="mudarPagina(${currentPage + 1})" ${currentPage === total ? 'disabled' : ''}>▶</button>`;
    html += `<button class="page-btn" onclick="mudarPagina(${total})" ${currentPage === total ? 'disabled' : ''}>⏩</button>`;
    paginationDiv.innerHTML = html;
}

window.mudarPagina = function (page) { currentPage = page; aplicarFiltro(); window.scrollTo({ top: 400, behavior: 'smooth' }); };

// Cidades (IBGE - CE)
async function carregarCidades() {
    loadingIndicator.style.display = "block";
    cidadeInput.disabled = true;
    try {
        const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/23/municipios");
        const municipios = await res.json();
        cidades = municipios.sort((a, b) => a.nome.localeCompare(b.nome)).map(m => m.nome);
        cidadeInput.disabled = false;
        cidadeInput.placeholder = "Digite o nome da cidade";
    } catch (err) {
        showErrorMsg("❌ Erro ao carregar cidades.");
        cidadeInput.placeholder = "Erro ao carregar";
    } finally { loadingIndicator.style.display = "none"; }
}

function filterCities(term) {
    if (!term || term.length < 2) return [];
    const t = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return cidades.filter(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(t)).slice(0, 8);
}

cidadeInput.addEventListener('input', e => {
    const suggestions = filterCities(e.target.value);
    suggestionsList.innerHTML = '';
    if (!suggestions.length) { suggestionsList.classList.remove('active'); return; }
    suggestions.forEach(c => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = c;
        div.onclick = () => { cidadeInput.value = c; suggestionsList.classList.remove('active'); };
        suggestionsList.appendChild(div);
    });
    suggestionsList.classList.add('active');
});

document.addEventListener('click', e => { if (!cidadeInput.contains(e.target)) suggestionsList.classList.remove('active'); });

// Placa formatting
placaInput.addEventListener("input", e => {
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length > 7) v = v.slice(0, 7);
    if (v.length > 3 && /^\d{4}$/.test(v.slice(-4)) && v.length >= 7) {
        e.target.value = `${v.slice(0, 3)}-${v.slice(3, 7)}`;
    } else {
        e.target.value = v;
    }
});

function validarPlaca(p) {
    const limpa = p.replace(/[-\s]/g, '');
    return /^[A-Z]{3}[0-9]{4}$/.test(limpa) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(limpa);
}

function showErrorMsg(m) {
    errorDiv.textContent = m;
    errorDiv.style.display = "block";
    successDiv.style.display = "none";
    setTimeout(() => errorDiv.style.display = "none", 4000);
}

function showSuccessMsg() {
    successDiv.style.display = "block";
    errorDiv.style.display = "none";
    setTimeout(() => successDiv.style.display = "none", 3000);
}

// Submit
form.addEventListener("submit", async e => {
    e.preventDefault();
    const dados = {
        operador: document.getElementById("operador").value.trim(),
        servico: document.getElementById("servico").value,
        nome: document.getElementById("nome").value.trim(),
        placa: normalizarPlaca(document.getElementById("placa").value.trim().toUpperCase()),
        cidade: cidadeInput.value.trim(),
        statusManual: "ativo"
    };

    if (!dados.operador || !dados.servico || !dados.nome || !dados.placa || !dados.cidade) {
        return showErrorMsg("❌ Preencha todos os campos!");
    }
    if (cidades.length > 0 && !cidades.includes(dados.cidade)) {
        return showErrorMsg("❌ Cidade inválida! Selecione da lista.");
    }
    if (!validarPlaca(dados.placa)) {
        return showErrorMsg("❌ Placa inválida! Use AAA-1234 ou ABC1D23");
    }

    submitBtn.disabled = true;
    loadingDiv.style.display = "block";
    try {
        const res = await fetch(`/salvar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(dados)
        });
        if (res.ok) {
            showSuccessMsg();
            form.reset();
            cidadeInput.value = "";
            if (document.getElementById("tab-list").classList.contains("active")) carregarServicos();
        } else throw new Error();
    } catch (err) {
        showErrorMsg("❌ Erro de conexão com o servidor!");
    } finally {
        loadingDiv.style.display = "none";
        submitBtn.disabled = false;
    }
});

// ========== DARK MODE ==========
window.toggleTheme = function() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    if (body.classList.contains('dark')) {
        body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if (themeIcon) themeIcon.innerHTML = '☀️';
        if (themeText) themeText.innerHTML = 'Light';
    } else {
        body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        if (themeIcon) themeIcon.innerHTML = '🌙';
        if (themeText) themeText.innerHTML = 'Dark';
    }
};

// Carregar tema salvo
const savedTheme = localStorage.getItem('theme');
const themeIcon = document.getElementById('themeIcon');
const themeText = document.getElementById('themeText');

if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    if (themeIcon) themeIcon.innerHTML = '🌙';
    if (themeText) themeText.innerHTML = 'Dark';
} else {
    if (themeIcon) themeIcon.innerHTML = '☀️';
    if (themeText) themeText.innerHTML = 'Light';
}

function normalizarPlaca(p) { return p.replace(/[-\s]/g, '').toUpperCase(); }
function escapeHtml(t) { if (!t) return ''; return t.replace(/[&<>]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]; }); }

// Eventos
searchInput.addEventListener('input', () => { currentPage = 1; aplicarFiltro(); });
filterStatus.addEventListener('change', () => { currentPage = 1; aplicarFiltro(); });
refreshBtn.addEventListener('click', carregarServicos);