<?php
require_once 'php/config.php';
verificar_login();

$id_usuario = $_SESSION['usuario_id'];

// Buscar dados do usuário
$sql = "SELECT foto_perfil FROM usuario WHERE id_usuario = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_usuario);
$stmt->execute();
$result = $stmt->get_result();
$usuario = $result->fetch_assoc();
$stmt->close();
$conn->close();
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link rel="shortcut icon" href="imagens/favicon.ico" type="image/x-icon">
    <title>Debug Foto</title>
    <style>
        body {
            font-family: monospace;
            padding: 20px;
            background: #1a1a1a;
            color: #0f0;
        }
        .box {
            background: #000;
            border: 2px solid #0f0;
            padding: 20px;
            margin: 20px 0;
        }
        .error {
            color: #f00;
        }
        .success {
            color: #0f0;
        }
        img {
            max-width: 300px;
            border: 2px solid #0f0;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <h1>🔍 DEBUG - FOTO DE PERFIL</h1>
    
    <div class="box">
        <h2>1. CAMINHO NO BANCO DE DADOS:</h2>
        <p>
            <?php if (!empty($usuario['foto_perfil'])): ?>
                <span class="success">✅ EXISTE!</span><br>
                Caminho: <strong><?php echo htmlspecialchars($usuario['foto_perfil']); ?></strong>
            <?php else: ?>
                <span class="error">❌ VAZIO/NULL!</span><br>
                A coluna foto_perfil está vazia no banco!
            <?php endif; ?>
        </p>
    </div>
    
    <div class="box">
        <h2>2. ARQUIVO FÍSICO EXISTE?</h2>
        <?php if (!empty($usuario['foto_perfil'])): ?>
            <?php $caminho_completo = __DIR__ . '/' . $usuario['foto_perfil']; ?>
            <p>Caminho completo: <?php echo htmlspecialchars($caminho_completo); ?></p>
            <p>
                <?php if (file_exists($caminho_completo)): ?>
                    <span class="success">✅ ARQUIVO EXISTE!</span><br>
                    Tamanho: <?php echo filesize($caminho_completo); ?> bytes
                <?php else: ?>
                    <span class="error">❌ ARQUIVO NÃO ENCONTRADO!</span>
                <?php endif; ?>
            </p>
        <?php else: ?>
            <p><span class="error">❌ Sem caminho no banco para verificar</span></p>
        <?php endif; ?>
    </div>
    
    <div class="box">
        <h2>3. LISTA DE ARQUIVOS NA PASTA:</h2>
        <?php
        $pasta_uploads = __DIR__ . '/uploads/perfis/';
        if (is_dir($pasta_uploads)) {
            $arquivos = scandir($pasta_uploads);
            $arquivos = array_diff($arquivos, ['.', '..']);
            
            if (count($arquivos) > 0) {
                echo '<span class="success">✅ ARQUIVOS ENCONTRADOS:</span><br>';
                foreach ($arquivos as $arquivo) {
                    echo "- " . htmlspecialchars($arquivo) . "<br>";
                }
            } else {
                echo '<span class="error">❌ PASTA VAZIA!</span>';
            }
        } else {
            echo '<span class="error">❌ PASTA NÃO EXISTE!</span>';
        }
        ?>
    </div>
    
    <div class="box">
        <h2>4. TENTAR EXIBIR A IMAGEM:</h2>
        <?php if (!empty($usuario['foto_perfil'])): ?>
            <p>Tentando exibir: <?php echo htmlspecialchars($usuario['foto_perfil']); ?></p>
            <img src="<?php echo htmlspecialchars($usuario['foto_perfil']); ?>" alt="Foto de Perfil">
            
            <br><br>
            <p>Se a imagem NÃO apareceu acima, o caminho está ERRADO!</p>
        <?php else: ?>
            <p><span class="error">❌ Sem foto no banco</span></p>
        <?php endif; ?>
    </div>
    
    <div class="box">
        <h2>5. INFORMAÇÕES DO SISTEMA:</h2>
        <p>
            Diretório atual: <?php echo __DIR__; ?><br>
            Usuário ID: <?php echo $id_usuario; ?><br>
        </p>
    </div>
    
    <br>
    <a href="perfil.php" style="color: #0f0;">← Voltar ao Perfil</a>
</body>
</html>
