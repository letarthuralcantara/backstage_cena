<?php
require_once 'php/config.php';
verificar_login();

$id_musico = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($id_musico === 0 || $id_musico === $_SESSION['usuario_id']) {
    header("Location: perfil.php");
    exit();
}

// Buscar dados do músico
$sql = "SELECT * FROM usuario WHERE id_usuario = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_musico);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    header("Location: perfil_usuario.php");
    exit();
}

$musico = $result->fetch_assoc();
$stmt->close();

// Buscar instrumentos
$sql_inst = "SELECT i.nome_instrumento, ui.principal
FROM usuario_instrumento ui
INNER JOIN instrumento i ON ui.id_instrumento = i.id_instrumento
WHERE ui.id_usuario = ?
ORDER BY ui.principal DESC";
$stmt_inst = $conn->prepare($sql_inst);
$stmt_inst->bind_param("i", $id_musico);
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
$stmt_gen->bind_param("i", $id_musico);
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
$stmt_disp->bind_param("i", $id_musico);
$stmt_disp->execute();
$result_disp = $stmt_disp->get_result();
$disponibilidade = [];
while ($row = $result_disp->fetch_assoc()) {
    $disponibilidade[] = $row['periodo'];
}
$stmt_disp->close();

$conn->close();

$nome_exibir = !empty($musico['nome_artistico']) ? $musico['nome_artistico'] : $musico['nome_completo'];
$iniciais = strtoupper(substr($nome_exibir, 0, 2));
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($nome_exibir); ?> - Backstage Cena</title>
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
            max-width: 1000px;
            margin: 50px auto;
            padding: 0 30px;
        }
        
        .profile-layout {
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: 35px;
        }
        
        .profile-card {
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 25px;
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            align-items: stretch;
            position: sticky;
            top: 30px;
            height: fit-content;
        }
        
        .avatar-container {
            align-self: center;
            margin-bottom: 20px;
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
        
        .user-name {
            font-family: 'Poppins', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .user-details {
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
        }
        
        .detail-row i {
            color: #8b5cf6;
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
        }
        
        .content-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }
        
        .card-description-full {
            grid-column: 1 / -1;
        }
        
        .content-card {
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 30px;
            backdrop-filter: blur(10px);
            transition: all 0.3s;
        }
        
        .content-card:hover {
            border-color: rgba(139, 92, 246, 0.5);
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
        }
        
        .card-content {
            color: #d1d5db;
            line-height: 1.7;
            font-size: 0.95rem;
        }
        
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
        }
        
        .empty-state {
            color: #6b7280;
            font-style: italic;
            text-align: center;
            padding: 20px;
        }
        
        .contact-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .contact-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(139, 92, 246, 0.6);
        }
        
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
        }
    </style>
</head>
<body>
    <header class="header">
        <a href="index.html"><img src="imagens/logo.png" alt="Backstage Logo" class="logo-img"></a>
        <a href="perfil_usuario.php" class="btn-back">
            <i class="fas fa-arrow-left"></i>
            Voltar à Lista
        </a>
    </header>
    
    <div class="container">
        <div class="profile-layout">
            <div class="profile-card">
                <div class="avatar-container">
                    <div class="avatar" style="<?php if (!empty($musico['foto_perfil'])): ?>background-image: url('<?php echo htmlspecialchars($musico['foto_perfil']); ?>'); background-size: cover; background-position: center;<?php endif; ?>">
                        <?php if (empty($musico['foto_perfil'])): ?>
                        <?php echo $iniciais; ?>
                        <?php endif; ?>
                    </div>
                </div>
                
                <h1 class="user-name"><?php echo htmlspecialchars($nome_exibir); ?></h1>
                
                <div class="user-details">
                    <div class="detail-row">
                        <i class="fas fa-envelope"></i>
                        <span class="detail-text"><?php echo htmlspecialchars($musico['email']); ?></span>
                    </div>
                    
                    <div class="detail-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span class="detail-text"><?php echo htmlspecialchars($musico['cidade'] . ', ' . $musico['estado']); ?></span>
                    </div>
                    
                    <?php if (!empty($musico['telefone'])): ?>
                    <div class="detail-row">
                        <i class="fas fa-phone"></i>
                        <span class="detail-text"><?php echo htmlspecialchars($musico['telefone']); ?></span>
                    </div>
                    <?php endif; ?>
                    
                    <?php if (!empty($musico['anos_experiencia'])): ?>
                    <div class="detail-row">
                        <i class="fas fa-clock"></i>
                        <span class="detail-text"><?php echo $musico['anos_experiencia']; ?> anos de experiência</span>
                    </div>
                    <?php endif; ?>
                </div>
                
                <?php if (!empty($musico['area_atuacao'])): ?>
                <div class="area-badge">
                    <?php echo htmlspecialchars($musico['area_atuacao']); ?>
                </div>
                <?php endif; ?>
                
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
                
                <button class="contact-btn" onclick="alert('Sistema de mensagens em breve!')">
                    <i class="fas fa-envelope"></i>
                    Enviar Mensagem
                </button>
            </div>
            
            <div class="content-section">
                <div class="content-card card-description-full">
                    <div class="card-header">
                        <div class="card-header-left">
                            <div class="card-icon">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <h2 class="card-title">Sobre</h2>
                        </div>
                    </div>
                    <?php if (!empty($musico['biografia'])): ?>
                        <p class="card-content"><?php echo nl2br(htmlspecialchars($musico['biografia'])); ?></p>
                    <?php else: ?>
                        <p class="empty-state">Este músico ainda não adicionou uma biografia</p>
                    <?php endif; ?>
                </div>
                
                <?php if (!empty($instrumentos)): ?>
                <div class="content-card">
                    <div class="card-header">
                        <div class="card-header-left">
                            <div class="card-icon">
                                <i class="fas fa-guitar"></i>
                            </div>
                            <h2 class="card-title">Talentos</h2>
                        </div>
                    </div>
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
                </div>
                <?php endif; ?>
                
                <?php if (!empty($generos)): ?>
                <div class="content-card">
                    <div class="card-header">
                        <div class="card-header-left">
                            <div class="card-icon">
                                <i class="fas fa-compact-disc"></i>
                            </div>
                            <h2 class="card-title">Gêneros</h2>
                        </div>
                    </div>
                    <div class="tags-grid">
                        <?php foreach ($generos as $gen): ?>
                        <div class="tag">
                            <i class="fas fa-music"></i>
                            <span><?php echo htmlspecialchars($gen); ?></span>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</body>
</html>
