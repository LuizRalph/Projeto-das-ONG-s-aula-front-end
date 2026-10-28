ALTER TABLE projetos ADD UNIQUE INDEX IF NOT EXISTS projeto_ong(id,ong_id);
CREATE TABLE IF NOT EXISTS repasses_publicos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 ong_id INT NOT NULL, projeto_id INT NULL,
 orgao_origem VARCHAR(190) NOT NULL, instrumento VARCHAR(190) NOT NULL,
 finalidade VARCHAR(2000) NOT NULL,
 valor_recebido DECIMAL(12,2) NOT NULL CHECK(valor_recebido>0),
 recebido_em DATE NOT NULL,
 status ENUM('Recebido','Cancelado') NOT NULL DEFAULT 'Recebido',
 prestacao_situacao ENUM('Pendente','Em_preparacao','Enviada','Conferida_internamente') NOT NULL DEFAULT 'Pendente',
 observacoes VARCHAR(3000) NOT NULL DEFAULT '',
 motivo_cancelamento VARCHAR(2000) NULL, cancelado_em TIMESTAMP NULL,
 registrado_por INT NOT NULL, chave VARCHAR(80) NOT NULL, hash_cadastro CHAR(64) NOT NULL,
 simulado TINYINT NOT NULL DEFAULT 1 CHECK(simulado=1),
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY reenvio_publico(registrado_por,chave), INDEX repasse_ong_status(ong_id,status),
 FOREIGN KEY(ong_id) REFERENCES ongs(id) ON DELETE RESTRICT,
 FOREIGN KEY(projeto_id,ong_id) REFERENCES projetos(id,ong_id) ON DELETE RESTRICT,
 FOREIGN KEY(registrado_por) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS documentos_repasses_publicos (
 id INT AUTO_INCREMENT PRIMARY KEY, repasse_id INT NOT NULL,
 tipo ENUM('Instrumento','Plano_trabalho','Comprovante','Prestacao_contas','Outro') NOT NULL,
 nome_original VARCHAR(180) NOT NULL, arquivo CHAR(68) NOT NULL UNIQUE,
 mime VARCHAR(50) NOT NULL, tamanho INT NOT NULL, sha256 CHAR(64) NOT NULL,
 enviado_por INT NOT NULL, criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 excluido_em TIMESTAMP NULL,
 INDEX documentos_repasse(repasse_id,excluido_em),
 FOREIGN KEY(repasse_id) REFERENCES repasses_publicos(id) ON DELETE RESTRICT,
 FOREIGN KEY(enviado_por) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
