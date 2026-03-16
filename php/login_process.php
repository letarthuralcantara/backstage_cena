<?php
/**
 * BACKSTAGE CENA - Processar Login
 */

require_once 'config.php';

// Definir base URL dinamicamente
$base_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
$base_path = str_replace('/php', '', dirname($_SERVER['SCRIPT_NAME']));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: $base_url$base_path/login.html");
    exit();
}

$email = limpar_entrada($_POST['email']);
$senha = $_POST['senha'];
$lembrar = isset($_POST['lembrar']) ? true : false;

$erros = [];

if (empty($email)) {
    $erros[] = "O email é obrigatório.";
} elseif (!validar_email($email)) {
    $erros[] = "Email inválido.";
}

if (empty($senha)) {
    $erros[] = "A senha é obrigatória.";
} elseif (strlen($senha) < 6) {
    $erros[] = "A senha deve ter pelo menos 6 caracteres.";
}

if (!empty($erros)) {
    $_SESSION['erro_login'] = implode("<br>", $erros);
    header("Location: $base_url$base_path/login.html?erro=1");
    exit();
}

try {
    $sql = "SELECT id_usuario, nome_completo, nome_artistico, email, senha, ativo, email_verificado, foto_perfil 
            FROM usuario 
            WHERE email = ? 
            LIMIT 1";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $_SESSION['erro_login'] = "Email ou senha incorretos.";
        header("Location: $base_url$base_path/login.html?erro=1");
        exit();
    }
    
    $usuario = $result->fetch_assoc();
    
    if (!verificar_senha($senha, $usuario['senha'])) {
        $_SESSION['erro_login'] = "Email ou senha incorretos.";
        header("Location: $base_url$base_path/login.html?erro=1");
        exit();
    }
    
    if ($usuario['ativo'] == 0) {
        $_SESSION['erro_login'] = "Sua conta está desativada. Entre em contato com o suporte.";
        header("Location: $base_url$base_path/login.html?erro=1");
        exit();
    }
    
    session_regenerate_id(true);
    
    $_SESSION['usuario_id'] = $usuario['id_usuario'];
    $_SESSION['usuario_nome'] = $usuario['nome_completo'];
    $_SESSION['usuario_nome_artistico'] = $usuario['nome_artistico'];
    $_SESSION['usuario_email'] = $usuario['email'];
    $_SESSION['usuario_foto'] = $usuario['foto_perfil'];
    $_SESSION['logado'] = true;
    $_SESSION['login_timestamp'] = time();
    
    $sql_update = "UPDATE usuario SET ultimo_acesso = NOW() WHERE id_usuario = ?";
    $stmt_update = $conn->prepare($sql_update);
    $stmt_update->bind_param("i", $usuario['id_usuario']);
    $stmt_update->execute();
    
    if ($lembrar) {
        $cookie_value = base64_encode($usuario['id_usuario'] . ':' . $usuario['email']);
        setcookie('lembrar_backstage', $cookie_value, time() + (30 * 24 * 60 * 60), '/');
    }
    
    $_SESSION['sucesso_login'] = "Login realizado com sucesso! Bem-vindo(a), " . ($usuario['nome_artistico'] ?: $usuario['nome_completo']) . "!";
    header("Location: $base_url$base_path/perfil.php");
    exit();
    
} catch (Exception $e) {
    $_SESSION['erro_login'] = "Erro ao processar login. Tente novamente.";
    error_log("Erro no login: " . $e->getMessage());
    header("Location: $base_url$base_path/login.html?erro=1");
    exit();
}

$stmt->close();
$conn->close();
?>