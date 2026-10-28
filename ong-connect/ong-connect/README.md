# ONG Connect — projeto acadêmico de banco de dados

Documentação consolidada em **26/10/2026**. Aplicação demonstrativa em HTML, CSS, JavaScript, PHP/PDO e MariaDB. ONGs, pessoas e valores usados na demonstração são fictícios; a plataforma não movimenta dinheiro.

## Trabalho da disciplina

**Tema proposto pelo grupo nesta revisão:** modelagem híbrida relacional e documental com JSON no MariaDB. O estudo investiga a combinação de relacionamentos e transações com atributos semiestruturados, em comparação com uma representação relacional de colunas e tabelas de associação.

O PDF da disciplina solicita pesquisa bibliográfica/técnica, análise crítica, aplicação prática com diagrama entidade-relacionamento, comparação tradicional e apresentação dos resultados. A entrega está organizada em:

1. [Relatório acadêmico: problema, fundamentação, comparação e conclusão](docs/academico/RELATORIO-ACADEMICO.md).
2. [Experimento reproduzível e resultados medidos](docs/academico/EXPERIMENTO.md).
3. [Modelo atual, relacionamentos e dicionário de dados](docs/09-ESTRUTURA-DE-DADOS.md).
4. [Fontes bibliográficas e técnicas](docs/academico/REFERENCIAS.md).
5. [Roteiro de apresentação e demonstração](docs/academico/APRESENTACAO.md).
6. [Matriz de conformidade e pendências da entrega](docs/academico/MATRIZ-CONFORMIDADE.md).

**Delimitação:** JSON e MariaDB são tecnologias maduras. O recorte é uma aplicação de gestão de dados heterogêneos, associada à discussão sobre bancos multimodelo; não se afirma que usar JSON transforme o MariaDB em uma tecnologia recém-criada. O grupo informou que ainda não havia tema definido. A aceitação desse recorte no requisito “tecnologia emergente” depende do professor. Não foi declarada aprovação acadêmica automática.

Segundo o PDF fornecido, a apresentação é em **27/10/2026**, com grupos de até **sete pessoas**, e envio ao endereço informado no enunciado. O grupo possui os sete integrantes identificados abaixo; turma/instituição e envio ainda devem ser completados pelo grupo. Nenhum e-mail foi enviado por esta atualização. A loja virtual da segunda página é identificada como exemplo de domínio; aqui a demonstração utiliza ONGs.

### Integrantes

| Nome | RGM |
|---|---|
| Daniel Costa Ferreira | 048098108 |
| Daniel Paulino | 048711152 |
| Dioni Alves Moreira | 047399112 |
| Igor Roehr lúcio de Godoy Strauss | 5947848251 |
| Luiz Carlos Domeneguetti Lourenção | 047147695 |
| Luiz Paulo Gomes do Prado e Silva | 048424170 |
| Raphael Vital | 047147768 |

## Funcionalidades atuais

- Catálogo público de ONGs, projetos, oportunidades e transparência.
- Login real com sessão PHP, hash de senha, CSRF e autorização por perfil/vínculo.
- Revisão de solicitações de ONG, controle permanente de CNPJ e histórico.
- Projetos com descrições completas e segmentos gerenciados pelo administrador geral.
- Candidaturas compartilhadas, conflito de agenda, fila e histórico de decisões.
- Apoios privados simulados separados dos repasses públicos recebidos.
- Repasses com documentos privados e situação da prestação de contas.
- Relatórios financeiros, de projetos e voluntariado por período e ONG, com CSV.
- Auditoria restrita ao administrador geral, com filtros e detalhes técnicos.

## Persistência e permissões

| Local | Conteúdo atual |
|---|---|
| MariaDB | Contas, vínculos, ONGs, segmentos, projetos, vagas, candidaturas, históricos, doações, repasses, metadados de documentos e auditoria |
| Armazenamento privado fora da raiz pública | Arquivos dos documentos de repasses |
| localStorage | Preferências de foto e visualização; dados antigos não são a fonte dos cadastros atuais |
| sessionStorage | Filtros e estado de navegação da aba |

Administrador geral gerencia o sistema, segmentos e auditoria. Responsável por ONG administra somente organizações vinculadas. Voluntário acompanha seu perfil, candidaturas e simulações. As restrições são verificadas na API, não apenas no menu.

## Instalação e reprodução

Execute na **pasta externa** que contém `config/`, `database/`, `scripts/` e a pasta pública `ong-connect/`:

1. Disponibilize PHP com `pdo_mysql`, `mbstring` e `fileinfo`, e MariaDB/InnoDB/utf8mb4. Ambientes observados: PHP 8.5.12 + MariaDB 11.4.5 local; PHP 8.4 + MariaDB 10.6 no servidor. Isso não equivale a homologação de qualquer combinação de versões.
2. Crie o banco e configure `config/database.php` a partir de `config/database.example.php`, sem versionar credenciais reais.
3. Execute `php scripts/install.php`. O instalador aplica as migrações e não substitui registros existentes. Para atualizar banco já instalado, faça backup e execute `php scripts/migrate.php`.
4. Crie uma conta administrativa com `scripts/create-user.php`, fornecendo a senha por `ONG_INITIAL_PASSWORD`; veja [operação](docs/PHP-MARIADB.md).
5. Sirva somente `ong-connect/`: `php -S 127.0.0.1:8080 -t ong-connect`.

No ambiente portátil já preparado, execute `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1`. O banco local preparado usa porta 3308; não presuma essa porta em outras instalações. Live Server não executa PHP. A instalação limpa utiliza os JSON iniciais e não copia contas, uploads ou o banco do servidor.

### Verificações

```powershell
node scripts/test-shared.cjs
php scripts/academic-json-comparison.php
```

O primeiro comando cria um banco isolado e depende do ambiente PHP/MariaDB local configurado nos scripts. O segundo cria apenas tabelas temporárias na conexão configurada; não altera os registros do portal. Para o PHP portátil, veja [experimento](docs/academico/EXPERIMENTO.md). Foram observadas **42 verificações de integração aprovadas** na versão auditada; isso não substitui executar os testes no computador da apresentação.

## Guia da documentação

| Assunto | Documento |
|---|---|
| Visão e arquitetura | [01 — Visão geral](docs/01-VISAO-GERAL.md), [02 — Arquitetura](docs/02-ARQUITETURA.md) |
| Banco, DER e regras | [09 — Estrutura de dados](docs/09-ESTRUTURA-DE-DADOS.md), [Requisitos](docs/requisitos.md), [Casos de uso](docs/casos-de-uso.md) |
| Instalação e API | [PHP/MariaDB](docs/PHP-MARIADB.md), [Backend compartilhado](docs/BACKEND-COMPARTILHADO.md) |
| Telas e fluxos | [03 — Público](docs/03-PAGINAS-PUBLICAS.md), [04 — Painel](docs/04-PAINEL-ADMINISTRATIVO.md), [05 — ONGs](docs/05-CADASTRO-DE-ONGS.md), [06 — Projetos](docs/06-PROJETOS-E-DOACOES.md), [07 — Voluntariado](docs/07-VOLUNTARIADO.md), [08 — Transparência](docs/08-TRANSPARENCIA.md) |
| Testes e limites | [10 — Testes](docs/10-TESTES-E-DEMONSTRACAO.md), [11 — Limitações](docs/11-LIMITACOES.md), [12 — Evoluções](docs/12-EVOLUCOES.md) |
| Relatórios de implantação e validação | [Relatórios](docs/relatorios/) |

Documentos marcados como históricos não definem o comportamento vigente. O estado atual do banco é `database/schema.sql` **mais** as migrações `001` a `007`; o schema inicial isolado não representa toda a aplicação. Esta revisão documental e o experimento são locais; não implicam publicação ou alteração do banco remoto.
