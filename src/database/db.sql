-- CRIAR BANCO
CREATE DATABASE backstage_cena;

-- CRIAR TABELAS 
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nome_completo VARCHAR(150) NOT NULL,
    nome_artistico VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,       -- corrigido: UNIQUE + NOT NULL
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    bairro VARCHAR(100),
    area_atuacao VARCHAR(100),
    anos_experiencia INT DEFAULT 0,
    biografia TEXT                            -- agora usado corretamente como texto descritivo
);

CREATE TABLE instrumento (
    id_instrumento SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE genero (
    id_genero SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE disponibilidade (
    id_disponibilidade SERIAL PRIMARY KEY,
    descricao VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE usuario_instrumento (
    id_usuario INT REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_instrumento INT REFERENCES instrumento(id_instrumento) ON DELETE CASCADE,
    principal BOOLEAN DEFAULT false,
    PRIMARY KEY (id_usuario, id_instrumento)  -- corrigido: evita duplicatas
);

CREATE TABLE usuario_genero (
    id_usuario INT REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_genero INT REFERENCES genero(id_genero) ON DELETE CASCADE,
    preferencia INT DEFAULT 1,
    PRIMARY KEY (id_usuario, id_genero)       -- corrigido: evita duplicatas
);

CREATE TABLE usuario_disponibilidade (
    id_usuario INT REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_disponibilidade INT REFERENCES disponibilidade(id_disponibilidade) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_disponibilidade) -- corrigido: evita duplicatas
);

-- ============================================
-- INSERTS
-- ============================================

INSERT INTO instrumento VALUES
(1,'Violão'),(2,'Guitarra'),(3,'Baixo'),(4,'Bateria'),
(5,'Teclado'),(6,'Piano'),(7,'Saxofone'),(8,'Vocal'),
(9,'DJ'),(10,'Percussão'),(11,'Sanfona'),(12,'Zabumba'),
(13,'Flauta'),(14,'Trompete'),(15,'Ukulele');

INSERT INTO genero VALUES
(1,'Rock'),(2,'Pop'),(3,'MPB'),(4,'Samba'),(5,'Forró'),
(6,'Jazz'),(7,'Blues'),(8,'Reggae'),(9,'Hip Hop'),
(10,'Eletrônica'),(11,'Funk'),(12,'Gospel'),
(13,'Metal'),(14,'Indie'),(15,'Bossa Nova');

INSERT INTO disponibilidade VALUES
(1,'Manhã'),(2,'Tarde'),(3,'Noite');

-- ========================
-- USUÁRIOS
-- corrigido: biografia agora contém texto descritivo real,
--            não o gênero musical (que fica em usuario_genero)
-- ========================

INSERT INTO usuario VALUES
(1,'Carlos Eduardo','Eddie Rock','c1@mail.com','123','8391111','JP','PB','Manaíra','Instrumentista',8,
 'Guitarrista com 8 anos de experiência, apaixonado por rock clássico e metal.'),
(2,'Maria Silva','Maria Melodia','c2@mail.com','123','8392222','CG','PB','Centro','Instrumentista',10,
 'Cantora e violonista com trajetória em MPB e bossa nova.'),
(3,'João Pedro','JP Beats','c3@mail.com','123','8393333','JP','PB','Bairro','Produtor',6,
 'Produtor musical focado em beats e hip hop, com estúdio próprio.'),
(4,'Lucas Melo','Luke Drums','c4@mail.com','123','8394444','JP','PB','Tambaú','Instrumentista',9,
 'Baterista versátil com experiência em bandas de rock e eventos ao vivo.'),
(5,'José Sousa','Zé Forró','c5@mail.com','123','8395555','Patos','PB','Centro','Instrumentista',15,
 'Sanfoneiro com 15 anos tocando forró pé-de-serra pelo Nordeste.'),
(6,'Ana Ferreira','Carol Keys','c6@mail.com','123','8396666','JP','PB','Bessa','Instrumentista',7,
 'Pianista e tecladista com formação clássica e atuação em jazz e bossa nova.'),
(7,'Rafael Lima','Rafa Bass','c7@mail.com','123','8397777','Bayeux','PB','Centro','Instrumentista',6,
 'Baixista com groove no reggae e funk, disponível para shows e gravações.'),
(8,'Banda Sunset','Sunset','c8@mail.com','123','8398888','JP','PB','Altiplano','Banda',5,
 'Banda de rock formada em João Pessoa, com shows em bares e festivais locais.'),
(9,'Fernando Rocha','Nando Sax','c9@mail.com','123','8399999','JP','PB','Torre','Instrumentista',11,
 'Saxofonista com background em jazz e música instrumental.'),
(10,'Debora Alves','Deb Worship','c10@mail.com','123','8390000','Santa Rita','PB','Centro','Instrumentista',4,
 'Violonista e cantora voltada para música gospel e eventos religiosos.'),
(11,'Pedro Santos','Pedrinho','c11@mail.com','123','8311111','JP','PB','Centro','Instrumentista',3,
 'Violonista iniciante com foco em pop e música popular brasileira.'),
(12,'Luana Costa','Lu Beats','c12@mail.com','123','8322222','JP','PB','Bairro','Produtor',5,
 'Produtora de trap e beats eletrônicos, com lançamentos independentes.'),
(13,'Igor Dias','Igor Rock','c13@mail.com','123','8333333','JP','PB','Centro','Instrumentista',8,
 'Guitarrista de rock com experiência em bandas e projetos autorais.'),
(14,'Paula Souza','Paulinha','c14@mail.com','123','8344444','JP','PB','Centro','Instrumentista',6,
 'Cantora com repertório em MPB, soul e música brasileira contemporânea.'),
(15,'Marcos Lima','Marcão','c15@mail.com','123','8355555','JP','PB','Centro','Instrumentista',12,
 'Percussionista com longa experiência em samba, pagode e eventos culturais.');

-- ========================
-- RELAÇÕES
-- ========================

INSERT INTO usuario_instrumento VALUES
(1,2,true),(1,1,false),(2,8,true),(2,1,false),
(3,9,true),(4,4,true),(5,11,true),(6,6,true),
(7,3,true),(8,2,false),(9,7,true),(10,1,true),
(11,1,true),(12,9,true),(13,2,true),(14,8,true),
(15,10,true),(5,12,false),(6,5,false);

INSERT INTO usuario_genero VALUES
(1,1,1),(1,13,2),(2,3,1),(2,15,2),(3,9,1),
(4,1,1),(5,5,1),(6,6,1),(7,8,1),(8,1,1),
(9,6,1),(10,12,1),(11,2,1),(12,9,1),
(13,1,1),(14,3,1),(15,4,1),(6,15,2),(7,11,2);

INSERT INTO usuario_disponibilidade VALUES
(1,2),(1,3),(2,1),(2,2),(3,2),(3,3),(4,1),(4,3),
(5,3),(6,1),(6,2),(6,3),(7,2),(7,3),(8,3),
(9,2),(9,3),(10,1),(10,3),(11,1),(12,2),(13,3),
(14,1),(15,2);
