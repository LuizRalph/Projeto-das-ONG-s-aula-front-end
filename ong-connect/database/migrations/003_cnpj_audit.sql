CREATE TABLE IF NOT EXISTS controle_cnpj (
 id INT AUTO_INCREMENT PRIMARY KEY,
 cnpj CHAR(14) NOT NULL UNIQUE,
 bloqueado_em TIMESTAMP NULL,
 motivo_bloqueio VARCHAR(255) NULL,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO controle_cnpj(cnpj) SELECT DISTINCT cnpj FROM solicitacoes_ongs;
ALTER TABLE solicitacoes_ongs ADD COLUMN IF NOT EXISTS controle_cnpj_id INT NULL;
UPDATE solicitacoes_ongs s JOIN controle_cnpj c ON c.cnpj=s.cnpj SET s.controle_cnpj_id=c.id WHERE s.controle_cnpj_id IS NULL;
ALTER TABLE solicitacoes_ongs DROP FOREIGN KEY IF EXISTS fk_solicitacao_controle;
ALTER TABLE solicitacoes_ongs ADD CONSTRAINT fk_solicitacao_controle FOREIGN KEY(controle_cnpj_id) REFERENCES controle_cnpj(id);
ALTER TABLE historico_solicitacoes ADD COLUMN IF NOT EXISTS controle_cnpj_id INT NULL, ADD COLUMN IF NOT EXISTS solicitacao_original_id INT NULL, ADD COLUMN IF NOT EXISTS rejeicao_unica INT NULL, ADD COLUMN IF NOT EXISTS autor_id INT NULL;
UPDATE historico_solicitacoes h JOIN solicitacoes_ongs s ON s.id=h.solicitacao_id SET h.controle_cnpj_id=s.controle_cnpj_id,h.solicitacao_original_id=s.id WHERE h.controle_cnpj_id IS NULL;
UPDATE historico_solicitacoes h JOIN (SELECT solicitacao_original_id,MIN(id) primeiro FROM historico_solicitacoes WHERE status_novo='Rejeitado' GROUP BY solicitacao_original_id) r ON r.primeiro=h.id SET h.rejeicao_unica=h.solicitacao_original_id;
ALTER TABLE historico_solicitacoes ADD UNIQUE INDEX IF NOT EXISTS rejeicao_confirmada(rejeicao_unica);
ALTER TABLE historico_solicitacoes DROP FOREIGN KEY IF EXISTS historico_solicitacoes_ibfk_1;
ALTER TABLE historico_solicitacoes MODIFY solicitacao_id INT NULL;
ALTER TABLE historico_solicitacoes DROP FOREIGN KEY IF EXISTS fk_historico_solicitacao;
ALTER TABLE historico_solicitacoes ADD CONSTRAINT fk_historico_solicitacao FOREIGN KEY(solicitacao_id) REFERENCES solicitacoes_ongs(id) ON DELETE SET NULL;
ALTER TABLE historico_solicitacoes DROP FOREIGN KEY IF EXISTS fk_historico_controle;
ALTER TABLE historico_solicitacoes ADD CONSTRAINT fk_historico_controle FOREIGN KEY(controle_cnpj_id) REFERENCES controle_cnpj(id);
ALTER TABLE historico_solicitacoes DROP FOREIGN KEY IF EXISTS fk_historico_autor;
ALTER TABLE historico_solicitacoes ADD CONSTRAINT fk_historico_autor FOREIGN KEY(autor_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE solicitacoes_ongs DROP FOREIGN KEY IF EXISTS solicitacoes_ongs_ibfk_2;
ALTER TABLE solicitacoes_ongs DROP FOREIGN KEY IF EXISTS fk_solicitacao_anterior;
ALTER TABLE solicitacoes_ongs ADD CONSTRAINT fk_solicitacao_anterior FOREIGN KEY(solicitacao_anterior_id) REFERENCES solicitacoes_ongs(id) ON DELETE SET NULL;
UPDATE controle_cnpj c JOIN (SELECT controle_cnpj_id,COUNT(*) total FROM historico_solicitacoes WHERE rejeicao_unica IS NOT NULL GROUP BY controle_cnpj_id) h ON h.controle_cnpj_id=c.id SET c.bloqueado_em=COALESCE(c.bloqueado_em,CURRENT_TIMESTAMP),c.motivo_bloqueio='Limite de três rejeições atingido.' WHERE h.total>=3;
ALTER TABLE auditoria DROP FOREIGN KEY IF EXISTS auditoria_ibfk_1;
ALTER TABLE auditoria MODIFY autor_id INT NULL, ADD COLUMN IF NOT EXISTS resultado ENUM('Sucesso','Falha') NOT NULL DEFAULT 'Sucesso', ADD COLUMN IF NOT EXISTS detalhes LONGTEXT NULL CHECK(detalhes IS NULL OR JSON_VALID(detalhes)), ADD COLUMN IF NOT EXISTS requisicao_id CHAR(32) NULL;
ALTER TABLE auditoria DROP FOREIGN KEY IF EXISTS fk_auditoria_autor;
ALTER TABLE auditoria ADD CONSTRAINT fk_auditoria_autor FOREIGN KEY(autor_id) REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE auditoria ADD INDEX IF NOT EXISTS auditoria_autor_data(autor_id,criado_em), ADD INDEX IF NOT EXISTS auditoria_recurso_data(recurso,criado_em);
ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS autor_nome VARCHAR(150) NULL, ADD COLUMN IF NOT EXISTS autor_perfil VARCHAR(20) NULL;
UPDATE auditoria a JOIN usuarios u ON u.id=a.autor_id SET a.autor_nome=u.nome,a.autor_perfil=u.perfil WHERE a.autor_nome IS NULL;
ALTER TABLE solicitacoes_ongs MODIFY controle_cnpj_id INT NOT NULL;
ALTER TABLE historico_solicitacoes MODIFY controle_cnpj_id INT NOT NULL, MODIFY solicitacao_original_id INT NOT NULL;
