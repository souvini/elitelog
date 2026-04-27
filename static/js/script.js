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
        return { status: "finalizado", texto: '<i class="fa-solid fa-circle-check"></i> Finalizado', classe: "status-finalizado" };
    }
    
    const rota = obterRotaPorCidade(servico.cidade);
    
    if (rota) {
        const quantidade = rotasCount[rota] || 0;
        if (quantidade >= 4) {
           return { status: "rota", texto: '<i class="fa-solid fa-route"></i> Rota Pré-montada', classe: "status-rota" };
        } else {
            const faltam = 4 - quantidade;
            return { status: "espera", texto: `<i class="fa-solid fa-hourglass-half"></i> Aguardando +${faltam} na rota`, classe: "status-espera" };
        }
    }
    
    return { status: "individual", texto: '<i class="fa-solid fa-location-dot"></i> Rota em Espera', classe: "status-espera" };
}

function renderizarEstatisticas(servicos) {
    const rotasCount = calcularStatusPorRota(servicos);
    const finalizados = servicos.filter(s => s.statusManual === 'finalizado').length;
    
    const rotasComRota = Object.entries(rotasCount).filter(([_, count]) => count >= 4);
    const rotasSemRota = Object.entries(rotasCount).filter(([_, count]) => count < 4);
    
    const servicosAtivos = servicos.filter(s => s.statusManual !== 'finalizado');
    const cidadesNaoMapeadas = servicosAtivos.filter(s => !obterRotaPorCidade(s.cidade));
    
    let html = `
        <div class="stats-title">
            <i class="fa-solid fa-chart-pie"></i> Status das Rotas Agrupadas
            <small>(Mínimo 4 serviços por rota)</small>
        </div>
        <div class="stats-grid">
    `;
    
    // Função auxiliar para plural
    const plural = (n, singular, plural) => n === 1 ? singular : plural;
    
    // Rotas com rota pronta
    rotasComRota.forEach(([rota, q]) => {
        html += `
            <div class="stat-card">
                <span class="stat-city"><i class="fa-solid fa-circle-check"></i> ${rota}</span>
                <span class="stat-count highlight">${q} ${plural(q, 'serviço', 'serviços')}</span>
            </div>
        `;
    });
    
    // Rotas em espera
    rotasSemRota.forEach(([rota, q]) => {
        const faltam = 4 - q;
        html += `
            <div class="stat-card">
                <span class="stat-city"><i class="fa-solid fa-hourglass-half"></i> ${rota}</span>
                <span class="stat-count">${q} ${plural(q, 'serviço', 'serviços')} (${plural(faltam, 'falta', 'faltam')} ${faltam})</span>
            </div>
        `;
    });
    
    // Cidades não mapeadas
    if (cidadesNaoMapeadas.length > 0) {
        const qtd = cidadesNaoMapeadas.length;
        html += `
            <div class="stat-card">
                <span class="stat-city"><i class="fa-solid fa-location-dot"></i> Rota em Espera</span>
                <span class="stat-count">${qtd} ${plural(qtd, 'serviço', 'serviços')}</span>
            </div>
        `;
    }
    
    // Nenhum serviço ativo
    if (rotasComRota.length === 0 && rotasSemRota.length === 0 && finalizados === 0 && cidadesNaoMapeadas.length === 0) {
        html += `
            <div class="stat-card">
                <span class="stat-city"><i class="fa-solid fa-info-circle"></i> Nenhum serviço ativo</span>
                <span class="stat-count">0 serviços</span>
            </div>
        `;
    }
    
    // Serviços finalizados
    if (finalizados > 0) {
        html += `
            <div class="stat-card">
                <span class="stat-city"><i class="fa-solid fa-flag-checkered"></i> Finalizados</span>
                <span class="stat-count">${finalizados} ${plural(finalizados, 'serviço', 'serviços')}</span>
            </div>
        `;
    }
    
    statsContainer.innerHTML = html + `</div>`;
}

// ========== MOSTRAR/OCULTAR SENHA ==========
function initPasswordToggle() {
    const togglePassword = document.getElementById("toggleLoginPass");
    const loginPass = document.getElementById("loginPass");

    if (togglePassword && loginPass) {
        // Remover evento anterior para evitar duplicação
        const newToggle = togglePassword.cloneNode(true);
        togglePassword.parentNode.replaceChild(newToggle, togglePassword);
        
        newToggle.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isPassword = loginPass.getAttribute("type") === "password";
            
            if (isPassword) {
                loginPass.setAttribute("type", "text");
                this.className = "fa-regular fa-eye-slash";
            } else {
                loginPass.setAttribute("type", "password");
                this.className = "fa-regular fa-eye";
            }
        });
    }
}

// ========== FUNÇÕES DE LOGIN ==========
window.abrirLoginAdmin = function () {
    const overlay = document.getElementById("loginOverlay");
    if (!overlay) return;

    overlay.style.display = "flex";

    document.getElementById("loginUser").value = "";
    document.getElementById("loginPass").value = "";
    document.getElementById("loginError").innerHTML = "";
    
    // Reset do campo de senha para password
    const loginPass = document.getElementById("loginPass");
    const toggleIcon = document.getElementById("toggleLoginPass");
    
    if (loginPass) {
        loginPass.setAttribute("type", "password");
    }
    if (toggleIcon) {
        toggleIcon.className = "fa-regular fa-eye";
    }
    
    // Reinicializar o toggle
    initPasswordToggle();
};

window.fecharLogin = function () {
    const overlay = document.getElementById("loginOverlay");
    if (overlay) overlay.style.display = "none";
    
    // Limpar campos e erros ao fechar
    const loginUser = document.getElementById("loginUser");
    const loginPass = document.getElementById("loginPass");
    const loginError = document.getElementById("loginError");
    
    if (loginUser) loginUser.value = "";
    if (loginPass) loginPass.value = "";
    if (loginError) loginError.innerHTML = "";
    
    // Reset do tipo do campo de senha
    if (loginPass) loginPass.setAttribute("type", "password");
    
    // Reset do ícone do olho
    const toggleIcon = document.getElementById("togglePassword");
    if (toggleIcon) toggleIcon.className = "fa-regular fa-eye";
};

// LOGIN
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

        if (!res.ok) throw new Error("Falha na requisição");

        const data = await res.json();

        if (data.ok) {
            isAdmin = true;
            localStorage.setItem("isAdmin", "true");

            fecharLogin();
            atualizarInterfaceAdmin();
            carregarServicos();

            alert('<i class="fa-solid fa-check-circle"></i> Login realizado com sucesso!');
        } else {
            errorSpan.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Usuário ou senha incorretos';
        }

    } catch (err) {
        console.error("Erro no login:", err);
        errorSpan.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Erro de conexão com o servidor';
    }
};

// LOGOUT
window.logout = async function () {
    const confirmar = confirm('<i class="fa-solid fa-question-circle"></i> Deseja sair do modo administrador?');
    if (!confirmar) return;

    try {
        await fetch(`/logout`, {
            method: "POST",
            credentials: "include"
        });
    } catch (e) {
        console.warn("Erro ao fazer logout no servidor");
    }

    localStorage.removeItem("isAdmin");
    isAdmin = false;

    atualizarInterfaceAdmin();
    carregarServicos();

    alert('<i class="fa-solid fa-arrow-right-from-bracket"></i> Você voltou ao modo visitante');
};

// UI ADMIN
function atualizarInterfaceAdmin() {
    if (isAdmin) {
        userTypeBadge.style.display = "inline-flex";
        logoutBtn.style.display = "inline-flex";
        if (loginAdminBtn) loginAdminBtn.style.display = "none";
    } else {
        userTypeBadge.style.display = "none";
        logoutBtn.style.display = "none";
        if (loginAdminBtn) loginAdminBtn.style.display = "inline-flex";
    }
}

// INICIAR SESSÃO
function iniciarSessao() {
    const mainContainer = document.getElementById("mainContainer");
    const overlay = document.getElementById("loginOverlay");

    if (mainContainer) mainContainer.style.display = "block";
    if (overlay) overlay.style.display = "none";

    const savedAdmin = localStorage.getItem("isAdmin");
    isAdmin = savedAdmin === "true";

    atualizarInterfaceAdmin();
    carregarCidades();
    carregarServicos();
}

// ENTER PARA LOGAR E CONFIGURAR SENHA
document.addEventListener("DOMContentLoaded", () => {
    const loginPass = document.getElementById("loginPass");

    if (loginPass) {
        loginPass.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                fazerLogin();
            }
        });
    }
    
    // Configurar o toggle de senha
    initPasswordToggle();
    
    iniciarSessao();
});

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
// Função customizada de alerta
function showCustomAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert ${type}`;
    alertDiv.innerHTML = message;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 10px;
        font-size: 14px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        alertDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

// Versão com alert customizado
window.finalizarServico = async function (id) {
    if (!isAdmin) { 
        showCustomAlert('<i class="fa-solid fa-lock"></i> Apenas administradores podem finalizar serviços!', 'error');
        return; 
    }
    if (!confirm('<i class="fa-solid fa-question-circle"></i> Finalizar este serviço?')) return;
    try {
        const res = await fetch(`/finalizar/${id}`, {
            method: "PUT",
            credentials: 'include'
        });
        if (res.ok) { 
            showCustomAlert('<i class="fa-solid fa-check-circle"></i> Serviço finalizado com sucesso!', 'success');
            carregarServicos(); 
        }
        else throw new Error();
    } catch { 
        showCustomAlert('<i class="fa-solid fa-circle-exclamation"></i> Erro ao finalizar o serviço!', 'error');
    }
};
window.reativarServico = async function (id) {
    if (!isAdmin) { 
        alert('<i class="fa-solid fa-lock"></i> Apenas administradores podem reativar serviços!'); 
        return; 
    }
    if (!confirm('<i class="fa-solid fa-question-circle"></i> Reativar este serviço?')) return;
    try {
        const res = await fetch(`/reativar/${id}`, {
            method: "PUT",
            credentials: 'include'
        });
        if (res.ok) { 
            alert('<i class="fa-solid fa-check-circle"></i> Reativado!'); 
            carregarServicos(); 
        } else {
            throw new Error();
        }
    } catch { 
        alert('<i class="fa-solid fa-circle-exclamation"></i> Erro ao reativar!'); 
    }
};
window.deletarServico = async function (id) {
    if (!isAdmin) { 
        alert('<i class="fa-solid fa-lock"></i> Apenas administradores podem deletar serviços!'); 
        return; 
    }
    if (!confirm('<i class="fa-solid fa-triangle-exclamation"></i> Deletar permanentemente? Esta ação não pode ser desfeita!')) return;
    try {
        const res = await fetch(`/deletar/${id}`, {
            method: "DELETE",
            credentials: 'include'
        });
        if (res.ok) { 
            alert('<i class="fa-solid fa-trash-can"></i> Deletado!'); 
            carregarServicos(); 
        } else {
            throw new Error();
        }
    } catch { 
        alert('<i class="fa-solid fa-circle-exclamation"></i> Erro ao deletar!'); 
    }
};
// FUNÇÃO PRINCIPAL DE CARREGAR SERVIÇOS
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
        
        const rotasCount = calcularStatusPorRota(todosServicos);
        todosServicos = todosServicos.map(s => ({ ...s, ...obterStatusServico(s, rotasCount) }));
        
        renderizarEstatisticas(todosServicos);
        aplicarFiltro();
    } catch (err) {
        console.error(err);
        tableContent.innerHTML = `<div class="no-data"><i class="fa-solid fa-circle-exclamation"></i> Erro ao carregar serviços. Verifique se o servidor está online.</div>`;
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
    if (!servicos.length) { 
    tableContent.innerHTML = `<div class="no-data"><i class="fa-solid fa-folder-open"></i> Nenhum serviço encontrado</div>`; 
    return; 
}

 let html = `
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th><i class="fa-solid fa-calendar-days"></i> Data</th>
                <th><i class="fa-solid fa-user"></i> Operador</th>
                <th><i class="fa-solid fa-screwdriver-wrench"></i> Serviço</th>
                <th><i class="fa-solid fa-users"></i> Cliente</th>
                <th><i class="fa-solid fa-car"></i> Placa</th>
                <th><i class="fa-solid fa-location-dot"></i> Cidade</th>
                <th><i class="fa-solid fa-chart-simple"></i> Status</th>
                <th><i class="fa-solid fa-bolt"></i> Ações</th>
            </tr>
        </thead>
        <tbody>
`;

    for (const s of servicos) {
        const rowClass = s.status === 'finalizado' ? 'finalizado' : '';
        const dataFormatada = new Date(s.data).toLocaleString('pt-BR');
        
        html += `
            <tr class="${rowClass}">
                <td style="text-align: center; font-weight: 600;">${s.id}</td>
                <td style="white-space: nowrap;">${dataFormatada}</td>
                <td>${escapeHtml(s.operador)}</td>
                <td>${escapeHtml(s.servico)}</td>
                <td><strong>${escapeHtml(s.nome)}</strong></td>
                <td style="font-family: monospace; font-weight: bold; text-align: center;">${escapeHtml(s.placa)}</td>
                <td>${escapeHtml(s.cidade)}</td>
                <td><span class="status-badge ${s.classe}">${s.texto}</span></td>
                <td class="actions-cell">
        `;

        if (isAdmin) {
    if (s.status !== 'finalizado') {
        html += `
        <button class="btn-finalizar" onclick="finalizarServico(${s.id})" title="Finalizar">
            <i class="fa-solid fa-check"></i> Finalizar
        </button>`;
    } else {
        html += `
        <button class="btn-reativar" onclick="reativarServico(${s.id})" title="Reativar">
            <i class="fa-solid fa-rotate"></i> Reativar
        </button>`;
    }

    html += `
    <button class="btn-deletar" onclick="deletarServico(${s.id})" title="Deletar">
        <i class="fa-solid fa-trash"></i> Deletar
    </button>`;
} else {
    html += `
    <span style="color:#999; font-size:11px;">
        <i class="fa-solid fa-lock"></i> Login admin
    </span>`;
}

        html += `
                </td>
            </tr>
        `;
    }

    html += `
            </tbody>
        </table>
    `;
    
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
        showErrorMsg('<i class="fa-solid fa-circle-exclamation"></i> Erro ao carregar cidades.');
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
        return showErrorMsg('<i class="fa-solid fa-circle-exclamation"></i> Preencha todos os campos!');
    }
    if (cidades.length > 0 && !cidades.includes(dados.cidade)) {
        return showErrorMsg('<i class="fa-solid fa-circle-exclamation"></i> Cidade inválida! Selecione da lista.');
    }
    if (!validarPlaca(dados.placa)) {
        return showErrorMsg('<i class="fa-solid fa-circle-exclamation"></i> Placa inválida! Use AAA-1234 ou ABC1D23');
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
        showErrorMsg('<i class="fa-solid fa-circle-exclamation"></i> Erro de conexão com o servidor!');
    } finally {
        loadingDiv.style.display = "none";
        submitBtn.disabled = false;
    }
});

// ========== DARK MODE ==========
// ========== DARK MODE COM ANIMAÇÃO ==========
window.toggleTheme = function() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    // Adiciona classe de animação
    if (themeIcon) themeIcon.style.transform = 'rotate(360deg)';
    
    setTimeout(() => {
        if (body.classList.contains('dark')) {
            body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            if (themeIcon) {
                themeIcon.className = 'fas fa-sun';
                themeIcon.style.color = '#f5f3f0';
            }
            if (themeText) themeText.innerHTML = 'Light';
        } else {
            body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            if (themeIcon) {
                themeIcon.className = 'fas fa-moon';
                themeIcon.style.color = '#cbd5e1';
            }
            if (themeText) themeText.innerHTML = 'Dark';
        }
        
        // Remove animação
        setTimeout(() => {
            if (themeIcon) themeIcon.style.transform = '';
        }, 200);
    }, 100);
};
// Carregar tema salvo
const savedTheme = localStorage.getItem('theme');
const themeIcon = document.getElementById('themeIcon');
const themeText = document.getElementById('themeText');

if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    if (themeIcon) themeIcon.innerHTML = '';
    if (themeText) themeText.innerHTML = 'Dark';
} else {
    if (themeIcon) themeIcon.innerHTML = '';
    if (themeText) themeText.innerHTML = 'Light';
}

function normalizarPlaca(p) { return p.replace(/[-\s]/g, '').toUpperCase(); }
function escapeHtml(t) { if (!t) return ''; return t.replace(/[&<>]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]; }); }

// Eventos
searchInput.addEventListener('input', () => { currentPage = 1; aplicarFiltro(); });
filterStatus.addEventListener('change', () => { currentPage = 1; aplicarFiltro(); });
refreshBtn.addEventListener('click', carregarServicos);
// ========== FECHAR MODAL AO CLICAR FORA ==========
document.addEventListener("DOMContentLoaded", function() {
    const loginOverlay = document.getElementById("loginOverlay");
    
    if (loginOverlay) {
        // Fecha ao clicar no fundo escuro (overlay)
        loginOverlay.addEventListener("click", function(e) {
            if (e.target === loginOverlay) {
                fecharLogin();
            }
        });
    }
    
    // Fecha ao pressionar a tecla ESC
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            const overlay = document.getElementById("loginOverlay");
            if (overlay && overlay.style.display === "flex") {
                fecharLogin();
            }
        }
    });
});