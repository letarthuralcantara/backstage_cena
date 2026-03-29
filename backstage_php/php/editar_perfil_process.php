<?php
require_once 'config.php';
verificar_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: ../editar_perfil.php");
    exit();
}

$id_usuario = $_SESSION['usuario_id'];

// Receber dados do formulário
$nome_artistico = limpar_entrada($_POST['nome_artistico']);
$biografia = limpar_entrada($_POST['biografia']);
$telefone = limpar_entrada($_POST['telefone']);
$bairro = limpar_entrada($_POST['bairro']);
$anos_experiencia = intval($_POST['anos_experiencia']);
$instrumentos = isset($_POST['instrumentos']) ? $_POST['instrumentos'] : [];
$generos = isset($_POST['generos']) ? $_POST['generos'] : [];
$disponibilidade = isset($_POST['disponibilidade']) ? $_POST['disponibilidade'] : [];

// ============================================
// PROCESSAR UPLOAD DE FOTO
// ============================================

$foto_perfil = null;

if (isset($_FILES['foto_perfil']) && $_FILES['foto_perfil']['size'] > 0) {
    $arquivo = $_FILES['foto_perfil'];
    
    // Log do erro de upload
    if ($arquivo['error'] !== UPLOAD_ERR_OK) {
        $erros_upload = [
            UPLOAD_ERR_INI_SIZE => 'Arquivo muito grande (php.ini)',
            UPLOAD_ERR_FORM_SIZE => 'Arquivo muito grande (formulário)',
            UPLOAD_ERR_PARTIAL => 'Upload parcial',
            UPLOAD_ERR_NO_FILE => 'Nenhum arquivo enviado',
            UPLOAD_ERR_NO_TMP_DIR => 'Pasta temporária não encontrada',
            UPLOAD_ERR_CANT_WRITE => 'Erro ao escrever no disco',
            UPLOAD_ERR_EXTENSION => 'Upload bloqueado por extensão'
        ];
        $erro_msg = isset($erros_upload[$arquivo['error']]) ? $erros_upload[$arquivo['error']] : 'Erro desconhecido';
        $_SESSION['erro_edicao'] = "Erro no upload: " . $erro_msg;
        header("Location: ../editar_perfil.php?erro=1");
        exit();
    }
    
    // Validar tipo de arquivo pela extensão
    $extensao = strtolower(pathinfo($arquivo['name'], PATHINFO_EXTENSION));
    $extensoes_permitidas = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!in_array($extensao, $extensoes_permitidas)) {
        $_SESSION['erro_edicao'] = "Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WEBP.";
        header("Location: ../editar_perfil.php?erro=1");
        exit();
    }
    
    // Validar tamanho (máximo 5MB)
    if ($arquivo['size'] > 5 * 1024 * 1024) {
        $_SESSION['erro_edicao'] = "Arquivo muito grande. Máximo 5MB.";
        header("Location: ../editar_perfil.php?erro=1");
        exit();
    }
    
    // Criar diretório se não existir
    $upload_dir = __DIR__ . '/../uploads/perfis/';
    if (!file_exists($upload_dir)) {
        if (!mkdir($upload_dir, 0777, true)) {
            $_SESSION['erro_edicao'] = "Erro ao criar diretório de upload.";
            header("Location: ../editar_perfil.php?erro=1");
            exit();
        }
    }
    
    // Gerar nome único
    $nome_arquivo = 'perfil_' . $id_usuario . '_' . time() . '.' . $extensao;
    $caminho_completo = $upload_dir . $nome_arquivo;
    
    // Mover arquivo
    if (move_uploaded_file($arquivo['tmp_name'], $caminho_completo)) {
        $foto_perfil = 'uploads/perfis/' . $nome_arquivo;
        
        // Deletar foto antiga se existir
        $sql_foto_antiga = "SELECT foto_perfil FROM usuario WHERE id_usuario = ?";
        $stmt_old = $conn->prepare($sql_foto_antiga);
        $stmt_old->bind_param("i", $id_usuario);
        $stmt_old->execute();
        $result_old = $stmt_old->get_result();
        if ($row_old = $result_old->fetch_assoc()) {
            if (!empty($row_old['foto_perfil']) && $row_old['foto_perfil'] !== $foto_perfil) {
                $foto_antiga_path = __DIR__ . '/../' . $row_old['foto_perfil'];
                if (file_exists($foto_antiga_path)) {
                    unlink($foto_antiga_path);
                }
            }
        }
        $stmt_old->close();
    } else {
        $_SESSION['erro_edicao'] = "Erro ao mover arquivo. Verifique as permissões da pasta uploads.";
        header("Location: ../editar_perfil.php?erro=1");
        exit();
    }
}

// ============================================
// INICIAR TRANSAÇÃO
// ============================================

$conn->begin_transaction();

try {
    // Atualizar dados básicos do usuário
    if ($foto_perfil) {
        $sql_update = "UPDATE usuario SET 
                      nome_artistico = ?,
                      biografia = ?,
                      telefone = ?,
                      bairro = ?,
                      anos_experiencia = ?,
                      foto_perfil = ?
                      WHERE id_usuario = ?";
        $stmt = $conn->prepare($sql_update);
        $stmt->bind_param("ssssisi", $nome_artistico, $biografia, $telefone, $bairro, $anos_experiencia, $foto_perfil, $id_usuario);
    } else {
        $sql_update = "UPDATE usuario SET 
                      nome_artistico = ?,
                      biografia = ?,
                      telefone = ?,
                      bairro = ?,
                      anos_experiencia = ?
                      WHERE id_usuario = ?";
        $stmt = $conn->prepare($sql_update);
        $stmt->bind_param("sssiii", $nome_artistico, $biografia, $telefone, $bairro, $anos_experiencia, $id_usuario);
    }
    $stmt->execute();
    $stmt->close();
    
    // ============================================
    // ATUALIZAR INSTRUMENTOS
    // ============================================
    
    // Deletar instrumentos antigos
    $sql_del_inst = "DELETE FROM usuario_instrumento WHERE id_usuario = ?";
    $stmt_del = $conn->prepare($sql_del_inst);
    $stmt_del->bind_param("i", $id_usuario);
    $stmt_del->execute();
    $stmt_del->close();
    
    // Inserir novos instrumentos
    if (!empty($instrumentos)) {
        $sql_inst = "INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES (?, ?, ?)";
        $stmt_inst = $conn->prepare($sql_inst);
        
        foreach ($instrumentos as $index => $id_instrumento) {
            $principal = ($index === 0) ? 1 : 0; // Primeiro é principal
            $stmt_inst->bind_param("iii", $id_usuario, $id_instrumento, $principal);
            $stmt_inst->execute();
        }
        $stmt_inst->close();
    }
    
    // ============================================
    // ATUALIZAR GÊNEROS
    // ============================================
    
    // Deletar gêneros antigos
    $sql_del_gen = "DELETE FROM usuario_genero WHERE id_usuario = ?";
    $stmt_del = $conn->prepare($sql_del_gen);
    $stmt_del->bind_param("i", $id_usuario);
    $stmt_del->execute();
    $stmt_del->close();
    
    // Inserir novos gêneros
    if (!empty($generos)) {
        $sql_gen = "INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES (?, ?, ?)";
        $stmt_gen = $conn->prepare($sql_gen);
        
        foreach ($generos as $index => $id_genero) {
            $preferencia = count($generos) - $index; // Decrescente
            $stmt_gen->bind_param("iii", $id_usuario, $id_genero, $preferencia);
            $stmt_gen->execute();
        }
        $stmt_gen->close();
    }
    
    // ============================================
    // ATUALIZAR DISPONIBILIDADE
    // ============================================
    
    // Deletar disponibilidades antigas
    $sql_del_disp = "DELETE FROM usuario_disponibilidade WHERE id_usuario = ?";
    $stmt_del = $conn->prepare($sql_del_disp);
    $stmt_del->bind_param("i", $id_usuario);
    $stmt_del->execute();
    $stmt_del->close();
    
    // Inserir novas disponibilidades
    if (!empty($disponibilidade)) {
        $sql_disp = "INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES (?, ?)";
        $stmt_disp = $conn->prepare($sql_disp);
        
        foreach ($disponibilidade as $id_disponibilidade) {
            $stmt_disp->bind_param("ii", $id_usuario, $id_disponibilidade);
            $stmt_disp->execute();
        }
        $stmt_disp->close();
    }
    
    // Commit da transação
    $conn->commit();
    
    // Atualizar sessão com novo nome artístico
    $_SESSION['usuario_nome_artistico'] = $nome_artistico;
    if ($foto_perfil) {
        $_SESSION['usuario_foto'] = $foto_perfil;
    }
    
    $_SESSION['sucesso_edicao'] = "Perfil atualizado com sucesso!";
    header("Location: ../editar_perfil.php?sucesso=1");
    exit();
    
} catch (Exception $e) {
    // Rollback em caso de erro
    $conn->rollback();
    
    error_log("Erro ao atualizar perfil: " . $e->getMessage());
    $_SESSION['erro_edicao'] = "Erro ao atualizar perfil. Tente novamente.";
    header("Location: ../editar_perfil.php?erro=1");
    exit();
}

$conn->close();
?>
