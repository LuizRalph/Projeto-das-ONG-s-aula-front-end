# ONG Connect

Projeto acadêmico de uma plataforma para conectar ONGs, projetos e voluntários. Inclui catálogo público, cadastro e aprovação de ONGs, candidaturas, apoios simulados, transparência e relatórios administrativos.

**Tecnologias:** HTML, CSS, JavaScript, PHP/PDO e MariaDB. Os dados demonstrativos são fictícios e a aplicação não movimenta dinheiro. Python é usado somente para gerar documentação e diagramas.

## Estrutura do repositório

```text
ong-connect/                 # Pasta de trabalho da aplicação
  config/                    # Modelo de configuração privada
  database/                  # Schema e migrações
  scripts/                   # Instalação, testes e documentação
  entrega/                   # PDFs acadêmicos
  ong-connect/               # Única pasta pública do servidor
    api/
    assets/
    dashboard/
    pages/
    docs/
```

## Executar localmente

Requer PHP com `pdo_mysql`, `mbstring` e `fileinfo`, e MariaDB. Os testes JavaScript usam Node.js 22 ou superior. Consulte os ambientes documentados no [guia completo](ong-connect/ong-connect/README.md).

1. Clone o repositório e entre na pasta externa `ong-connect`.
2. Copie `config/database.example.php` para `config/database.php` e configure a conexão. O modelo também aceita `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` e `DB_PASSWORD`.
3. Crie um banco vazio com o nome configurado e execute `php scripts/install.php`.
4. Crie o administrador seguindo o [guia de operação](ong-connect/ong-connect/docs/PHP-MARIADB.md). Não publique senhas nem arquivos de configuração privada.
5. Execute `php -S 127.0.0.1:8080 -t ong-connect` e abra `http://127.0.0.1:8080`.

Sirva somente a pasta pública interna. O Live Server não executa o backend PHP.

## Verificações

Execute a partir da pasta externa `ong-connect`:

```sh
node scripts/test-client.cjs
node scripts/test-shared.cjs
```

O teste de integração cria um banco com prefixo `ong_connect_test_` e o preserva para inspeção. Use uma instância local descartável de MariaDB e uma conta autorizada a criar bancos. O teste usa o PHP do PATH ou o executável indicado por `PHP_BINARY`; esse PHP deve ter as extensões necessárias habilitadas. No Windows, o ambiente portátil existente continua sendo reconhecido automaticamente quando `PHP_BINARY` não está definido.

O GitHub Actions verifica a sintaxe PHP e JavaScript e executa os testes de cliente e integração com MariaDB. Os testes de navegador são opcionais e não fazem parte desse workflow inicial.

## Documentação

- [Instalação, funcionalidades e equipe](ong-connect/ong-connect/README.md)
- [Arquitetura](ong-connect/ong-connect/docs/02-ARQUITETURA.md)
- [Estrutura do banco](ong-connect/ong-connect/docs/09-ESTRUTURA-DE-DADOS.md)
- [Relatório acadêmico](ong-connect/ong-connect/docs/academico/RELATORIO-ACADEMICO.md)
- [PDFs da entrega](ong-connect/entrega/)

Credenciais, uploads, logs e ambientes portáteis são locais e ficam fora do versionamento.

## Gerar documentação (opcional)

Na pasta externa `ong-connect`, instale as ferramentas com `python -m pip install -r requirements-docs.txt` e execute `python scripts/generate-delivery-pdfs.py`. Para conferir os diagramas, execute `python scripts/validate-document-diagrams.py`.

O gerador de PDFs atual usa as fontes Segoe UI e Consolas de `C:/Windows/Fonts`; portanto, essa geração ainda exige Windows. Isso não restringe a execução do site nem os testes de integração em Linux.
