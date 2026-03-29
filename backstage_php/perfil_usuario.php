<?php
require_once 'php/config.php';
verificar_login();

$usuario_logado_id = $_SESSION['usuario_id'];

// Parâmetros de busca e filtros
$busca = isset($_GET['busca']) ? limpar_entrada($_GET['busca']) : '';
$filtro_cidade = isset($_GET['cidade']) ? limpar_entrada($_GET['cidade']) : '';
$filtro_instrumento = isset($_GET['instrumento']) ? intval($_GET['instrumento']) : 0;
$filtro_genero = isset($_GET['genero']) ? intval($_GET['genero']) : 0;
$filtro_disponibilidade = isset($_GET['disponibilidade']) ? intval($_GET['disponibilidade']) : 0;
$filtro_area = isset($_GET['area']) ? limpar_entrada($_GET['area']) : '';

// Paginação
$pagina = isset($_GET['pagina']) ? intval($_GET['pagina']) : 1;
$por_pagina = 12;
$offset = ($pagina - 1) * $por_pagina;

// Construir query com filtros
$where = ["u.id_usuario != ?"];
$params = [$usuario_logado_id];
$types = "i";

if (!empty($busca)) {
    $where[] = "(u.nome_completo LIKE ? OR u.nome_artistico LIKE ?)";
    $busca_param = "%$busca%";
    $params[] = $busca_param;
    $params[] = $busca_param;
    $types .= "ss";
}

if (!empty($filtro_cidade)) {
    $where[] = "u.cidade LIKE ?";
    $params[] = "%$filtro_cidade%";
    $types .= "s";
}

$join_instrumento = "";
if ($filtro_instrumento > 0) {
    $join_instrumento = "INNER JOIN usuario_instrumento ui ON u.id_usuario = ui.id_usuario AND ui.id_instrumento = ?";
    $params[] = $filtro_instrumento;
    $types .= "i";
}

$join_genero = "";
if ($filtro_genero > 0) {
    $join_genero = "INNER JOIN usuario_genero ug ON u.id_usuario = ug.id_usuario AND ug.id_genero = ?";
    $params[] = $filtro_genero;
    $types .= "i";
}

$join_disponibilidade = "";
if ($filtro_disponibilidade > 0) {
    $join_disponibilidade = "INNER JOIN usuario_disponibilidade ud ON u.id_usuario = ud.id_usuario AND ud.id_disponibilidade = ?";
    $params[] = $filtro_disponibilidade;
    $types .= "i";
}

if (!empty($filtro_area)) {
    $where[] = "u.area_atuacao = ?";
    $params[] = $filtro_area;
    $types .= "s";
}

$where_clause = implode(" AND ", $where);

// Contar total de músicos
$sql_count = "SELECT COUNT(DISTINCT u.id_usuario) as total 
              FROM usuario u 
              $join_instrumento 
              $join_genero
              $join_disponibilidade
              WHERE $where_clause";
$stmt_count = $conn->prepare($sql_count);
$stmt_count->bind_param($types, ...$params);
$stmt_count->execute();
$total_musicos = $stmt_count->get_result()->fetch_assoc()['total'];
$stmt_count->close();

$total_paginas = ceil($total_musicos / $por_pagina);

// Buscar músicos
$sql = "SELECT DISTINCT u.id_usuario, u.nome_completo, u.nome_artistico, u.cidade, u.estado, 
               u.foto_perfil, u.area_atuacao, u.anos_experiencia, u.biografia
        FROM usuario u
        $join_instrumento
        $join_genero
        $join_disponibilidade
        WHERE $where_clause
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?";

$params[] = $por_pagina;
$params[] = $offset;
$types .= "ii";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$musicos = [];
while ($row = $result->fetch_assoc()) {
    // Buscar instrumentos do músico
    $sql_inst = "SELECT i.nome_instrumento 
                 FROM usuario_instrumento ui 
                 INNER JOIN instrumento i ON ui.id_instrumento = i.id_instrumento 
                 WHERE ui.id_usuario = ? 
                 ORDER BY ui.principal DESC 
                 LIMIT 3";
    $stmt_inst = $conn->prepare($sql_inst);
    $stmt_inst->bind_param("i", $row['id_usuario']);
    $stmt_inst->execute();
    $result_inst = $stmt_inst->get_result();
    
    $instrumentos = [];
    while ($inst = $result_inst->fetch_assoc()) {
        $instrumentos[] = $inst['nome_instrumento'];
    }
    $stmt_inst->close();
    
    // Buscar gêneros do músico
    $sql_gen = "SELECT g.nome_genero 
                FROM usuario_genero ug 
                INNER JOIN genero g ON ug.id_genero = g.id_genero 
                WHERE ug.id_usuario = ? 
                ORDER BY ug.preferencia DESC 
                LIMIT 3";
    $stmt_gen = $conn->prepare($sql_gen);
    $stmt_gen->bind_param("i", $row['id_usuario']);
    $stmt_gen->execute();
    $result_gen = $stmt_gen->get_result();
    
    $generos = [];
    while ($gen = $result_gen->fetch_assoc()) {
        $generos[] = $gen['nome_genero'];
    }
    $stmt_gen->close();
    
    $row['instrumentos'] = $instrumentos;
    $row['generos'] = $generos;
    $musicos[] = $row;
}
$stmt->close();

// Buscar cidades para filtro
$sql_cidades = "SELECT DISTINCT cidade FROM usuario WHERE cidade IS NOT NULL AND cidade != '' ORDER BY cidade";
$result_cidades = $conn->query($sql_cidades);
$cidades = [];
while ($row = $result_cidades->fetch_assoc()) {
    $cidades[] = $row['cidade'];
}

// Buscar instrumentos para filtro
$sql_instrumentos = "SELECT * FROM instrumento ORDER BY nome_instrumento";
$result_instrumentos = $conn->query($sql_instrumentos);
$instrumentos_filtro = [];
while ($row = $result_instrumentos->fetch_assoc()) {
    $instrumentos_filtro[] = $row;
}

// Buscar gêneros para filtro
$sql_generos = "SELECT * FROM genero ORDER BY nome_genero";
$result_generos = $conn->query($sql_generos);
$generos_filtro = [];
while ($row = $result_generos->fetch_assoc()) {
    $generos_filtro[] = $row;
}

// Buscar disponibilidades para filtro
$sql_disponibilidades = "SELECT * FROM disponibilidade ORDER BY id_disponibilidade";
$result_disponibilidades = $conn->query($sql_disponibilidades);
$disponibilidades_filtro = [];
while ($row = $result_disponibilidades->fetch_assoc()) {
    $disponibilidades_filtro[] = $row;
}

// Buscar áreas de atuação para filtro
$sql_areas = "SELECT DISTINCT area_atuacao FROM usuario WHERE area_atuacao IS NOT NULL AND area_atuacao != '' ORDER BY area_atuacao";
$result_areas = $conn->query($sql_areas);
$areas_filtro = [];
while ($row = $result_areas->fetch_assoc()) {
    $areas_filtro[] = $row['area_atuacao'];
}

$conn->close();

$nome_usuario = !empty($_SESSION['usuario_nome_artistico']) ? $_SESSION['usuario_nome_artistico'] : $_SESSION['usuario_nome'];
$iniciais = strtoupper(substr($nome_usuario, 0, 2));
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Explorar Músicos - Backstage Cena</title>
    <link rel="shortcut icon" href="imagens/favicon.ico" type="image/x-icon">
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Work Sans', sans-serif;
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
            background: rgba(0, 0, 0, 0.6);
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
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(15px);
            border-bottom: 2px solid rgba(139, 92, 246, 0.4);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.7);
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
        
        .btn-back {
            padding: 10px 24px;
            background: rgba(139, 92, 246, 0.15);
            border: 2px solid rgba(139, 92, 246, 0.5);
            border-radius: 10px;
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
            border-color: #8b5cf6;
            transform: translateY(-2px);
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
            border: 2px solid rgba(139, 92, 246, 0.5);
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .profile-trigger:hover {
            transform: scale(1.05);
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
        }
        
        /* CONTAINER */
        .container {
            position: relative;
            z-index: 1;
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 30px;
        }
        
        /* HERO SECTION */
        .hero {
            text-align: center;
            margin-bottom: 50px;
            animation: fadeInDown 0.8s ease-out;
        }
        
        @keyframes fadeInDown {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .hero-title {
            font-family: 'Space Mono', monospace;
            font-size: 3.5rem;
            font-weight: 700;
            margin-bottom: 15px;
            background: linear-gradient(135deg, #8b5cf6, #ec4899, #f59e0b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -2px;
            text-transform: uppercase;
        }
        
        .hero-subtitle {
            font-size: 1.2rem;
            color: #d1d5db;
            font-weight: 300;
        }
        
        .total-count {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid rgba(139, 92, 246, 0.4);
            border-radius: 30px;
            color: #a78bfa;
            font-size: 0.95rem;
            font-weight: 600;
        }
        
        /* SEARCH & FILTERS */
        .search-filter-bar {
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 40px;
            backdrop-filter: blur(10px);
            animation: fadeIn 0.8s ease-out 0.2s both;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .search-box {
            position: relative;
            margin-bottom: 25px;
        }
        
        .search-input {
            width: 100%;
            padding: 18px 50px 18px 60px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(139, 92, 246, 0.3);
            border-radius: 15px;
            color: white;
            font-size: 1rem;
            font-family: 'Work Sans', sans-serif;
            transition: all 0.3s;
        }
        
        .search-input:focus {
            outline: none;
            border-color: #8b5cf6;
            background: rgba(139, 92, 246, 0.1);
            box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
        }
        
        .search-icon {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            color: #8b5cf6;
            font-size: 1.3rem;
        }
        
        .search-btn {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            padding: 10px 25px;
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .search-btn:hover {
            transform: translateY(-50%) scale(1.05);
            box-shadow: 0 5px 20px rgba(139, 92, 246, 0.5);
        }
        
        .filters-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
        }
        
        .filter-group label {
            display: block;
            color: #9ca3af;
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .filter-group label i {
            color: #8b5cf6;
            font-size: 0.9rem;
        }
        
        select {
            width: 100%;
            padding: 12px 15px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(139, 92, 246, 0.3);
            border-radius: 10px;
            color: white;
            font-family: 'Work Sans', sans-serif;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        select:focus {
            outline: none;
            border-color: #8b5cf6;
            background: rgba(139, 92, 246, 0.1);
        }
        
        select option {
            background: #1a0b2e;
            color: white;
        }
        
        /* MUSICIANS GRID */
        .musicians-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 30px;
            margin-bottom: 50px;
        }
        
        .musician-card {
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid rgba(139, 92, 246, 0.2);
            border-radius: 20px;
            padding: 0;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            animation: slideUp 0.6s ease-out backwards;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .musician-card:nth-child(1) { animation-delay: 0.1s; }
        .musician-card:nth-child(2) { animation-delay: 0.15s; }
        .musician-card:nth-child(3) { animation-delay: 0.2s; }
        .musician-card:nth-child(4) { animation-delay: 0.25s; }
        .musician-card:nth-child(5) { animation-delay: 0.3s; }
        .musician-card:nth-child(6) { animation-delay: 0.35s; }
        
        .musician-card:hover {
            transform: translateY(-10px);
            border-color: #8b5cf6;
            box-shadow: 0 20px 50px rgba(139, 92, 246, 0.4);
            background: rgba(139, 92, 246, 0.1);
        }
        
        .musician-photo {
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            font-weight: 700;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        .musician-photo::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, transparent, rgba(0,0,0,0.5));
        }
        
        .musician-info {
            padding: 25px;
        }
        
        .musician-name {
            font-family: 'Space Mono', monospace;
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 5px;
            color: #ffffff;
        }
        
        .musician-location {
            color: #9ca3af;
            font-size: 0.9rem;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .musician-bio {
            color: #d1d5db;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 15px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .musician-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 15px;
        }
        
        .tag {
            padding: 5px 12px;
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid rgba(139, 92, 246, 0.4);
            border-radius: 15px;
            font-size: 0.8rem;
            color: #a78bfa;
            font-weight: 500;
        }
        
        .view-profile-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 0.85rem;
        }
        
        .view-profile-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 10px 30px rgba(139, 92, 246, 0.5);
        }
        
        /* EMPTY STATE */
        .empty-state {
            text-align: center;
            padding: 80px 20px;
            animation: fadeIn 0.8s ease-out;
        }
        
        .empty-state i {
            font-size: 5rem;
            color: rgba(139, 92, 246, 0.3);
            margin-bottom: 20px;
        }
        
        .empty-state h3 {
            font-family: 'Space Mono', monospace;
            font-size: 1.8rem;
            margin-bottom: 10px;
            color: #d1d5db;
        }
        
        .empty-state p {
            color: #9ca3af;
        }
        
        /* PAGINATION */
        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            margin: 50px 0;
        }
        
        .pagination a,
        .pagination span {
            padding: 12px 18px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid rgba(139, 92, 246, 0.3);
            border-radius: 10px;
            color: #a78bfa;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
        }
        
        .pagination a:hover {
            background: rgba(139, 92, 246, 0.2);
            border-color: #8b5cf6;
            transform: translateY(-2px);
        }
        
        .pagination .current {
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
            border-color: #8b5cf6;
            color: white;
        }
        
        /* RESPONSIVE */
        @media (max-width: 1200px) {
            .filters-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }
        
        @media (max-width: 768px) {
            .hero-title {
                font-size: 2rem;
            }
            
            .musicians-grid {
                grid-template-columns: 1fr;
            }
            
            .filters-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- HEADER -->
    <header class="header">
        <a href="index.html"><img src="imagens/logo.png" alt="Backstage Logo" class="logo-img"></a>
        <div class="header-actions">
            <a href="perfil.php" class="btn-back">
                <i class="fas fa-arrow-left"></i>
                Meu Perfil
            </a>
            <a href="perfil.php" class="profile-trigger" style="<?php if (!empty($_SESSION['usuario_foto'])): ?>background-image: url('<?php echo htmlspecialchars($_SESSION['usuario_foto']); ?>'); background-size: cover;<?php endif; ?>">
                <?php if (empty($_SESSION['usuario_foto'])): ?>
                <?php echo $iniciais; ?>
                <?php endif; ?>
            </a>
        </div>
    </header>
    
    <div class="container">
        <!-- HERO -->
        <div class="hero">
            <h1 class="hero-title">Descubra Artistas</h1>
            <p class="hero-subtitle">Conecte-se com músicos independentes de todo o Brasil</p>
            <span class="total-count"><?php echo $total_musicos; ?> músicos disponíveis</span>
        </div>
        
        <!-- SEARCH & FILTERS -->
        <div class="search-filter-bar">
            <form method="GET" action="">
                <div class="search-box">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" name="busca" class="search-input" 
                           placeholder="Buscar por nome ou nome artístico..." 
                           value="<?php echo htmlspecialchars($busca); ?>">
                    <button type="submit" class="search-btn">Buscar</button>
                </div>
                
                <div class="filters-grid">
                    <div class="filter-group">
                        <label><i class="fas fa-map-marker-alt"></i> Localização</label>
                        <select name="cidade" onchange="this.form.submit()">
                            <option value="">Todas as cidades</option>
                            <?php foreach ($cidades as $cidade): ?>
                            <option value="<?php echo htmlspecialchars($cidade); ?>" 
                                    <?php echo $filtro_cidade === $cidade ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($cidade); ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label><i class="fas fa-guitar"></i> Instrumento</label>
                        <select name="instrumento" onchange="this.form.submit()">
                            <option value="0">Todos os instrumentos</option>
                            <?php foreach ($instrumentos_filtro as $inst): ?>
                            <option value="<?php echo $inst['id_instrumento']; ?>" 
                                    <?php echo $filtro_instrumento == $inst['id_instrumento'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($inst['nome_instrumento']); ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label><i class="fas fa-music"></i> Gênero Musical</label>
                        <select name="genero" onchange="this.form.submit()">
                            <option value="0">Todos os gêneros</option>
                            <?php foreach ($generos_filtro as $gen): ?>
                            <option value="<?php echo $gen['id_genero']; ?>" 
                                    <?php echo $filtro_genero == $gen['id_genero'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($gen['nome_genero']); ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label><i class="fas fa-calendar-check"></i> Disponibilidade</label>
                        <select name="disponibilidade" onchange="this.form.submit()">
                            <option value="0">Todas as disponibilidades</option>
                            <?php foreach ($disponibilidades_filtro as $disp): ?>
                            <option value="<?php echo $disp['id_disponibilidade']; ?>" 
                                    <?php echo $filtro_disponibilidade == $disp['id_disponibilidade'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($disp['periodo']); ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label><i class="fas fa-briefcase"></i> Área de Atuação</label>
                        <select name="area" onchange="this.form.submit()">
                            <option value="">Todas as áreas</option>
                            <?php foreach ($areas_filtro as $area): ?>
                            <option value="<?php echo htmlspecialchars($area); ?>" 
                                    <?php echo $filtro_area === $area ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($area); ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
            </form>
        </div>
        
        <!-- MUSICIANS GRID -->
        <?php if (count($musicos) > 0): ?>
        <div class="musicians-grid">
            <?php foreach ($musicos as $musico): ?>
            <?php
            $nome_exibir = !empty($musico['nome_artistico']) ? $musico['nome_artistico'] : $musico['nome_completo'];
            $iniciais_musico = strtoupper(substr($nome_exibir, 0, 2));
            ?>
            <div class="musician-card" onclick="window.location.href='ver_perfil.php?id=<?php echo $musico['id_usuario']; ?>'">
                <div class="musician-photo" style="<?php if (!empty($musico['foto_perfil'])): ?>background-image: url('<?php echo htmlspecialchars($musico['foto_perfil']); ?>'); background-size: cover; background-position: center;<?php endif; ?>">
                    <?php if (empty($musico['foto_perfil'])): ?>
                    <?php echo $iniciais_musico; ?>
                    <?php endif; ?>
                </div>
                
                <div class="musician-info">
                    <h3 class="musician-name"><?php echo htmlspecialchars($nome_exibir); ?></h3>
                    <p class="musician-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <?php echo htmlspecialchars($musico['cidade'] . ', ' . $musico['estado']); ?>
                    </p>
                    
                    <?php if (!empty($musico['biografia'])): ?>
                    <p class="musician-bio"><?php echo htmlspecialchars($musico['biografia']); ?></p>
                    <?php endif; ?>
                    
                    <div class="musician-tags">
                        <?php foreach ($musico['instrumentos'] as $inst): ?>
                        <span class="tag"><i class="fas fa-music"></i> <?php echo htmlspecialchars($inst); ?></span>
                        <?php endforeach; ?>
                        
                        <?php foreach ($musico['generos'] as $gen): ?>
                        <span class="tag"><i class="fas fa-compact-disc"></i> <?php echo htmlspecialchars($gen); ?></span>
                        <?php endforeach; ?>
                    </div>
                    
                    <button class="view-profile-btn">
                        Ver Perfil Completo
                    </button>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        
        <!-- PAGINATION -->
        <?php if ($total_paginas > 1): ?>
        <div class="pagination">
            <?php if ($pagina > 1): ?>
            <a href="?pagina=<?php echo $pagina - 1; ?>&busca=<?php echo urlencode($busca); ?>&cidade=<?php echo urlencode($filtro_cidade); ?>&instrumento=<?php echo $filtro_instrumento; ?>&genero=<?php echo $filtro_genero; ?>&disponibilidade=<?php echo $filtro_disponibilidade; ?>&area=<?php echo urlencode($filtro_area); ?>">
                <i class="fas fa-chevron-left"></i> Anterior
            </a>
            <?php endif; ?>
            
            <?php for ($i = 1; $i <= $total_paginas; $i++): ?>
                <?php if ($i == $pagina): ?>
                <span class="current"><?php echo $i; ?></span>
                <?php else: ?>
                <a href="?pagina=<?php echo $i; ?>&busca=<?php echo urlencode($busca); ?>&cidade=<?php echo urlencode($filtro_cidade); ?>&instrumento=<?php echo $filtro_instrumento; ?>&genero=<?php echo $filtro_genero; ?>&disponibilidade=<?php echo $filtro_disponibilidade; ?>&area=<?php echo urlencode($filtro_area); ?>">
                    <?php echo $i; ?>
                </a>
                <?php endif; ?>
            <?php endfor; ?>
            
            <?php if ($pagina < $total_paginas): ?>
            <a href="?pagina=<?php echo $pagina + 1; ?>&busca=<?php echo urlencode($busca); ?>&cidade=<?php echo urlencode($filtro_cidade); ?>&instrumento=<?php echo $filtro_instrumento; ?>&genero=<?php echo $filtro_genero; ?>&disponibilidade=<?php echo $filtro_disponibilidade; ?>&area=<?php echo urlencode($filtro_area); ?>">
                Próximo <i class="fas fa-chevron-right"></i>
            </a>
            <?php endif; ?>
        </div>
        <?php endif; ?>
        
        <?php else: ?>
        <!-- EMPTY STATE -->
        <div class="empty-state">
            <i class="fas fa-search"></i>
            <h3>Nenhum músico encontrado</h3>
            <p>Tente ajustar os filtros ou fazer uma nova busca</p>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>
