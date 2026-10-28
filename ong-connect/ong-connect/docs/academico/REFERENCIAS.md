# Referências bibliográficas e técnicas

Consultadas em **26/10/2026**. Fontes primárias; paráfrases próprias, sem reprodução integral dos textos. Os números correspondem às citações do relatório.

1. **LU, Jiaheng; HOLUBOVÁ, Irena.** *Multi-model Databases: A New Journey to Handle the Variety of Data*. ACM Computing Surveys, v. 52, n. 3, artigo 55, 2019. DOI: [10.1145/3323214](https://doi.org/10.1145/3323214). [Registro e manuscrito dos autores na Universidade de Helsinki](https://researchportal.helsinki.fi/en/publications/multi-model-databases-a-new-journey-to-handle-the-variety-of-data/). Fundamenta o contexto de gestão de dados variados; não certifica a implementação do ONG Connect.
2. **BRAY, T. (ed.); IETF.** *The JavaScript Object Notation (JSON) Data Interchange Format*. RFC 8259, dezembro de 2017. [Texto oficial](https://www.rfc-editor.org/rfc/rfc8259). Referência para o formato JSON; sua data evidencia que JSON não é uma criação recente.
3. **MARIADB.** *JSON Data Type*. Documentação oficial. [Página](https://mariadb.com/docs/server/reference/data-types/string-data-types/json). Referência do armazenamento e da diferença em relação a outras implementações.
4. **MARIADB.** *JSON_VALID*. Documentação oficial. [Página](https://mariadb.com/docs/server/reference/sql-functions/special-functions/json-functions/json_valid). Referência de validação sintática.
5. **MARIADB.** *Generated Columns*. Documentação oficial. [Página](https://mariadb.com/docs/server/reference/sql-statements/data-definition/create/generated-columns). Referência para colunas geradas e alternativas de indexação.
6. **POSTGRESQL GLOBAL DEVELOPMENT GROUP.** *JSON Types*, documentação PostgreSQL 16, seção 8.14. [Página da versão consultada](https://www.postgresql.org/docs/16/datatype-json.html). Utilizada somente para discutir diferenças de implementação e portabilidade; PostgreSQL não foi executado no experimento.

## Fontes primárias do próprio projeto

- Enunciado fornecido: **Projeto da disciplina — Modelagem de Banco de Dados — Terças (1).pdf**, duas páginas. Define os componentes da atividade, a data, o limite de integrantes e o exemplo de loja. O arquivo permanece no local disponibilizado pelo usuário; não é redistribuído nem convertido em instrução para envio de e-mail.
- `database/schema.sql` e `database/migrations/001...007`: evidência do modelo físico.
- `ong-connect/api/`: evidência das regras efetivamente verificadas no backend.
- `scripts/academic-json-comparison.php` e [resultado bruto](resultados-experimento.json): evidência do experimento.
- `scripts/test-shared.cjs` e suítes chamadas: evidência dos testes funcionais descritos, separados do experimento de modelagem.

O formato acima é uma referência identificável e verificável; não se declara conformidade formal com um padrão bibliográfico que não foi exigido no PDF. Datas e critérios de acesso devem ser revistos se a equipe atualizar o estudo.
