CREATE TABLE IF NOT EXISTS security_limits (
 chave CHAR(64) PRIMARY KEY,
 tentativas INT UNSIGNED NOT NULL DEFAULT 0,
 expira_em BIGINT UNSIGNED NOT NULL,
 INDEX limpeza(expira_em)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS convites_ativacao (
 usuario_id INT PRIMARY KEY,
 token_hash CHAR(64) NOT NULL UNIQUE,
 expira_em DATETIME NOT NULL,
 usado_em DATETIME NULL,
 FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;
