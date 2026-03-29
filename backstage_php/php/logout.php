<?php
/**
 * BACKSTAGE CENA - Logout
 * 
 * Destrói a sessão e redireciona para a página inicial
 */

// Iniciar sessão
session_start();

// Destruir todas as variáveis de sessão
$_SESSION = array();

// Destruir o cookie de sessão
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time()-3600, '/');
}

// Destruir a sessão
session_destroy();

// Redirecionar para login com mensagem
header("Location: ../login.html?mensagem=logout");
exit();
?>
