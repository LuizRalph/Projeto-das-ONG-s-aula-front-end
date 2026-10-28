CREATE TABLE IF NOT EXISTS usuarios (
 id INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(150) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE,
 senha_hash VARCHAR(255) NOT NULL, perfil ENUM('admin','ong','voluntario') NOT NULL DEFAULT 'voluntario',
 telefone VARCHAR(40) NOT NULL DEFAULT '', criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS usuarios_ongs (
 usuario_id INT NOT NULL, ong_id INT NOT NULL, PRIMARY KEY(usuario_id,ong_id),
 FOREIGN KEY(usuario_id) REFERENCES usuarios(id), FOREIGN KEY(ong_id) REFERENCES ongs(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS login_tentativas (
 chave CHAR(64) PRIMARY KEY, tentativas INT NOT NULL DEFAULT 0, inicio DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS candidaturas (
 id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL, oportunidade_id INT NOT NULL,
 status ENUM('Pendente','Lista de espera','Aprovado','Rejeitado','Cancelado') NOT NULL,
 dados LONGTEXT NOT NULL CHECK(JSON_VALID(dados)),
 ativa TINYINT GENERATED ALWAYS AS (CASE WHEN status IN ('Pendente','Lista de espera','Aprovado') THEN 1 ELSE NULL END) STORED,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY candidatura_ativa(usuario_id,oportunidade_id,ativa), INDEX fila(oportunidade_id,status,criado_em,id),
 FOREIGN KEY(usuario_id) REFERENCES usuarios(id), FOREIGN KEY(oportunidade_id) REFERENCES oportunidades(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS historico_candidaturas (
 id INT AUTO_INCREMENT PRIMARY KEY, candidatura_id INT NOT NULL, autor_id INT NOT NULL,
 status_anterior VARCHAR(30) NULL, status_novo VARCHAR(30) NOT NULL, justificativa VARCHAR(2000) NOT NULL,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(candidatura_id) REFERENCES candidaturas(id), FOREIGN KEY(autor_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS doacoes (
 id INT AUTO_INCREMENT PRIMARY KEY, projeto_id INT NOT NULL, usuario_id INT NOT NULL,
 valor DECIMAL(12,2) NOT NULL CHECK(valor>0), status ENUM('Simulada','Cancelada') NOT NULL DEFAULT 'Simulada',
 chave VARCHAR(80) NOT NULL, criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY reenvio(usuario_id,chave), INDEX projeto_status(projeto_id,status),
 FOREIGN KEY(projeto_id) REFERENCES projetos(id), FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS auditoria (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, autor_id INT NOT NULL, recurso VARCHAR(50) NOT NULL,
 registro_id INT NULL, acao VARCHAR(30) NOT NULL, criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(autor_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
