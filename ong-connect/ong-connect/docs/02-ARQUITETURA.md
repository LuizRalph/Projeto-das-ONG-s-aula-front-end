# 02 — Arquitetura atual

Revisado em 26/10/2026. Aplicação multipágina; não é SPA. Frontend sem framework, API PHP/PDO, MariaDB e arquivos privados.

```mermaid
flowchart LR
    UI[HTML CSS JavaScript] -->|HTTP JSON e cookie de sessão| API[PHP e PDO]
    API -->|Transações, FK, SQL e JSON| DB[(MariaDB)]
    API --> FILES[Documentos em diretório privado]
    UI --> PREF[Preferências locais e de sessão]
    SEED[JSON de exemplos] --> CLI[Instalador CLI]
    CLI --> DB
```

`config/`, `database/`, `scripts/` e `storage/` ficam fora da raiz pública `ong-connect/`. A API valida entradas, CSRF e escopo da ONG. Operações críticas usam transações e bloqueios para capacidade, filas, idempotência e controle de CNPJ.

| Componente | Responsabilidade |
|---|---|
| `api/index.php` e `bootstrap.php` | Roteamento, catálogo, validações e PDO |
| `api/security.php` | Sessão, perfis, vínculos e auditoria |
| `api/participation.php` | Candidaturas e doações |
| `api/public-transfers.php` | Repasses e documentos privados |
| `api/reports.php` | Consultas consolidadas, sem gravar relatórios |
| `api/segments.php` | Segmentos controlados |
| `assets/js/app.js`, `navigation.js`, `account.js` | Base pública, navegação e conta |
| `assets/js/reports-admin.js`, `repasses-publicos.js`, `auditoria.js` | Telas com finalidades separadas |

`loadData()` consulta o catálogo e, na versão atual, também pode carregar registros compartilhados para usuários autenticados. A varredura de desempenho identificou dependências excessivas; as otimizações ainda não foram aplicadas. Não se deve descrever cache de dados privados ou navegação persistente como funcionalidades prontas.
