ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dados_voluntario LONGTEXT NULL CHECK (dados_voluntario IS NULL OR JSON_VALID(dados_voluntario));
