<?php
// Incluir configuração e verificar login
require_once 'php/config.php';
verificar_login();

// Pegar ID do usuário logado
$id_usuario = $_SESSION['usuario_id'];

// Buscar dados do usuário
$sql = "SELECT * FROM usuario WHERE id_usuario = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_usuario);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    die("Usuário não encontrado!");
}

$usuario = $result->fetch_assoc();
$stmt->close();

// Buscar instrumentos
$sql_inst = "SELECT i.nome_instrumento, ui.principal
FROM usuario_instrumento ui
INNER JOIN instrumento i ON ui.id_instrumento = i.id_instrumento
WHERE ui.id_usuario = ?
ORDER BY ui.principal DESC";

$stmt_inst = $conn->prepare($sql_inst);
$stmt_inst->bind_param("i", $id_usuario);
$stmt_inst->execute();
$result_inst = $stmt_inst->get_result();

$instrumentos = [];
while ($row = $result_inst->fetch_assoc()) {
    $instrumentos[] = $row;
}
$stmt_inst->close();

// Buscar gêneros
$sql_gen = "SELECT g.nome_genero
FROM usuario_genero ug
INNER JOIN genero g ON ug.id_genero = g.id_genero
WHERE ug.id_usuario = ?
ORDER BY ug.preferencia DESC";

$stmt_gen = $conn->prepare($sql_gen);
$stmt_gen->bind_param("i", $id_usuario);
$stmt_gen->execute();
$result_gen = $stmt_gen->get_result();

$generos = [];
while ($row = $result_gen->fetch_assoc()) {
    $generos[] = $row['nome_genero'];
}
$stmt_gen->close();

// Buscar disponibilidade
$sql_disp = "SELECT d.periodo
FROM usuario_disponibilidade ud
INNER JOIN disponibilidade d ON ud.id_disponibilidade = d.id_disponibilidade
WHERE ud.id_usuario = ?";

$stmt_disp = $conn->prepare($sql_disp);
$stmt_disp->bind_param("i", $id_usuario);
$stmt_disp->execute();
$result_disp = $stmt_disp->get_result();

$disponibilidade = [];
while ($row = $result_disp->fetch_assoc()) {
    $disponibilidade[] = $row['periodo'];
}
$stmt_disp->close();

$conn->close();

// Nome a exibir: priorizar nome artístico
$nome_exibir = !empty($usuario['nome_artistico']) ? $usuario['nome_artistico'] : $usuario['nome_completo'];

// Iniciais para avatar
$iniciais = strtoupper(substr($nome_exibir, 0, 2));
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Backstage | Meu Perfil</title>
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
        
        /* HEADER */
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
            width: auto;
        }
        
        .header-actions {
            display: flex;
            gap: 20px;
            align-items: center;
        }
        
        .btn-explore {
            padding: 10px 24px;
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            border: none;
            border-radius: 25px;
            color: white;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }
        
        .btn-explore:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
        }
        
        /* DROPDOWN DO PERFIL */
        .profile-dropdown {
            position: relative;
        }
        
        .profile-trigger {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            border: 2px solid rgba(139, 92, 246, 0.5);
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }
        
        .profile-trigger:hover {
            transform: scale(1.05);
            border-color: #8b5cf6;
        }
        
        .dropdown-menu {
            position: absolute;
            top: 60px;
            right: 0;
            background: rgba(26, 11, 46, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 15px;
            padding: 10px;
            min-width: 200px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s;
        }
        
        .profile-dropdown.active .dropdown-menu {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }
        
        .dropdown-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            color: #d1d5db;
            text-decoration: none;
            border-radius: 10px;
            transition: all 0.3s;
            font-size: 14px;
        }
        
        .dropdown-item:hover {
            background: rgba(139, 92, 246, 0.2);
            color: #a78bfa;
        }
        
        .dropdown-item i {
            width: 20px;
            text-align: center;
            color: #8b5cf6;
        }
        
        .dropdown-divider {
            height: 1px;
            background: rgba(139, 92, 246, 0.2);
            margin: 8px 0;
        }
        
        /* CONTAINER PRINCIPAL */
        .container {
            position: relative;
            z-index: 1;
            max-width: 1000px;
            margin: 50px auto;
            padding: 0 30px;
        }
        
        .profile-layout {
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: 35px;
            align-items: start;
        }
        
        /* CARD DE PERFIL (ESQUERDA - EMPILHADO) */
        .profile-card {
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 25px;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            align-items: stretch;
            position: sticky;
            top: 30px;
        }
        
        .avatar-container {
            position: relative;
            margin-bottom: 20px;
            align-self: center;
        }
        
        .avatar {
            width: 160px;
            height: 160px;
            border-radius: 50%;
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            font-weight: 700;
            border: 4px solid rgba(139, 92, 246, 0.5);
            box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4);
        }
        
        .edit-btn {
            position: absolute;
            bottom: 5px;
            right: 5px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #8b5cf6;
            border: 3px solid rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.5);
            text-decoration: none;
            color: white;
        }
        
        .edit-btn:hover {
            transform: scale(1.1);
            background: #a78bfa;
        }
        
        .user-name {
            font-family: 'Poppins', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 15px;
            color: #ffffff;
            text-align: center;
        }
        
        .user-details {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .detail-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: rgba(139, 92, 246, 0.1);
            border-radius: 10px;
            border: 1px solid rgba(139, 92, 246, 0.2);
            text-align: left;
        }
        
        .detail-row i {
            color: #8b5cf6;
            font-size: 1rem;
            min-width: 20px;
        }
        
        .detail-text {
            color: #d1d5db;
            font-size: 0.9rem;
            word-break: break-word;
        }
        
        .area-badge {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(109, 40, 217, 0.2));
            border: 1px solid #8b5cf6;
            border-radius: 10px;
            color: #a78bfa;
            font-size: 0.9rem;
            font-weight: 600;
            margin-top: 15px;
            text-align: center;
        }
        
        .disponibilidade-section {
            width: 100%;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(139, 92, 246, 0.2);
        }
        
        .disponibilidade-title {
            font-size: 0.85rem;
            color: #8b5cf6;
            font-weight: 600;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .disponibilidade-tags {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .disp-tag {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 8px;
            color: #d1d5db;
            font-size: 0.85rem;
        }
        
        .disp-tag i {
            color: #8b5cf6;
            width: 20px;
            text-align: center;
        }
        
        /* RODAPÉ */
        footer {
            position: relative;
            z-index: 10;
            margin-top: 80px;
            padding: 40px 0;
            background: rgba(0, 0, 0, 0.8);
            border-top: 1px solid rgba(139, 92, 246, 0.3);
        }
        
        .footer-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 30px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }
        
        .footer-logo {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .footer-logo-img {
            height: 40px;
            opacity: 0.8;
        }
        
        .footer-text {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.9rem;
            text-align: center;
        }
        
        .footer-links {
            display: flex;
            gap: 25px;
        }
        
        .footer-link {
            color: rgba(255, 255, 255, 0.5);
            text-decoration: none;
            font-size: 0.85rem;
            transition: all 0.3s;
        }
        
        .footer-link:hover {
            color: #8b5cf6;
        }
        
        /* CARDS DE CONTEÚDO (DIREITA) */
        .content-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }
        
        /* Descrição ocupa 2 colunas */
        .card-description-full {
            grid-column: 1 / -1;
        }
        
        /* Disponibilidade ocupa 2 colunas */
        .card-disponibilidade-full {
            grid-column: 1 / -1;
        }
        
        .content-card {
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 30px;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            transition: all 0.3s;
        }
        
        .content-card:hover {
            border-color: rgba(139, 92, 246, 0.5);
            transform: translateY(-3px);
            box-shadow: 0 15px 50px rgba(139, 92, 246, 0.3);
        }
        
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(139, 92, 246, 0.2);
        }
        
        .card-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .btn-edit-card {
            padding: 6px 14px;
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 8px;
            color: #a78bfa;
            text-decoration: none;
            font-size: 0.8rem;
            font-weight: 500;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .btn-edit-card:hover {
            background: rgba(139, 92, 246, 0.3);
            transform: translateY(-1px);
        }
        
        .card-icon {
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(139, 92, 246, 0.2);
            border-radius: 10px;
            color: #8b5cf6;
            font-size: 1.1rem;
        }
        
        .card-title {
            font-family: 'Poppins', sans-serif;
            font-size: 1.2rem;
            font-weight: 600;
            color: #ffffff;
        }
        
        .card-content {
            color: #d1d5db;
            line-height: 1.7;
            font-size: 0.95rem;
        }
        
        .empty-state {
            color: #6b7280;
            font-style: italic;
            text-align: center;
            padding: 20px;
        }
        
        /* TAGS */
        .tags-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }
        
        .tag {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            color: #a78bfa;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.3s;
        }
        
        .tag:hover {
            background: rgba(139, 92, 246, 0.25);
            border-color: #8b5cf6;
            transform: translateY(-2px);
        }
        
        /* RESPONSIVO */
        @media (max-width: 968px) {
            .profile-layout {
                grid-template-columns: 1fr;
            }
            
            .content-section {
                grid-template-columns: 1fr;
            }
            
            .profile-card {
                position: static;
            }
            
            .header {
                padding: 15px 20px;
            }
            
            .logo {
                font-size: 1.4rem;
            }
        }
    </style>
</head>
<body>
    <!-- HEADER -->
    <header class="header">
        <a href="index.html"><img src="imagens/logo.png" alt="Backstage Logo" class="logo-img"> </a>
        <div class="header-actions">
            <a href="perfil_usuario.php" class="btn-explore">
                <i class="fas fa-users"></i>
                Explorar Músicos
            </a>
            
            <!-- DROPDOWN DO PERFIL -->
            <div class="profile-dropdown" id="profileDropdown">
                <div class="profile-trigger" onclick="toggleDropdown()" style="<?php if (!empty($usuario['foto_perfil'])): ?>background-image: url('<?php echo htmlspecialchars($usuario['foto_perfil']); ?>'); background-size: cover; background-position: center;<?php endif; ?>">
                    <?php if (empty($usuario['foto_perfil'])): ?>
                    <?php echo $iniciais; ?>
                    <?php endif; ?>
                </div>
                <div class="dropdown-menu">
                    <a href="editar_perfil.php" class="dropdown-item">
                        <i class="fas fa-user-edit"></i>
                        <span>Editar Perfil</span>
                    </a>
                    <a href="configuracoes.php" class="dropdown-item">
                        <i class="fas fa-cog"></i>
                        <span>Configurações</span>
                    </a>
                    <div class="dropdown-divider"></div>
                    <a href="php/logout.php" class="dropdown-item">
                        <i class="fas fa-right-from-bracket"></i>
                        <span>Sair</span>
                    </a>
                </div>
            </div>
        </div>
    </header>
    
    <!-- CONTAINER PRINCIPAL -->
    <div class="container">
        <div class="profile-layout">
            <!-- CARD DE PERFIL (ESQUERDA - EMPILHADO) -->
            <div class="profile-card">
                <div class="avatar-container">
                    <div class="avatar" style="<?php if (!empty($usuario['foto_perfil'])): ?>background-image: url('<?php echo htmlspecialchars($usuario['foto_perfil']); ?>'); background-size: cover; background-position: center;<?php endif; ?>">
                        <?php if (empty($usuario['foto_perfil'])): ?>
                        <?php echo $iniciais; ?>
                        <?php endif; ?>
                    </div>
                    <a href="editar_perfil.php" class="edit-btn">
                        <i class="fas fa-pen"></i>
                    </a>
                </div>
                
                <h1 class="user-name"><?php echo htmlspecialchars($nome_exibir); ?></h1>
                
                <div class="user-details">
                    <div class="detail-row">
                        <i class="fas fa-envelope"></i>
                        <span class="detail-text"><?php echo htmlspecialchars($usuario['email']); ?></span>
                    </div>
                    
                    <div class="detail-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span class="detail-text"><?php echo htmlspecialchars($usuario['cidade'] . ', ' . $usuario['estado']); ?></span>
                    </div>
                    
                    <?php if (!empty($usuario['telefone'])): ?>
                    <div class="detail-row">
                        <i class="fas fa-phone"></i>
                        <span class="detail-text"><?php echo htmlspecialchars($usuario['telefone']); ?></span>
                    </div>
                    <?php endif; ?>
                    
                    <?php if (!empty($usuario['bairro'])): ?>
                    <div class="detail-row">
                        <i class="fas fa-location-dot"></i>
                        <span class="detail-text"><?php echo htmlspecialchars($usuario['bairro']); ?></span>
                    </div>
                    <?php endif; ?>
                    
                    <?php if (!empty($usuario['anos_experiencia'])): ?>
                    <div class="detail-row">
                        <i class="fas fa-clock"></i>
                        <span class="detail-text"><?php echo $usuario['anos_experiencia']; ?> anos de experiência</span>
                    </div>
                    <?php endif; ?>
                </div>
                
                <?php if (!empty($usuario['area_atuacao'])): ?>
                <div class="area-badge">
                    <?php echo htmlspecialchars($usuario['area_atuacao']); ?>
                </div>
                <?php endif; ?>
                
                <!-- DISPONIBILIDADE NO CARD DE PERFIL -->
                <?php if (!empty($disponibilidade)): ?>
                <div class="disponibilidade-section">
                    <div class="disponibilidade-title">Disponibilidade</div>
                    <div class="disponibilidade-tags">
                        <?php foreach ($disponibilidade as $disp): ?>
                        <div class="disp-tag">
                            <?php 
                            if ($disp === 'Manhã') echo '<i class="fas fa-sun"></i>';
                            elseif ($disp === 'Tarde') echo '<i class="fas fa-cloud-sun"></i>';
                            elseif ($disp === 'Noite') echo '<i class="fas fa-moon"></i>';
                            ?>
                            <span><?php echo htmlspecialchars($disp); ?></span>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endif; ?>
            </div>
            
            <!-- CONTEÚDO (DIREITA) -->
            <div class="content-section">
                <!-- DESCRIÇÃO (OCUPA 2 COLUNAS) -->
                <div class="content-card card-description-full">
                    <div class="card-header">
                        <div class="card-header-left">
                            <div class="card-icon">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <h2 class="card-title">Descrição</h2>
                        </div>
                        <a href="editar_perfil.php" class="btn-edit-card">
                            <i class="fas fa-pen"></i>
                            Editar
                        </a>
                    </div>
                    <?php if (!empty($usuario['biografia'])): ?>
                        <p class="card-content"><?php echo nl2br(htmlspecialchars($usuario['biografia'])); ?></p>
                    <?php else: ?>
                        <p class="empty-state">Nenhuma descrição adicionada. Clique em "Editar" para adicionar!</p>
                    <?php endif; ?>
                </div>
                
                <!-- TALENTOS (COLUNA 1) -->
                <div class="content-card">
                    <div class="card-header">
                        <div class="card-header-left">
                            <div class="card-icon">
                                <i class="fas fa-guitar"></i>
                            </div>
                            <h2 class="card-title">Talentos</h2>
                        </div>
                    </div>
                    <?php if (!empty($instrumentos)): ?>
                        <div class="tags-grid">
                            <?php foreach ($instrumentos as $inst): ?>
                            <div class="tag">
                                <i class="fas fa-music"></i>
                                <span><?php echo htmlspecialchars($inst['nome_instrumento']); ?></span>
                                <?php if ($inst['principal']): ?>
                                <i class="fas fa-star"></i>
                                <?php endif; ?>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    <?php else: ?>
                        <p class="empty-state">Nenhum talento cadastrado</p>
                    <?php endif; ?>
                </div>
                
                <!-- GÊNEROS FAVORITOS (COLUNA 2) -->
                <div class="content-card">
                    <div class="card-header">
                        <div class="card-header-left">
                            <div class="card-icon">
                                <i class="fas fa-compact-disc"></i>
                            </div>
                            <h2 class="card-title">Gêneros Favoritos</h2>
                        </div>
                    </div>
                    <?php if (!empty($generos)): ?>
                        <div class="tags-grid">
                            <?php foreach ($generos as $gen): ?>
                            <div class="tag">
                                <i class="fas fa-music"></i>
                                <span><?php echo htmlspecialchars($gen); ?></span>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    <?php else: ?>
                        <p class="empty-state">Nenhum gênero cadastrado</p>
                    <?php endif; ?>
                </div>
                
                <!-- REMOVER CARD DE DISPONIBILIDADE DAQUI -->
            </div>
        </div>
    </div>
    
    <!-- RODAPÉ -->
    <footer>
        <div class="footer-content">
            <div class="footer-logo">
                <img src="imagens/logo.png" alt="Backstage Logo" class="footer-logo-img">
            </div>
            <p class="footer-text">A cena musical independente começa aqui. &copy; 2025 Backstage Cena</p>
            <div class="footer-links">
                <a href="#" class="footer-link">Sobre</a>
                <a href="#" class="footer-link">Termos</a>
                <a href="#" class="footer-link">Privacidade</a>
                <a href="#" class="footer-link">Contato</a>
            </div>
        </div>
    </footer>
    
    <script>
        // Toggle dropdown
        function toggleDropdown() {
            const dropdown = document.getElementById('profileDropdown');
            dropdown.classList.toggle('active');
        }
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('profileDropdown');
            if (!dropdown.contains(event.target)) {
                dropdown.classList.remove('active');
            }
        });
    </script>
</body>
</html>