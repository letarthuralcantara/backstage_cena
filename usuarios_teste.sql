-- ============================================
-- BACKSTAGE CENA - CRIAR MÚLTIPLOS USUÁRIOS
-- ============================================
-- Senha para todos: 123456
-- Hash: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

-- ============================================
-- USUÁRIO 1: Guitarrista de Rock
-- ============================================
INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia) VALUES
('Carlos Eduardo Santos', 'Eddie Rock', 'carlos@rock.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(83) 98888-1111', 'João Pessoa', 'PB', 'Manaíra', 'Instrumentista', 8, 'Guitarrista profissional especializado em rock clássico e moderno. Disponível para shows, gravações e aulas.');

-- Instrumentos do Carlos
INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES
(LAST_INSERT_ID(), 2, 1),  -- Guitarra (principal)
(LAST_INSERT_ID(), 1, 0);  -- Violão

-- Gêneros do Carlos
INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES
(LAST_INSERT_ID(), 1, 1),  -- Rock
(LAST_INSERT_ID(), 14, 2); -- Metal

-- Disponibilidade do Carlos
INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES
(LAST_INSERT_ID(), 2),  -- Tarde
(LAST_INSERT_ID(), 3);  -- Noite

-- ============================================
-- USUÁRIO 2: Vocalista de MPB
-- ============================================
INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia) VALUES
('Maria Silva Costa', 'Maria Melodia', 'maria@mpb.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(83) 99777-2222', 'Campina Grande', 'PB', 'Centro', 'Instrumentista', 12, 'Cantora e compositora de MPB. Repertório variado incluindo bossa nova, samba e música popular brasileira.');

-- Instrumentos da Maria
INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES
(LAST_INSERT_ID(), 13, 1),  -- Vocal (principal)
(LAST_INSERT_ID(), 1, 0);   -- Violão

-- Gêneros da Maria
INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES
(LAST_INSERT_ID(), 3, 1),   -- MPB
(LAST_INSERT_ID(), 18, 2),  -- Bossa Nova
(LAST_INSERT_ID(), 4, 3);   -- Samba

-- Disponibilidade da Maria
INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES
(LAST_INSERT_ID(), 1),  -- Manhã
(LAST_INSERT_ID(), 2);  -- Tarde

-- ============================================
-- USUÁRIO 3: Produtor Musical
-- ============================================
INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia) VALUES
('João Pedro Oliveira', 'JP Beats', 'joao@producer.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(83) 98666-3333', 'João Pessoa', 'PB', 'Cabo Branco', 'Produtor Musical', 6, 'Produtor musical especializado em Hip Hop, Trap e música eletrônica. Estúdio próprio equipado.');

-- Instrumentos do João
INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES
(LAST_INSERT_ID(), 14, 1),  -- DJ/Produção (principal)
(LAST_INSERT_ID(), 5, 0);   -- Teclado

-- Gêneros do João
INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES
(LAST_INSERT_ID(), 9, 1),   -- Hip Hop
(LAST_INSERT_ID(), 10, 2),  -- Eletrônica
(LAST_INSERT_ID(), 11, 3);  -- Funk

-- Disponibilidade do João
INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES
(LAST_INSERT_ID(), 2),  -- Tarde
(LAST_INSERT_ID(), 3);  -- Noite

-- ============================================
-- USUÁRIO 4: Baterista
-- ============================================
INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia) VALUES
('Lucas Andrade Melo', 'Luke Drums', 'lucas@drums.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(83) 99555-4444', 'João Pessoa', 'PB', 'Tambaú', 'Instrumentista', 10, 'Baterista versátil com experiência em diversos estilos. Disponível para gravações, shows e aulas.');

-- Instrumentos do Lucas
INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES
(LAST_INSERT_ID(), 4, 1),   -- Bateria (principal)
(LAST_INSERT_ID(), 18, 0);  -- Percussão

-- Gêneros do Lucas
INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES
(LAST_INSERT_ID(), 1, 1),   -- Rock
(LAST_INSERT_ID(), 6, 2),   -- Jazz
(LAST_INSERT_ID(), 11, 3);  -- Funk

-- Disponibilidade do Lucas
INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES
(LAST_INSERT_ID(), 1),  -- Manhã
(LAST_INSERT_ID(), 3);  -- Noite

-- ============================================
-- USUÁRIO 5: Forrozeiro
-- ============================================
INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia) VALUES
('José Roberto Sousa', 'Zé da Sanfona', 'ze@forro.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(83) 98444-5555', 'Patos', 'PB', 'Centro', 'Instrumentista', 15, 'Sanfoneiro e zabumbeiro tradicional. Especialista em forró pé-de-serra e forró universitário.');

-- Instrumentos do José
INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES
(LAST_INSERT_ID(), 15, 1),  -- Sanfona (principal)
(LAST_INSERT_ID(), 16, 0);  -- Zabumba

-- Gêneros do José
INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES
(LAST_INSERT_ID(), 5, 1);   -- Forró

-- Disponibilidade do José
INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES
(LAST_INSERT_ID(), 3);  -- Noite

-- ============================================
-- USUÁRIO 6: Pianista/Tecladista
-- ============================================
INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia) VALUES
('Ana Carolina Ferreira', 'Carol Keys', 'ana@piano.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(83) 99333-6666', 'João Pessoa', 'PB', 'Bessa', 'Instrumentista', 9, 'Pianista clássica com experiência em música popular. Disponível para eventos, casamentos e gravações.');

-- Instrumentos da Ana
INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES
(LAST_INSERT_ID(), 6, 1),   -- Piano (principal)
(LAST_INSERT_ID(), 5, 0);   -- Teclado

-- Gêneros da Ana
INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES
(LAST_INSERT_ID(), 6, 1),   -- Jazz
(LAST_INSERT_ID(), 18, 2),  -- Bossa Nova
(LAST_INSERT_ID(), 3, 3);   -- MPB

-- Disponibilidade da Ana
INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES
(LAST_INSERT_ID(), 1),  -- Manhã
(LAST_INSERT_ID(), 2),  -- Tarde
(LAST_INSERT_ID(), 3);  -- Noite

-- ============================================
-- USUÁRIO 7: Baixista
-- ============================================
INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia) VALUES
('Rafael Santos Lima', 'Rafa Bass', 'rafael@bass.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(83) 98222-7777', 'Bayeux', 'PB', 'Centro', 'Instrumentista', 7, 'Baixista de 4 e 5 cordas. Experiência em diversos estilos musicais. Disponível para bandas e projetos.');

-- Instrumentos do Rafael
INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES
(LAST_INSERT_ID(), 3, 1);   -- Baixo (principal)

-- Gêneros do Rafael
INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES
(LAST_INSERT_ID(), 1, 1),   -- Rock
(LAST_INSERT_ID(), 8, 2),   -- Reggae
(LAST_INSERT_ID(), 11, 3);  -- Funk

-- Disponibilidade do Rafael
INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES
(LAST_INSERT_ID(), 2),  -- Tarde
(LAST_INSERT_ID(), 3);  -- Noite

-- ============================================
-- USUÁRIO 8: Banda Completa
-- ============================================
INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia) VALUES
('Banda Sunset', 'Sunset Band', 'contato@sunset.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(83) 99111-8888', 'João Pessoa', 'PB', 'Altiplano', 'Banda/Grupo', 5, 'Banda de covers e autorais de rock alternativo. Formação completa: vocal, guitarra, baixo, bateria e teclado.');

-- Instrumentos da Banda
INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES
(LAST_INSERT_ID(), 13, 1),  -- Vocal
(LAST_INSERT_ID(), 2, 0),   -- Guitarra
(LAST_INSERT_ID(), 3, 0),   -- Baixo
(LAST_INSERT_ID(), 4, 0),   -- Bateria
(LAST_INSERT_ID(), 5, 0);   -- Teclado

-- Gêneros da Banda
INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES
(LAST_INSERT_ID(), 1, 1),   -- Rock
(LAST_INSERT_ID(), 15, 2),  -- Indie
(LAST_INSERT_ID(), 2, 3);   -- Pop

-- Disponibilidade da Banda
INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES
(LAST_INSERT_ID(), 3);  -- Noite

-- ============================================
-- USUÁRIO 9: Saxofonista de Jazz
-- ============================================
INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia) VALUES
('Fernando Augusto Rocha', 'Nando Sax', 'fernando@jazz.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(83) 98000-9999', 'João Pessoa', 'PB', 'Torre', 'Instrumentista', 11, 'Saxofonista soprano, alto e tenor. Especialista em jazz, blues e soul. Disponível para eventos e gravações.');

-- Instrumentos do Fernando
INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES
(LAST_INSERT_ID(), 8, 1);   -- Saxofone (principal)

-- Gêneros do Fernando
INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES
(LAST_INSERT_ID(), 6, 1),   -- Jazz
(LAST_INSERT_ID(), 7, 2),   -- Blues
(LAST_INSERT_ID(), 17, 3);  -- Soul

-- Disponibilidade do Fernando
INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES
(LAST_INSERT_ID(), 2),  -- Tarde
(LAST_INSERT_ID(), 3);  -- Noite

-- ============================================
-- USUÁRIO 10: Violonista Gospel
-- ============================================
INSERT INTO usuario (nome_completo, nome_artistico, email, senha, telefone, cidade, estado, bairro, area_atuacao, anos_experiencia, biografia) VALUES
('Débora Cristina Alves', 'Deb Worship', 'debora@gospel.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '(83) 97999-0000', 'Santa Rita', 'PB', 'Centro', 'Instrumentista', 4, 'Violonista e vocalista de música gospel. Ministra de louvor com experiência em eventos e cultos.');

-- Instrumentos da Débora
INSERT INTO usuario_instrumento (id_usuario, id_instrumento, principal) VALUES
(LAST_INSERT_ID(), 1, 1),   -- Violão (principal)
(LAST_INSERT_ID(), 13, 0);  -- Vocal

-- Gêneros da Débora
INSERT INTO usuario_genero (id_usuario, id_genero, preferencia) VALUES
(LAST_INSERT_ID(), 12, 1),  -- Gospel
(LAST_INSERT_ID(), 2, 2);   -- Pop

-- Disponibilidade da Débora
INSERT INTO usuario_disponibilidade (id_usuario, id_disponibilidade) VALUES
(LAST_INSERT_ID(), 1),  -- Manhã
(LAST_INSERT_ID(), 3);  -- Noite

-- ============================================
-- FIM - 10 USUÁRIOS CRIADOS!
-- ============================================
-- Todos com senha: 123456
-- Emails diversos para facilitar testes
-- ============================================
