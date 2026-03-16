<?php
require_once 'php/config.php';
verificar_login();

$id_usuario = $_SESSION['usuario_id'];

// Buscar dados atuais do usuário
$sql = "SELECT * FROM usuario WHERE id_usuario = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_usuario);
$stmt->execute();
$result = $stmt->get_result();
$usuario = $result->fetch_assoc();
$stmt->close();

// Buscar instrumentos atuais
$sql_inst = "SELECT i.id_instrumento, i.nome_instrumento, ui.principal
FROM usuario_instrumento ui
INNER JOIN instrumento i ON ui.id_instrumento = i.id_instrumento
WHERE ui.id_usuario = ?";
$stmt_inst = $conn->prepare($sql_inst);
$stmt_inst->bind_param("i", $id_usuario);
$stmt_inst->execute();
$result_inst = $stmt_inst->get_result();
$instrumentos_usuario = [];
while ($row = $result_inst->fetch_assoc()) {
    $instrumentos_usuario[] = $row['id_instrumento'];
}
$stmt_inst->close();

// Buscar todos instrumentos disponíveis
$sql_all_inst = "SELECT * FROM instrumento ORDER BY nome_instrumento";
$result_all_inst = $conn->query($sql_all_inst);
$todos_instrumentos = [];
while ($row = $result_all_inst->fetch_assoc()) {
    $todos_instrumentos[] = $row;
}

// Buscar gêneros atuais
$sql_gen = "SELECT g.id_genero
FROM usuario_genero ug
INNER JOIN genero g ON ug.id_genero = g.id_genero
WHERE ug.id_usuario = ?";
$stmt_gen = $conn->prepare($sql_gen);
$stmt_gen->bind_param("i", $id_usuario);
$stmt_gen->execute();
$result_gen = $stmt_gen->get_result();
$generos_usuario = [];
while ($row = $result_gen->fetch_assoc()) {
    $generos_usuario[] = $row['id_genero'];
}
$stmt_gen->close();

// Buscar todos gêneros disponíveis
$sql_all_gen = "SELECT * FROM genero ORDER BY nome_genero";
$result_all_gen = $conn->query($sql_all_gen);
$todos_generos = [];
while ($row = $result_all_gen->fetch_assoc()) {
    $todos_generos[] = $row;
}

// Buscar disponibilidade atual
$sql_disp = "SELECT d.id_disponibilidade
FROM usuario_disponibilidade ud
INNER JOIN disponibilidade d ON ud.id_disponibilidade = d.id_disponibilidade
WHERE ud.id_usuario = ?";
$stmt_disp = $conn->prepare($sql_disp);
$stmt_disp->bind_param("i", $id_usuario);
$stmt_disp->execute();
$result_disp = $stmt_disp->get_result();
$disponibilidade_usuario = [];
while ($row = $result_disp->fetch_assoc()) {
    $disponibilidade_usuario[] = $row['id_disponibilidade'];
}
$stmt_disp->close();

// Buscar todas disponibilidades
$sql_all_disp = "SELECT * FROM disponibilidade ORDER BY id_disponibilidade";
$result_all_disp = $conn->query($sql_all_disp);
$todas_disponibilidades = [];
while ($row = $result_all_disp->fetch_assoc()) {
    $todas_disponibilidades[] = $row;
}

$conn->close();

$nome_exibir = !empty($usuario['nome_artistico']) ? $usuario['nome_artistico'] : $usuario['nome_completo'];
$iniciais = strtoupper(substr($nome_exibir, 0, 2));
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editar Perfil - Backstage Cena</title>
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
            transform: translateY(-2px);
        }
        
        /* CONTAINER */
        .container {
            position: relative;
            z-index: 1;
            max-width: 900px;
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
        
        /* FOTO DE PERFIL */
        .photo-section {
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 40px;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            margin-bottom: 30px;
            text-align: center;
        }
        
        .photo-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }
        
        .current-photo {
            width: 150px;
            height: 150px;
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
        
        .photo-upload {
            display: flex;
            flex-direction: column;
            gap: 15px;
            align-items: center;
        }
        
        .file-input-wrapper {
            position: relative;
            overflow: hidden;
            display: inline-block;
        }
        
        .file-input-wrapper input[type=file] {
            position: absolute;
            left: -9999px;
        }
        
        .btn-upload {
            padding: 12px 30px;
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 10px;
        }
        
        .btn-upload:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
        }
        
        .file-name {
            color: #9ca3af;
            font-size: 0.9rem;
        }
        
        /* FORMULÁRIO */
        .form-section {
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 30px;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            margin-bottom: 30px;
        }
        
        .section-title {
            font-family: 'Poppins', sans-serif;
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 25px;
            color: #8b5cf6;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        label {
            display: block;
            color: #d1d5db;
            font-weight: 500;
            margin-bottom: 10px;
            font-size: 0.95rem;
        }
        
        input[type="text"],
        input[type="email"],
        input[type="tel"],
        input[type="number"],
        textarea,
        select {
            width: 100%;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 10px;
            color: white;
            font-family: 'Inter', sans-serif;
            font-size: 0.95rem;
            transition: all 0.3s;
        }
        
        input:focus,
        textarea:focus,
        select:focus {
            outline: none;
            border-color: #8b5cf6;
            background: rgba(139, 92, 246, 0.1);
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
        }
        
        textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        /* CHECKBOXES */
        .checkbox-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 12px;
        }
        
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .checkbox-item:hover {
            background: rgba(139, 92, 246, 0.2);
            border-color: #8b5cf6;
        }
        
        .checkbox-item input[type="checkbox"] {
            width: 20px;
            height: 20px;
            cursor: pointer;
            accent-color: #8b5cf6;
        }
        
        .checkbox-item.checked {
            background: rgba(139, 92, 246, 0.3);
            border-color: #8b5cf6;
        }
        
        /* BOTÕES */
        .form-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 40px;
        }
        
        .btn-save {
            padding: 14px 40px;
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
        }
        
        .btn-save:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(139, 92, 246, 0.6);
        }
        
        .btn-cancel {
            padding: 14px 40px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
        }
        
        .btn-cancel:hover {
            background: rgba(255, 255, 255, 0.15);
        }
        
        /* ALERTAS */
        .alert {
            padding: 15px 20px;
            border-radius: 10px;
            margin-bottom: 25px;
            display: none;
        }
        
        .alert-success {
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid rgba(34, 197, 94, 0.4);
            color: #86efac;
        }
        
        .alert-error {
            background: rgba(220, 38, 38, 0.2);
            border: 1px solid rgba(220, 38, 38, 0.4);
            color: #fca5a5;
        }
        
        /* RESPONSIVO */
        @media (max-width: 768px) {
            .checkbox-grid {
                grid-template-columns: 1fr;
            }
            
            .form-actions {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <!-- HEADER -->
    <header class="header">
        <a href="index.html"><img src="imagens/logo.png" alt="Backstage Logo" class="logo-img"></a>
        <a href="perfil.php" class="btn-back">
            <i class="fas fa-arrow-left"></i>
            Voltar ao Perfil
        </a>
    </header>
    
    <div class="container">
        <h1 class="page-title">Editar Perfil</h1>
        <p class="page-subtitle">Atualize suas informações e mantenha seu perfil sempre atualizado</p>
        
        <!-- ALERTAS -->
        <div class="alert alert-success" id="alert-success"></div>
        <div class="alert alert-error" id="alert-error"></div>
        
        <!-- FORMULÁRIO -->
        <form action="php/editar_perfil_process.php" method="POST" enctype="multipart/form-data" id="edit-form">
            
            <!-- FOTO DE PERFIL -->
            <div class="photo-section">
                <h2 class="section-title">
                    <i class="fas fa-camera"></i>
                    Foto de Perfil
                </h2>
                <div class="photo-container">
                    <div class="current-photo" id="preview-avatar">
                        <?php echo $iniciais; ?>
                    </div>
                    <div class="photo-upload">
                        <div class="file-input-wrapper">
                            <label for="foto_perfil" class="btn-upload">
                                <i class="fas fa-upload"></i>
                                Escolher Foto
                            </label>
                            <input type="file" id="foto_perfil" name="foto_perfil" accept="image/*">
                        </div>
                        <span class="file-name" id="file-name">Nenhum arquivo selecionado</span>
                        <p style="color: #6b7280; font-size: 0.85rem;">JPG, PNG ou GIF. Máximo 5MB.</p>
                    </div>
                </div>
            </div>
            
            <!-- INFORMAÇÕES BÁSICAS -->
            <div class="form-section">
                <h2 class="section-title">
                    <i class="fas fa-user"></i>
                    Informações Básicas
                </h2>
                
                <div class="form-group">
                    <label for="nome_artistico">Nome Artístico</label>
                    <input type="text" id="nome_artistico" name="nome_artistico" 
                           value="<?php echo htmlspecialchars($usuario['nome_artistico']); ?>"
                           placeholder="Seu nome artístico">
                </div>
                
                <div class="form-group">
                    <label for="biografia">Biografia / Descrição</label>
                    <textarea id="biografia" name="biografia" 
                              placeholder="Conte um pouco sobre você, sua experiência musical, projetos..."><?php echo htmlspecialchars($usuario['biografia']); ?></textarea>
                </div>
                
                <div class="form-group">
                    <label for="telefone">Telefone</label>
                    <input type="tel" id="telefone" name="telefone" 
                           value="<?php echo htmlspecialchars($usuario['telefone']); ?>"
                           placeholder="(00) 00000-0000">
                </div>
                
                <div class="form-group">
                    <label for="bairro">Bairro</label>
                    <input type="text" id="bairro" name="bairro" 
                           value="<?php echo htmlspecialchars($usuario['bairro']); ?>"
                           placeholder="Seu bairro">
                </div>
                
                <div class="form-group">
                    <label for="anos_experiencia">Anos de Experiência</label>
                    <input type="number" id="anos_experiencia" name="anos_experiencia" 
                           value="<?php echo $usuario['anos_experiencia']; ?>"
                           min="0" max="100">
                </div>
            </div>
            
            <!-- INSTRUMENTOS -->
            <div class="form-section">
                <h2 class="section-title">
                    <i class="fas fa-guitar"></i>
                    Instrumentos / Talentos
                </h2>
                <div class="checkbox-grid">
                    <?php foreach ($todos_instrumentos as $inst): ?>
                    <label class="checkbox-item <?php echo in_array($inst['id_instrumento'], $instrumentos_usuario) ? 'checked' : ''; ?>">
                        <input type="checkbox" name="instrumentos[]" 
                               value="<?php echo $inst['id_instrumento']; ?>"
                               <?php echo in_array($inst['id_instrumento'], $instrumentos_usuario) ? 'checked' : ''; ?>>
                        <span><?php echo htmlspecialchars($inst['nome_instrumento']); ?></span>
                    </label>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <!-- GÊNEROS -->
            <div class="form-section">
                <h2 class="section-title">
                    <i class="fas fa-music"></i>
                    Gêneros Musicais
                </h2>
                <div class="checkbox-grid">
                    <?php foreach ($todos_generos as $gen): ?>
                    <label class="checkbox-item <?php echo in_array($gen['id_genero'], $generos_usuario) ? 'checked' : ''; ?>">
                        <input type="checkbox" name="generos[]" 
                               value="<?php echo $gen['id_genero']; ?>"
                               <?php echo in_array($gen['id_genero'], $generos_usuario) ? 'checked' : ''; ?>>
                        <span><?php echo htmlspecialchars($gen['nome_genero']); ?></span>
                    </label>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <!-- DISPONIBILIDADE -->
            <div class="form-section">
                <h2 class="section-title">
                    <i class="fas fa-calendar-check"></i>
                    Disponibilidade
                </h2>
                <div class="checkbox-grid">
                    <?php foreach ($todas_disponibilidades as $disp): ?>
                    <label class="checkbox-item <?php echo in_array($disp['id_disponibilidade'], $disponibilidade_usuario) ? 'checked' : ''; ?>">
                        <input type="checkbox" name="disponibilidade[]" 
                               value="<?php echo $disp['id_disponibilidade']; ?>"
                               <?php echo in_array($disp['id_disponibilidade'], $disponibilidade_usuario) ? 'checked' : ''; ?>>
                        <span><?php echo htmlspecialchars($disp['periodo']); ?></span>
                    </label>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <!-- BOTÕES -->
            <div class="form-actions">
                <button type="submit" class="btn-save">
                    <i class="fas fa-save"></i>
                    Salvar Alterações
                </button>
                <a href="perfil.php" class="btn-cancel">Cancelar</a>
            </div>
        </form>
    </div>
    
    <script>
        // Preview de foto
        document.getElementById('foto_perfil').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('file-name').textContent = file.name;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('preview-avatar');
                    preview.style.backgroundImage = `url(${e.target.result})`;
                    preview.style.backgroundSize = 'cover';
                    preview.style.backgroundPosition = 'center';
                    preview.textContent = '';
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Atualizar visual dos checkboxes
        document.querySelectorAll('.checkbox-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    this.closest('.checkbox-item').classList.add('checked');
                } else {
                    this.closest('.checkbox-item').classList.remove('checked');
                }
            });
        });
        
        // Verificar mensagens na URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('sucesso') === '1') {
            const alert = document.getElementById('alert-success');
            alert.textContent = '✅ Perfil atualizado com sucesso!';
            alert.style.display = 'block';
            window.scrollTo(0, 0);
        }
        if (urlParams.get('erro') === '1') {
            const alert = document.getElementById('alert-error');
            alert.textContent = '❌ Erro ao atualizar perfil. Tente novamente.';
            alert.style.display = 'block';
            window.scrollTo(0, 0);
        }
    </script>
</body>
</html>
