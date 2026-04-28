let isAdmin = false;
let todosServicos = [], cidades = [], currentPage = 1, itemsPerPage = 10;

// ========== ELEMENTOS DOM ==========
const userTypeBadge = document.getElementById("userTypeBadge");
const logoutBtn = document.getElementById("logoutBtn");
const loginAdminBtn = document.getElementById("loginAdminBtn");
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

// ========== DICIONÁRIO DE ROTAS ==========
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
        if (cidades.includes(cidade)) return nomeRota;
    }
    return null;
}

// ========== STATUS POR ROTA ==========
function calcularStatusPorRota(servicos) {
    const rotasCount = {};
    const servicosAtivos = servicos.filter(s => s.statusManual !== 'finalizado');
    
    servicosAtivos.forEach(servico => {
        const rota = obterRotaPorCidade(servico.cidade);
        if (rota) rotasCount[rota] = (rotasCount[rota] || 0) + 1;
    });
    return rotasCount;
}

function obterStatusServico(servico, rotasCount) {
    if (servico.statusManual === 'finalizado') {
        return { status: "finalizado", texto: '<i class="fa-solid fa-circle-check"></i> Finalizado', classe: "status-finalizado" };
    }
    
    const rota = obterRotaPorCidade(servico.cidade);
    if (rota) {
        const qtd = rotasCount[rota] || 0;
        if (qtd >= 4) {
            return { status: "rota", texto: '<i class="fa-solid fa-route"></i> Rota Pré-montada', classe: "status-rota" };
        } else {
            const faltam = 4 - qtd;
            return { status: "espera", texto: `<i class="fa-solid fa-hourglass-half"></i> Aguardando +${faltam} na rota`, classe: "status-espera" };
        }
    }
    return { status: "individual", texto: '<i class="fa-solid fa-location-dot"></i> Rota em Espera', classe: "status-espera" };
}

function renderizarEstatisticas(servicos) {
    const rotasCount = calcularStatusPorRota(servicos);
    const finalizados = servicos.filter(s => s.statusManual === 'finalizado').length;
    const rotasComRota = Object.entries(rotasCount).filter(([_, c]) => c >= 4);
    const rotasSemRota = Object.entries(rotasCount).filter(([_, c]) => c < 4);
    const cidadesNaoMapeadas = servicos.filter(s => s.statusManual !== 'finalizado' && !obterRotaPorCidade(s.cidade));
    
    const plural = (n, s, p) => n === 1 ? s : p;
    let html = `<div class="stats-title"><i class="fa-solid fa-chart-pie"></i> Status das Rotas Agrupadas <small>(Mínimo 4 serviços por rota)</small></div><div class="stats-grid">`;
    
    rotasComRota.forEach(([rota, q]) => {
        html += `<div class="stat-card"><span class="stat-city"><i class="fa-solid fa-circle-check"></i> ${rota}</span><span class="stat-count highlight">${q} ${plural(q, 'serviço', 'serviços')}</span></div>`;
    });
    
    rotasSemRota.forEach(([rota, q]) => {
        const faltam = 4 - q;
        html += `<div class="stat-card"><span class="stat-city"><i class="fa-solid fa-hourglass-half"></i> ${rota}</span><span class="stat-count">${q} ${plural(q, 'serviço', 'serviços')} (${plural(faltam, 'falta', 'faltam')} ${faltam})</span></div>`;
    });
    
    if (cidadesNaoMapeadas.length > 0) {
        html += `<div class="stat-card"><span class="stat-city"><i class="fa-solid fa-location-dot"></i> Rota em Espera</span><span class="stat-count">${cidadesNaoMapeadas.length} ${plural(cidadesNaoMapeadas.length, 'serviço', 'serviços')}</span></div>`;
    }
    
    if (!rotasComRota.length && !rotasSemRota.length && !finalizados && !cidadesNaoMapeadas.length) {
        html += `<div class="stat-card"><span class="stat-city"><i class="fa-solid fa-info-circle"></i> Nenhum serviço ativo</span><span class="stat-count">0 serviços</span></div>`;
    }
    
    if (finalizados > 0) {
        html += `<div class="stat-card"><span class="stat-city"><i class="fa-solid fa-flag-checkered"></i> Finalizados</span><span class="stat-count">${finalizados} ${plural(finalizados, 'serviço', 'serviços')}</span></div>`;
    }
    
    statsContainer.innerHTML = html + `</div>`;
}

// ========== LOGIN ==========
function initPasswordToggle() {
    const toggle = document.getElementById("toggleLoginPass");
    const passInput = document.getElementById("loginPass");
    if (!toggle || !passInput) return;
    
    const newToggle = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(newToggle, toggle);
    
    newToggle.addEventListener("click", (e) => {
        e.preventDefault();
        const isPassword = passInput.type === "password";
        passInput.type = isPassword ? "text" : "password";
        newToggle.className = isPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
    });
}

window.abrirLoginAdmin = function () {
    const overlay = document.getElementById("loginOverlay");
    if (!overlay) return;
    
    overlay.style.display = "flex";
    document.getElementById("loginUser").value = "";
    document.getElementById("loginPass").value = "";
    document.getElementById("loginError").innerHTML = "";
    
    const passInput = document.getElementById("loginPass");
    const toggleIcon = document.getElementById("toggleLoginPass");
    if (passInput) passInput.type = "password";
    if (toggleIcon) toggleIcon.className = "fa-regular fa-eye";
    initPasswordToggle();
};

window.fecharLogin = function () {
    const overlay = document.getElementById("loginOverlay");
    if (overlay) overlay.style.display = "none";
    
    const userInput = document.getElementById("loginUser");
    const passInput = document.getElementById("loginPass");
    const errorSpan = document.getElementById("loginError");
    const toggleIcon = document.getElementById("togglePassword");
    
    if (userInput) userInput.value = "";
    if (passInput) passInput.value = "";
    if (errorSpan) errorSpan.innerHTML = "";
    if (passInput) passInput.type = "password";
    if (toggleIcon) toggleIcon.className = "fa-regular fa-eye";
};

window.fazerLogin = async function () {
    const usuario = document.getElementById("loginUser")?.value.trim();
    const senha = document.getElementById("loginPass")?.value.trim();
    const errorSpan = document.getElementById("loginError");
    
    if (!usuario || !senha) {
        errorSpan.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Preencha usuário e senha';
        return;
    }
    
    try {
        const res = await fetch(`/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ usuario, senha })
        });
        
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        if (data.ok) {
            isAdmin = true;
            localStorage.setItem("isAdmin", "true");
            window.fecharLogin();
            atualizarInterfaceAdmin();
            carregarServicos();
            alert('<i class="fa-solid fa-check-circle"></i> Login realizado com sucesso!');
        } else {
            errorSpan.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Usuário ou senha incorretos';
        }
    } catch (err) {
        errorSpan.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Erro de conexão com o servidor';
    }
};

window.logout = async function () {
    if (!confirm('<i class="fa-solid fa-question-circle"></i> Deseja sair do modo administrador?')) return;
    
    try { await fetch(`/logout`, { method: "POST", credentials: "include" }); } catch(e) {}
    
    localStorage.removeItem("isAdmin");
    isAdmin = false;
    atualizarInterfaceAdmin();
    carregarServicos();
    alert('<i class="fa-solid fa-arrow-right-from-bracket"></i> Você voltou ao modo visitante');
};

function atualizarInterfaceAdmin() {
    if (isAdmin) {
        if (userTypeBadge) userTypeBadge.style.display = "inline-flex";
        if (logoutBtn) logoutBtn.style.display = "inline-flex";
        if (loginAdminBtn) loginAdminBtn.style.display = "none";
    } else {
        if (userTypeBadge) userTypeBadge.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "none";
        if (loginAdminBtn) loginAdminBtn.style.display = "inline-flex";
    }
}

// ========== INICIALIZAÇÃO ==========
function iniciarSessao() {
    const mainContainer = document.getElementById("mainContainer");
    const overlay = document.getElementById("loginOverlay");
    if (mainContainer) mainContainer.style.display = "block";
    if (overlay) overlay.style.display = "none";
    
    isAdmin = localStorage.getItem("isAdmin") === "true";
    atualizarInterfaceAdmin();
    carregarCidades();
    carregarServicos();
}

// ========== ABAS ==========
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const tabId = btn.dataset.tab;
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(`tab-${tabId}`).classList.add("active");
        if (tabId === "list") carregarServicos();
    });
});

// ========== API CALLS ==========
function showCustomAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.innerHTML = message;
    alertDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white; border-radius: 10px; font-size: 14px; z-index: 9999;
        display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}

window.finalizarServico = async function(id) {
    if (!isAdmin) return showCustomAlert('<i class="fa-solid fa-lock"></i> Apenas administradores podem finalizar!', 'error');
    if (!confirm('<i class="fa-solid fa-question-circle"></i> Finalizar este serviço?')) return;
    try {
        const res = await fetch(`/finalizar/${id}`, { method: "PUT", credentials: 'include' });
        if (res.ok) {
            showCustomAlert('<i class="fa-solid fa-check-circle"></i> Finalizado!', 'success');
            carregarServicos();
        }
    } catch { showCustomAlert('<i class="fa-solid fa-circle-exclamation"></i> Erro ao finalizar!', 'error'); }
};

window.reativarServico = async function(id) {
    if (!isAdmin) return alert('<i class="fa-solid fa-lock"></i> Apenas administradores podem reativar!');
    if (!confirm('<i class="fa-solid fa-question-circle"></i> Reativar este serviço?')) return;
    try {
        const res = await fetch(`/reativar/${id}`, { method: "PUT", credentials: 'include' });
        if (res.ok) { alert('<i class="fa-solid fa-check-circle"></i> Reativado!'); carregarServicos(); }
    } catch { alert('<i class="fa-solid fa-circle-exclamation"></i> Erro ao reativar!'); }
};

window.deletarServico = async function(id) {
    if (!isAdmin) return alert('<i class="fa-solid fa-lock"></i> Apenas administradores podem deletar!');
    if (!confirm('<i class="fa-solid fa-triangle-exclamation"></i> Deletar permanentemente?')) return;
    try {
        const res = await fetch(`/deletar/${id}`, { method: "DELETE", credentials: 'include' });
        if (res.ok) { alert('<i class="fa-solid fa-trash-can"></i> Deletado!'); carregarServicos(); }
    } catch { alert('<i class="fa-solid fa-circle-exclamation"></i> Erro ao deletar!'); }
};

async function carregarServicos() {
    if (loadingTable) loadingTable.style.display = "block";
    if (tableContent) tableContent.innerHTML = "";
    try {
        const res = await fetch(`/listar`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        todosServicos = await res.json();
        todosServicos = todosServicos.map(s => ({ ...s, statusManual: s.statusManual || "ativo" }));
        
        const rotasCount = calcularStatusPorRota(todosServicos);
        todosServicos = todosServicos.map(s => ({ ...s, ...obterStatusServico(s, rotasCount) }));
        
        renderizarEstatisticas(todosServicos);
        aplicarFiltro();
    } catch (err) {
        if (tableContent) tableContent.innerHTML = `<div class="no-data"><i class="fa-solid fa-circle-exclamation"></i> Erro ao carregar serviços.</div>`;
    } finally { if (loadingTable) loadingTable.style.display = "none"; }
}

function aplicarFiltro() {
    let filtrados = [...todosServicos];
    const texto = searchInput?.value.toLowerCase() || "";
    const status = filterStatus?.value || "";
    
    if (texto) filtrados = filtrados.filter(s =>
        (s.nome?.toLowerCase().includes(texto)) ||
        (s.placa?.includes(texto)) ||
        (s.cidade?.toLowerCase().includes(texto)) ||
        (s.operador?.toLowerCase().includes(texto))
    );
    if (status) filtrados = filtrados.filter(s => s.status === status);
    
    const total = Math.ceil(filtrados.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    renderizarTabela(filtrados.slice(start, start + itemsPerPage));
    renderizarPaginacao(total);
}

function renderizarTabela(servicos) {
    if (!servicos.length) {
        if (tableContent) tableContent.innerHTML = `<div class="no-data"><i class="fa-solid fa-folder-open"></i> Nenhum serviço encontrado</div>`;
        return;
    }
    
    let html = `<table><thead><tr>
        <th>ID</th><th><i class="fa-solid fa-calendar-days"></i> Data</th>
        <th><i class="fa-solid fa-user"></i> Operador</th>
        <th><i class="fa-solid fa-screwdriver-wrench"></i> Serviço</th>
        <th><i class="fa-solid fa-users"></i> Cliente</th>
        <th><i class="fa-solid fa-car"></i> Placa</th>
        <th><i class="fa-solid fa-location-dot"></i> Cidade</th>
        <th><i class="fa-solid fa-chart-simple"></i> Status</th>
        <th><i class="fa-solid fa-bolt"></i> Ações</th>
    </tr></thead><tbody>`;
    
    for (const s of servicos) {
        const dataFormatada = new Date(s.data).toLocaleString('pt-BR');
        html += `<tr class="${s.status === 'finalizado' ? 'finalizado' : ''}">
            <td style="text-align:center; font-weight:600;">${s.id}</td>
            <td>${dataFormatada}</td>
            <td>${escapeHtml(s.operador)}</td>
            <td>${escapeHtml(s.servico)}</td>
            <td><strong>${escapeHtml(s.nome)}</strong></td>
            <td style="font-family:monospace; font-weight:bold; text-align:center;">${escapeHtml(s.placa)}</td>
            <td>${escapeHtml(s.cidade)}</td>
            <td><span class="status-badge ${s.classe}">${s.texto}</span></td>
            <td class="actions-cell">`;
        
        if (isAdmin) {
            if (s.status !== 'finalizado') {
                html += `<button class="btn-finalizar" onclick="finalizarServico(${s.id})"><i class="fa-solid fa-check"></i> Finalizar</button>`;
            } else {
                html += `<button class="btn-reativar" onclick="reativarServico(${s.id})"><i class="fa-solid fa-rotate"></i> Reativar</button>`;
            }
            html += `<button class="btn-deletar" onclick="deletarServico(${s.id})"><i class="fa-solid fa-trash"></i> Deletar</button>`;
        } else {
            html += `<span style="color:#999; font-size:11px;"><i class="fa-solid fa-lock"></i> Login admin</span>`;
        }
        html += `</td></tr>`;
    }
    html += `</tbody></table>`;
    if (tableContent) tableContent.innerHTML = html;
}

function renderizarPaginacao(total) {
    if (total <= 1) { if (paginationDiv) paginationDiv.innerHTML = ""; return; }
    let html = `<button class="page-btn" onclick="mudarPagina(1)" ${currentPage === 1 ? 'disabled' : ''}>⏮️</button>`;
    html += `<button class="page-btn" onclick="mudarPagina(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>◀</button>`;
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(total, currentPage + 2); i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="mudarPagina(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" onclick="mudarPagina(${currentPage + 1})" ${currentPage === total ? 'disabled' : ''}>▶</button>`;
    html += `<button class="page-btn" onclick="mudarPagina(${total})" ${currentPage === total ? 'disabled' : ''}>⏩</button>`;
    if (paginationDiv) paginationDiv.innerHTML = html;
}

window.mudarPagina = function(page) { currentPage = page; aplicarFiltro(); window.scrollTo({ top: 400, behavior: 'smooth' }); };

// ========== CIDADES (IBGE - CE) ==========
async function carregarCidades() {
    if (loadingIndicator) loadingIndicator.style.display = "block";
    if (cidadeInput) cidadeInput.disabled = true;
    try {
        const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/23/municipios");
        const municipios = await res.json();
        cidades = municipios.sort((a, b) => a.nome.localeCompare(b.nome)).map(m => m.nome);
        if (cidadeInput) {
            cidadeInput.disabled = false;
            cidadeInput.placeholder = "Digite o nome da cidade";
        }
    } catch (err) {
        showErrorMsg('<i class="fa-solid fa-circle-exclamation"></i> Erro ao carregar cidades.');
        if (cidadeInput) cidadeInput.placeholder = "Erro ao carregar";
    } finally { if (loadingIndicator) loadingIndicator.style.display = "none"; }
}

function filterCities(term) {
    if (!term || term.length < 2) return [];
    const t = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return cidades.filter(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(t)).slice(0, 8);
}

if (cidadeInput) {
    cidadeInput.addEventListener('input', e => {
        const suggestions = filterCities(e.target.value);
        if (suggestionsList) suggestionsList.innerHTML = '';
        if (!suggestions.length) {
            if (suggestionsList) suggestionsList.classList.remove('active');
            return;
        }
        suggestions.forEach(c => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = c;
            div.onclick = () => { cidadeInput.value = c; if (suggestionsList) suggestionsList.classList.remove('active'); };
            if (suggestionsList) suggestionsList.appendChild(div);
        });
        if (suggestionsList) suggestionsList.classList.add('active');
    });
}

document.addEventListener('click', e => { if (cidadeInput && suggestionsList && !cidadeInput.contains(e.target)) suggestionsList.classList.remove('active'); });

// ========== PLACA ==========
if (placaInput) {
    placaInput.addEventListener("input", e => {
        let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (v.length > 7) v = v.slice(0, 7);
        e.target.value = (v.length > 3 && /^\d{4}$/.test(v.slice(-4)) && v.length >= 7) ? `${v.slice(0, 3)}-${v.slice(3, 7)}` : v;
    });
}

function validarPlaca(p) {
    const limpa = p.replace(/[-\s]/g, '');
    return /^[A-Z]{3}[0-9]{4}$/.test(limpa) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(limpa);
}

// ========== FEEDBACK ==========
function showErrorMsg(m) {
    if (errorDiv) {
        errorDiv.innerHTML = m;
        errorDiv.style.display = "block";
        if (successDiv) successDiv.style.display = "none";
        setTimeout(() => { if (errorDiv) errorDiv.style.display = "none"; }, 4000);
    }
}

function showSuccessMsg() {
    if (successDiv) {
        successDiv.style.display = "block";
        if (errorDiv) errorDiv.style.display = "none";
        setTimeout(() => { if (successDiv) successDiv.style.display = "none"; }, 3000);
    }
}

// ========== SUBMIT ==========
if (form) {
    form.addEventListener("submit", async e => {
        e.preventDefault();
        const dados = {
            operador: document.getElementById("operador")?.value.trim() || "",
            servico: document.getElementById("servico")?.value || "",
            nome: document.getElementById("nome")?.value.trim() || "",
            placa: normalizarPlaca(document.getElementById("placa")?.value.trim().toUpperCase() || ""),
            cidade: cidadeInput?.value.trim() || "",
            statusManual: "ativo"
        };
        
        if (!dados.operador || !dados.servico || !dados.nome || !dados.placa || !dados.cidade) {
            return showErrorMsg('<i class="fa-solid fa-circle-exclamation"></i> Preencha todos os campos!');
        }
        if (cidades.length > 0 && !cidades.includes(dados.cidade)) {
            return showErrorMsg('<i class="fa-solid fa-circle-exclamation"></i> Cidade inválida!');
        }
        if (!validarPlaca(dados.placa)) {
            return showErrorMsg('<i class="fa-solid fa-circle-exclamation"></i> Placa inválida! Use AAA-1234 ou ABC1D23');
        }
        
        if (submitBtn) submitBtn.disabled = true;
        if (loadingDiv) loadingDiv.style.display = "block";
        
        try {
            const res = await fetch(`/salvar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(dados)
            });
            if (res.ok) {
                showSuccessMsg();
                if (form) form.reset();
                if (cidadeInput) cidadeInput.value = "";
                if (document.getElementById("tab-list")?.classList.contains("active")) carregarServicos();
            }
        } catch (err) {
            showErrorMsg('<i class="fa-solid fa-circle-exclamation"></i> Erro de conexão!');
        } finally {
            if (loadingDiv) loadingDiv.style.display = "none";
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

// ========== DARK MODE ==========
window.toggleTheme = function() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    if (themeIcon) themeIcon.style.transform = 'rotate(360deg)';
    
    setTimeout(() => {
        if (body.classList.contains('dark')) {
            body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            if (themeIcon) { themeIcon.className = 'fas fa-sun'; themeIcon.style.color = '#f7f7f7'; }
            if (themeText) themeText.innerHTML = 'Light';
        } else {
            body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            if (themeIcon) { themeIcon.className = 'fas fa-moon'; themeIcon.style.color = '#cbd5e1'; }
            if (themeText) themeText.innerHTML = 'Dark';
        }
        setTimeout(() => { if (themeIcon) themeIcon.style.transform = ''; }, 200);
    }, 100);
};

const savedTheme = localStorage.getItem('theme');
const themeIcon = document.getElementById('themeIcon');
const themeText = document.getElementById('themeText');

if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    if (themeIcon) { themeIcon.className = 'fas fa-moon'; themeIcon.style.color = '#cbd5e1'; }
    if (themeText) themeText.innerHTML = 'Dark';
} else {
    if (themeIcon) { themeIcon.className = 'fas fa-sun'; themeIcon.style.color = '#f3f0ec'; }
    if (themeText) themeText.innerHTML = 'Light';
}

// ========== UTILIDADES ==========
function normalizarPlaca(p) { return p.replace(/[-\s]/g, '').toUpperCase(); }
function escapeHtml(t) { if (!t) return ''; return t.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

// ========== EVENTOS ==========
if (searchInput) searchInput.addEventListener('input', () => { currentPage = 1; aplicarFiltro(); });
if (filterStatus) filterStatus.addEventListener('change', () => { currentPage = 1; aplicarFiltro(); });
if (refreshBtn) refreshBtn.addEventListener('click', carregarServicos);

// ========== FECHAR MODAL CLICANDO FORA ==========
document.addEventListener("DOMContentLoaded", () => {
    const loginOverlay = document.getElementById("loginOverlay");
    if (loginOverlay) {
        loginOverlay.addEventListener("click", (e) => { if (e.target === loginOverlay) window.fecharLogin(); });
    }
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const overlay = document.getElementById("loginOverlay");
            if (overlay && overlay.style.display === "flex") window.fecharLogin();
        }
    });
    
    // Inicializar
    const loginPass = document.getElementById("loginPass");
    if (loginPass) {
        loginPass.addEventListener("keypress", (e) => { if (e.key === "Enter") window.fazerLogin(); });
    }
    initPasswordToggle();
    iniciarSessao();
});