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
    
    for