<?php
require_once 'php/config.php';
verificar_login();

$usuario = $_SESSION['usuario_nome'];
$email = $_SESSION['usuario_email'];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configurações - Backstage Cena</title>
    <link rel="shortcut icon" href="imagens/favicon.ico" type="image/x-icon">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            min-height: 100vh;
            background-image: url('imagens/background.png');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            background-attachment: fixed;
            color: #ffffff;
            position: relative;
        }
        
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 0;
        }
        
        .header {
            position: relative;
            z-index: 100;
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(139, 92, 246, 0.3);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .logo-img {
            height: 50px;
        }
        
        .btn-back {
            padding: 10px 24px;
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid rgba(139, 92, 246, 0.4);
            border-radius: 25px;
            color: #a78bfa;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-back:hover {
            background: rgba(139, 92, 246, 0.3);
        }
        
        .container {
            position: relative;
            z-index: 1;
            max-width: 800px;
            margin: 40px auto;
            padding: 0 30px;
        }
        
        .page-title {
            font-family: 'Poppins', sans-serif;
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 10px;
            text-align: center;
        }
        
        .page-subtitle {
            text-align: center;
            color: #9ca3af;
            margin-bottom: 40px;
        }
        
        .config-section {
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 30px;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            margin-bottom: 25px;
        }
        
        .section-title {
            font-family: 'Poppins', sans-serif;
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #8b5cf6;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .config-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: rgba(139, 92, 246, 0.05);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 10px;
            margin-bottom: 15px;
            transition: all 0.3s;
        }
        
        .config-item:hover {
            background: rgba(139, 92, 246, 0.1);
            border-color: #8b5cf6;
        }
        
        .config-info {
            flex: 1;
        }
        
        .config-info h3 {
            font-size: 1.1rem;
            margin-bottom: 5px;
        }
        
        .config-info p {
            color: #9ca3af;
            font-size: 0.9rem;
        }
        
        .btn-config {
            padding: 10px 20px;
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-config:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
        }
        
        .btn-danger {
            background: linear-gradient(135deg, #dc2626, #991b1b);
        }
        
        .btn-danger:hover {
            box-shadow: 0 6px 20px rgba(220, 38, 38, 0.6);
        }
        
        .info-message {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 10px;
            padding: 15px 20px;
            color: #93c5fd;
            margin-top: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
    </style>
</head>
<body>
    <header class="header">
        <a href="index.html"><img src="imagens/logo.png" alt="Backstage Logo" class="logo-img"> </a>
        <a href="perfil.php" class="btn-back">
            <i class="fas fa-arrow-left"></i>
            Voltar ao Perfil
        </a>
    </header>
    
    <div class="container">
        <h1 class="page-title">Configurações</h1>
        <p class="page-subtitle">Gerencie sua conta e preferências</p>
        
        <!-- CONTA -->
        <div class="config-section">
            <h2 class="section-title">
                <i class="fas fa-user-cog"></i>
                Configurações da Conta
            </h2>
            
            <div class="config-item">
                <div class="config-info">
                    <h3>Alterar Senha</h3>
                    <p>Mantenha sua conta segura com uma senha forte</p>
                </div>
                <button class="btn-config" onclick="alert('Funcionalidade em desenvolvimento!')">
                    <i class="fas fa-key"></i> Alterar
                </button>
            </div>
            
            <div class="config-item">
                <div class="config-info">
                    <h3>Email</h3>
                    <p><?php echo htmlspecialchars($email); ?></p>
                </div>
                <button class="btn-config" onclick="alert('Funcionalidade em desenvolvimento!')">
                    <i class="fas fa-envelope"></i> Alterar
                </button>
            </div>
        </div>
        
        <!-- PRIVACIDADE -->
        <div class="config-section">
            <h2 class="section-title">
                <i class="fas fa-shield-alt"></i>
                Privacidade
            </h2>
            
            <div class="config-item">
                <div class="config-info">
                    <h3>Perfil Público</h3>
                    <p>Seu perfil está visível para outros músicos</p>
                </div>
                <button class="btn-config" onclick="alert('Funcionalidade em desenvolvimento!')">
                    <i class="fas fa-eye"></i> Gerenciar
                </button>
            </div>
        </div>
        
        <!-- NOTIFICAÇÕES -->
        <div class="config-section">
            <h2 class="section-title">
                <i class="fas fa-bell"></i>
                Notificações
            </h2>
            
            <div class="config-item">
                <div class="config-info">
                    <h3>Notificações por Email</h3>
                    <p>Receba atualizações sobre mensagens e atividades</p>
                </div>
                <button class="btn-config" onclick="alert('Funcionalidade em desenvolvimento!')">
                    <i class="fas fa-cog"></i> Configurar
                </button>
            </div>
        </div>
        
        <!-- ZONA DE PERIGO -->
        <div class="config-section">
            <h2 class="section-title" style="color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
                Zona de Perigo
            </h2>
            
            <div class="config-item">
                <div class="config-info">
                    <h3>Desativar Conta</h3>
                    <p>Desative temporariamente sua conta</p>
                </div>
                <button class="btn-config btn-danger" onclick="confirmarDesativacao()">
                    <i class="fas fa-ban"></i> Desativar
                </button>
            </div>
            
            <div class="config-item">
                <div class="config-info">
                    <h3>Excluir Conta</h3>
                    <p>Exclua permanentemente sua conta e todos os dados</p>
                </div>
                <button class="btn-config btn-danger" onclick="confirmarExclusao()">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
        
        <div class="info-message">
            <i class="fas fa-info-circle" style="font-size: 1.5rem;"></i>
            <div>
                <strong>Algumas funcionalidades estão em desenvolvimento.</strong><br>
                Em breve você poderá configurar ainda mais opções!
            </div>
        </div>
    </div>
    
    <script>
        function confirmarDesativacao() {
            if (confirm('Tem certeza que deseja desativar sua conta? Você poderá reativá-la fazendo login novamente.')) {
                alert('Funcionalidade em desenvolvimento!');
            }
        }
        
        function confirmarExclusao() {
            if (confirm('⚠️ ATENÇÃO! Esta ação é IRREVERSÍVEL!\n\nTem certeza que deseja excluir permanentemente sua conta e todos os seus dados?')) {
                if (confirm('Confirme novamente: Excluir PERMANENTEMENTE minha conta?')) {
                    alert('Funcionalidade em desenvolvimento!');
                }
            }
        }
    </script>
</body>
</html>
