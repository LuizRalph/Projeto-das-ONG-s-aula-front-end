-- Execute dentro do banco escolhido na hospedagem. MariaDB, InnoDB, UTF-8.
CREATE TABLE IF NOT EXISTS mvp_lock (
    id INT PRIMARY KEY,
    seeded TINYINT NOT NULL DEFAULT 0
) ENGINE=InnoDB;
INSERT IGNORE INTO mvp_lock (id) VALUES (1);

CREATE TABLE IF NOT EXISTS ongs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    sigla VARCHAR(20) NOT NULL DEFAULT '',
    cnpj CHAR(14) NULL UNIQUE,
    categoria VARCHAR(100) NOT NULL,
    cidade VARCHAR(150) NOT NULL,
    email VARCHAR(190) NOT NULL,
    telefone VARCHAR(40) NOT NULL DEFAULT '',
    responsavel VARCHAR(150) NOT NULL DEFAULT '',
    descricao TEXT NOT NULL,
    missao TEXT NOT NULL,
    cor CHAR(7) NOT NULL DEFAULT '#087f70',
    imagem VARCHAR(500) NOT NULL DEFAULT '',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solicitacoes_ongs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cnpj CHAR(14) NOT NULL,
    cidade VARCHAR(150) NOT NULL,
    responsavel VARCHAR(150) NOT NULL,
    email VARCHAR(190) NOT NULL,
    telefone VARCHAR(40) NOT NULL,
    descricao TEXT NOT NULL,
    status ENUM('Pendente','Cadastrada','Rejeitado') NOT NULL DEFAULT 'Pendente',
    motivo TEXT NULL,
    ong_id INT NULL,
    solicitacao_anterior_id INT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_solicitacoes_cnpj_status (cnpj, status),
    FOREIGN KEY (ong_id) REFERENCES ongs(id) ON DELETE SET NULL,
    FOREIGN KEY (solicitacao_anterior_id) REFERENCES solicitacoes_ongs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projetos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ong_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    meta DECIMAL(12,2) NOT NULL DEFAULT 0,
    arrecadado DECIMAL(12,2) NOT NULL DEFAULT 0,
    voluntarios INT NOT NULL DEFAULT 0,
    status ENUM('Ativo','Concluído','Pausado') NOT NULL DEFAULT 'Ativo',
    emoji VARCHAR(20) NOT NULL DEFAULT '🤝',
    imagem VARCHAR(500) NOT NULL DEFAULT '',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ong_id) REFERENCES ongs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS historico_solicitacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitacao_id INT NOT NULL,
    status_anterior VARCHAR(30) NULL,
    status_novo VARCHAR(30) NOT NULL,
    justificativa TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes_ongs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Oportunidades iniciais continuam demonstrativas, mas ficam relacionadas no banco.
CREATE TABLE IF NOT EXISTS oportunidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    projeto_id INT NOT NULL,
    dados LONGTEXT NOT NULL CHECK (JSON_VALID(dados)),
    FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
