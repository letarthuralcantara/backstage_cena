<?php
/**
 * BACKSTAGE CENA - Processar Cadastro
 * 
 * Este arquivo processa o formulário de cadastro,
 * valida os dados e salva no banco de dados.
 */

// Incluir arquivo de configuração e conexão
require_once 'config.php';

// Verificar se o formulário foi enviado via POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: ../cadastro.html");
    exit();
}

// ============================================
// RECEBER E LIMPAR DADOS DO FORMULÁRIO
// ============================================

// Dados Pessoais
$nome_completo = limpar_entrada($_POST['nome_completo']);
$nome_artistico = limpar_entrada($_POST['nome_artistico'] ?? '');
$email = limpar_entrada($_POST['email']);
$senha = $_POST['senha']; // Não limpar (será hasheada)
$confirmar_senha = $_POST['confirmar_senha'];
$telefone = limpar_entrada($_POST['telefone'] ?? '');

// Localização
$cidade = limpar_entrada($_POST['cidade']);
$estado = limpar_entrada($_POST['estado']);
$bairro = limpar_entrada($_POST['bairro'] ?? '');

// Perfil Musical
$areas_atuacao = $_POST['areas_atuacao'] ?? [];
$anos_experiencia = !empty($_POST['anos_experiencia']) ? intval($_POST['anos_experiencia']) : null;
$biografia = limpar_entrada($_POST['biografia'] ?? '');

// Arrays
$instrumentos = $_POST['instrumentos'] ?? [];
$daws = $_POST['daws'] ?? [];
$generos = $_POST['generos'] ?? [];
$disponibilidade = $_POST['disponibilidade'] ?? [];

// ============================================
// VALIDAÇÕES
// ============================================

$erros = [];

// Validar nome completo
if (empty($nome_completo)) {
    $erros[] = "Nome completo é obrigatório.";
} elseif (strlen($nome_completo) < 3) {
    $erros[] = "Nome completo deve ter pelo menos 3 caracteres.";
}

// Validar email
if (empty($email)) {
    $erros[] = "Email é obrigatório.";
} elseif (!validar_email($email)) {
    $erros[] = "Email inválido.";
} else {
    // Verificar se email já existe
    $sql_check = "SELECT id_usuario FROM usuario WHERE email = ? LIMIT 1";
    $stmt_check = $conn->prepare($sql_check);
    $stmt_check->bind_param("s", $email);
    $stmt_check->execute();
    $result_check = $stmt_check->get_result();
    
    if ($result_check->num_rows > 0) {
        $erros[] = "Este email já está cadastrado.";
    }
    $stmt_check->close();
}

// Validar senha
if (empty($senha)) {
    $erros[] = "Senha é obrigatória.";
} elseif (strlen($senha) < 8) {
    $erros[] = "Senha deve ter pelo menos 8 caracteres.";
}

// Validar confirmação de senha
if ($senha !== $confirmar_senha) {
    $erros[] = "As senhas não coincidem.";
}

// Validar cidade e estado
if (empty($cidade)) {
    $erros[] = "Cidade é obrigatória.";
}

if (empty($estado)) {
    $erros[] = "Estado é obrigatório.";
}

// Validar áreas de atuação
if (empty($areas_atuacao)) {
    $erros[] = "Selecione pelo menos uma área de atuação.";
} else {
    // Converter array de áreas em string separada por vírgula
    $area_atuacao_string = implode(', ', $areas_atuacao);
}

// Validar instrumentos (se for Instrumentista)
if (in_array('Instrumentista', $areas_atuacao) && empty($instrumentos)) {
    $erros[] = "Se você é Instrumentista, selecione pelo menos um instrumento.";
}

// Validar gêneros
if (empty($generos)) {
    $erros[] = "Selecione pelo menos um gênero musical.";
}

// Validar disponibilidade
if (empty($disponibilidade)) {
    $erros[] = "Selecione pelo menos um período de disponibilidade.";
}

// Se houver erros, retornar
if (!empty($erros)) {
    $_SESSION['erros_cadastro'] = $erros;
    header("Location: ../cadastro.html?erro=1");
    exit();
}

// ============================================
// INICIAR TRANSAÇÃO (para garantir consistência)
// ============================================

$conn->begin_transaction();

try {
    // ============================================
    // 1. INSERIR USUÁRIO NA TABELA PRINCIPAL
    // ============================================
    
    // Criptografar senha
    $senha_hash = hash_senha($senha);
    
    $sql_usuario = "INSERT INTO usuario (
        nome_completo, 
        nome_artistico, 
        email, 
        senha, 
        telefone, 
        cidade, 
        estado, 
        bairro,
        area_atuacao,
        anos_experiencia,
        biografia,
        ativo,
        email_verificado,
        created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW())";
    
    $stmt_usuario = $conn->prepare($sql_usuario);
    $stmt_usuario->bind_param(
        "ssssssssiss",
        $nome_completo,
        $nome_artistico,
        $email,
        $senha_hash,
        $telefone,
        $cidade,
        $estado,
        $bairro,
        $area_atuacao_string,
        $anos_experiencia,
        $biografia
    );
    
    if (!$stmt_usuario->execute()) {
        throw new Exception("Erro ao cadastrar usuário: " . $stmt_usuario->error);
    }
    
    // Pegar o ID do usuário recém-criado
    $id_usuario = $conn->insert_id;
    $stmt_usuario->close();
    
    // ============================================
    // 2. INSERIR INSTRUMENTOS (se houver)
    // ============================================
    
    if (!empty($instrumentos)) {
        $sql_instrumento = "INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES (?, ?, ?)";
        $stmt_instrumento = $conn->prepare($sql_instrumento);
        
        foreach ($instrumentos as $index => $id_instrumento) {
            $id_instrumento = intval($id_instrumento);
            $principal = ($index === 0) ? 1 : 0; // Primeiro instrumento é principal
            
            $stmt_instrumento->bind_param("iii", $id_usuario, $id_instrumento, $principal);
            
            if (!$stmt_instrumento->execute()) {
                throw new Exception("Erro ao cadastrar instrumentos.");
            }
        }
        $stmt_instrumento->close();
    }
    
    // ============================================
    // 3. INSERIR GÊNEROS MUSICAIS
    // ============================================
    
    if (!empty($generos)) {
        $sql_genero = "INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES (?, ?, ?)";
        $stmt_genero = $conn->prepare($sql_genero);
        
        foreach ($generos as $index => $id_genero) {
            $id_genero = intval($id_genero);
            $preferencia = 10 - $index; // Preferência decrescente (primeiro é favorito)
            
            $stmt_genero->bind_param("iii", $id_usuario, $id_genero, $preferencia);
            
            if (!$stmt_genero->execute()) {
                throw new Exception("Erro ao cadastrar gêneros musicais.");
            }
        }
        $stmt_genero->close();
    }
    
    // ============================================
    // 4. INSERIR DISPONIBILIDADE
    // ============================================
    
    if (!empty($disponibilidade)) {
        $sql_disponibilidade = "INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade, dias_semana) VALUES (?, ?, ?)";
        $stmt_disponibilidade = $conn->prepare($sql_disponibilidade);
        
        $dias_semana = "Segunda,Terça,Quarta,Quinta,Sexta,Sábado,Domingo"; // Todos os dias por padrão
        
        foreach ($disponibilidade as $id_disponibilidade) {
            $id_disponibilidade = intval($id_disponibilidade);
            
            $stmt_disponibilidade->bind_param("iis", $id_usuario, $id_disponibilidade, $dias_semana);
            
            if (!$stmt_disponibilidade->execute()) {
                throw new Exception("Erro ao cadastrar disponibilidade.");
            }
        }
        $stmt_disponibilidade->close();
    }
    
    // ============================================
    // 5. SALVAR DAWs (se for Produtor) - em biografia ou campo separado
    // ============================================
    
    if (!empty($daws) && in_array('Produtor', $areas_atuacao)) {
        // Como não temos tabela específica para DAWs, vamos adicionar à biografia
        $daws_text = "\n\nDAWs que utilizo: " . implode(', ', $daws);
        
        $sql_update_bio = "UPDATE usuario SET biografia = CONCAT(biografia, ?) WHERE id_usuario = ?";
        $stmt_update_bio = $conn->prepare($sql_update_bio);
        $stmt_update_bio->bind_param("si", $daws_text, $id_usuario);
        $stmt_update_bio->execute();
        $stmt_update_bio->close();
    }
    
    // ============================================
    // CONFIRMAR TRANSAÇÃO
    // ============================================
    
    $conn->commit();
    
    // ============================================
    // SUCESSO! REDIRECIONAR PARA LOGIN
    // ============================================
    
    $_SESSION['sucesso_cadastro'] = "Cadastro realizado com sucesso! Faça login para começar.";
    header("Location: ../login.html?mensagem=cadastro_sucesso");
    exit();
    
} catch (Exception $e) {
    // Se houver erro, desfazer tudo
    $conn->rollback();
    
    // Log do erro (em produção, salvar em arquivo)
    error_log("Erro no cadastro: " . $e->getMessage());
    
    $_SESSION['erro_cadastro'] = "Erro ao processar cadastro. Tente novamente.";
    header("Location: ../cadastro.html?erro=sistema");
    exit();
}

// Fechar conexão
$conn->close();

?>