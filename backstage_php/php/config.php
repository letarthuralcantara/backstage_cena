<?php
/**
 * BACKSTAGE CENA - Configuração do Banco de Dados
 * 
 * Este arquivo estabelece a conexão com o banco de dados MySQL
 * e define configurações gerais do sistema.
 */

// Iniciar sessão (necessário para login/logout)
session_start();

// ============================================
// CONFIGURAÇÕES DO BANCO DE DADOS
// ============================================

define('DB_HOST', 'localhost');        // Host do banco (geralmente localhost)
define('DB_USER', 'root');             // Usuário do MySQL (padrão: root)
define('DB_PASS', '');                 // Senha do MySQL (padrão: vazio no XAMPP)
define('DB_NAME', 'backstage_cena');   // Nome do banco de dados

// ============================================
// CRIAR CONEXÃO COM O BANCO
// ============================================

try {
    // Criar conexão usando MySQLi
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    // Verificar se houve erro na conexão
    if ($conn->connect_error) {
        throw new Exception("Erro na conexão: " . $conn->connect_error);
    }
    
    // Definir charset para UTF-8 (aceita acentos e caracteres especiais)
    $conn->set_charset("utf8mb4");
    
    // Conexão estabelecida com sucesso!
    // echo "Conexão com banco de dados estabelecida com sucesso!"; // Descomente para testar
    
} catch (Exception $e) {
    // Se houver erro, exibir mensagem e parar execução
    die("ERRO DE CONEXÃO COM O BANCO DE DADOS: " . $e->getMessage());
}

// ============================================
// CONFIGURAÇÕES GERAIS DO SISTEMA
// ============================================

// Fuso horário
date_default_timezone_set('America/Sao_Paulo');

// Pasta para upload de fotos de perfil
define('UPLOAD_DIR', '../uploads/');

// Tamanho máximo de upload (5MB)
define('MAX_FILE_SIZE', 5242880);

// Extensões permitidas para upload
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif']);

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Função para sanitizar dados de entrada (prevenir SQL Injection)
 */
function limpar_entrada($data) {
    global $conn;
    $data = trim($data);                           // Remove espaços extras
    $data = stripslashes($data);                   // Remove barras invertidas
    $data = htmlspecialchars($data);               // Converte caracteres especiais
    $data = $conn->real_escape_string($data);      // Escapa caracteres SQL
    return $data;
}

/**
 * Função para verificar se o usuário está logado
 */
function verificar_login() {
    if (!isset($_SESSION['usuario_id'])) {
        header("Location: ../login.html");
        exit();
    }
}

/**
 * Função para fazer logout
 */
function logout() {
    session_unset();
    session_destroy();
    header("Location: ../index.html");
    exit();
}

/**
 * Função para redirecionar com mensagem
 */
function redirecionar($url, $mensagem = '', $tipo = 'success') {
    $_SESSION['mensagem'] = $mensagem;
    $_SESSION['tipo_mensagem'] = $tipo;
    header("Location: " . $url);
    exit();
}

/**
 * Função para validar email
 */
function validar_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

/**
 * Função para gerar hash de senha (bcrypt)
 */
function hash_senha($senha) {
    return password_hash($senha, PASSWORD_BCRYPT);
}

/**
 * Função para verificar senha
 */
function verificar_senha($senha, $hash) {
    return password_verify($senha, $hash);
}

// ============================================
// FIM DO ARQUIVO
// ============================================
?>