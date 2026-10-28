CREATE TABLE IF NOT EXISTS segmentos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(100) NOT NULL,
 ativo TINYINT NOT NULL DEFAULT 1,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY nome_unico (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO segmentos (nome) SELECT DISTINCT TRIM(categoria) FROM projetos WHERE TRIM(categoria)<>'';
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS segmento_id INT NULL;
UPDATE projetos p JOIN segmentos s ON s.nome=TRIM(p.categoria) SET p.segmento_id=s.id WHERE p.segmento_id IS NULL;
ALTER TABLE projetos ADD CONSTRAINT fk_projeto_segmento FOREIGN KEY (segmento_id) REFERENCES segmentos(id);
