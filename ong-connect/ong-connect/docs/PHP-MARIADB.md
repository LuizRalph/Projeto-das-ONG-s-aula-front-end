# Instalação, operação e persistência

Referência vigente em 26/10/2026. Leia também [README](../README.md) e [backend](BACKEND-COMPARTILHADO.md).

## Instalação limpa

Requisitos: PHP/PDO com `pdo_mysql`, `mbstring`, `fileinfo`; MariaDB com InnoDB e utf8mb4; servidor que execute PHP. Node.js e Chrome são ferramentas de testes, não dependências do usuário do portal.

Na pasta externa, configure `config/database.php` conforme o exemplo, crie o banco e execute:

```powershell
php scripts/install.php
$env:ONG_INITIAL_PASSWORD = Read-Host 'Senha inicial fictícia, com ao menos 12 caracteres'
php scripts/create-user.php admin@example.com 'Administrador acadêmico' admin
Remove-Item Env:ONG_INITIAL_PASSWORD
php -S 127.0.0.1:8080 -t ong-connect
```

Use uma senha de demonstração exclusiva. O comando não deve receber senhas reais copiadas de documentação. No ambiente portátil preparado, `scripts/start-local.ps1` inicia PHP e MariaDB com as extensões necessárias; os binários em `.runtime/` não são distribuídos como parte do código.

## Atualização e backup

Faça backup do banco, arquivos públicos, configuração privada e documentos antes de atualizar. Execute `php scripts/migrate.php`; a versão aplicada é registrada em `schema_migrations`. Não importe o banco local sobre o servidor para sincronizar alterações de interface. Credenciais e uploads são preservados separadamente.

`database/schema.sql` é a base inicial. As sete migrações acrescentam contas/vínculos, agenda, CNPJ/auditoria, detalhes de projetos, repasses/documentos, perfil do voluntário e segmentos. A instalação básica utiliza os JSON iniciais; exemplos adicionais e dados de testes não equivalem ao banco remoto.

## Persistência e segurança

Contas e dados de negócio ficam no MariaDB, inclusive candidaturas e doações. Preferências de foto/filtros podem ficar no navegador. Documentos não são BLOBs: a tabela guarda seus metadados, e o arquivo fica em diretório privado. O download passa por autorização da API.

Login é real, por cookie de sessão. A API verifica perfis, vínculos e CSRF. Não existe conta administrativa padrão com senha pública. `create-user.php` permite criar responsável por ONG com o argumento adicional do ID da ONG; publicação aprovada também pode provisionar esse acesso.

## Consultas principais

| Recurso da API | Finalidade |
|---|---|
| `catalogo`, `total_repasses_publicos` | Consulta pública; o segundo retorna total global recebido |
| `sessao`, `login`, `cadastro`, `perfil`, `logout` | Autenticação e conta |
| `solicitacoes`, `publicar`, `rejeitar`, `ongs`, `projetos`, `oportunidades` | Gestão com permissões |
| `segmentos` | Gestão exclusiva do administrador; lista de seleção no catálogo |
| `candidaturas`, `doacoes` | Participações e contribuições simuladas |
| `repasses_publicos`, `documentos_repasses_publicos`, `contexto_repasses_publicos` | Operação privada de repasses |
| `relatorios` | Financeiro/projetos/voluntariado por período e ONG autorizada |
| `auditoria` | Leitura exclusiva do administrador geral |

Relatórios usam `inicio`, `fim`, `tipo` e `ongId`. Os filtros são validados no servidor. Cancelados não integram o total recebido. API privada não deve ser armazenada em cache público. Consulte [testes](10-TESTES-E-DEMONSTRACAO.md) antes de uma publicação.
