# Proteções P0

## Instalação e atualização

Faça backup do banco e publique o conjunto completo de alterações, incluindo a migração `database/migrations/008_security_p0.sql`, os arquivos PHP, `pages/ativar-conta.html` e os JavaScripts. Durante a atualização, suspenda temporariamente as operações de autenticação e cadastro até concluir `php scripts/migrate.php` na pasta externa do projeto. A migração cria tabelas sem apagar usuários ou hashes existentes. Não aplique apenas os arquivos de frontend.

O código local não publica automaticamente no servidor. Na hospedagem, execute com o PHP e a configuração de banco usados pela aplicação.

## Limites

Os contadores persistem em MariaDB e são compartilhados entre processos. São consumidos antes de verificar senhas ou gravar cadastros, inclusive em tentativas inválidas:

| Operação | Limite |
| --- | --- |
| Cadastro de voluntário | 10 por IP por hora |
| Solicitação de ONG | 20 por IP por hora |
| Login | 100 por IP e 10 por conta/par IP-conta em 15 minutos |
| Ativação | 20 por IP em 15 minutos |
| Reemissão de convite | 20 por administrador por hora |

As janelas são fixas, iniciadas na primeira tentativa. Um login válido não zera os limites. Respostas 429 incluem `Retry-After` em segundos. O endereço vem exclusivamente de `REMOTE_ADDR`: cabeçalhos de proxy enviados pelo cliente não são aceitos. Se houver proxy reverso, configure a resolução de IP real no servidor somente para proxies confiáveis; caso contrário, todos os visitantes podem compartilhar o limite do proxy. Ajuste as cotas após medir o uso legítimo.

Agende `php scripts/security-maintenance.php` a cada hora para remover contadores expirados e convites expirados há mais de sete dias. A limpeza é limitada a 10 mil registros por tabela por execução e não remove contas. A expiração é aplicada mesmo antes da limpeza.

## Senhas

Novas senhas preservam espaços, exigem 12 a 200 caracteres e aceitam no máximo 1024 bytes, sem bytes nulos. Argon2id é preferido quando compilado no PHP. Como alternativa, um hash SHA-384 codificado em base64 (64 bytes) é entregue ao bcrypt, com marcador de versão `{SHA384}`, evitando truncamento de senhas longas. Nunca remova esse marcador de hashes armazenados.

Hashes bcrypt antigos permanecem válidos para entradas de até 72 bytes e são atualizados após login válido. Entradas maiores são rejeitadas nesses hashes, pois não é possível recuperar nem distinguir o sufixo original. Contas legadas nessa situação precisam de redefinição assistida; recuperação pública de senha não faz parte desta entrega. O script `create-user.php` também usa a nova política.

## Convites de ONG

Ao publicar uma ONG com novo responsável, a conta nasce bloqueada para login até a ativação. O painel apresenta um link com validade de 24 horas. O administrador deve entregá-lo ao responsável por canal privado. Não há envio automático de e-mail nem verificação da titularidade do endereço.

O token possui 256 bits aleatórios; o banco armazena somente seu SHA-256. Ele fica no fragmento da URL, é removido da barra pelo JavaScript e é enviado por POST com CSRF quando o responsável escolhe a senha. Não aparece no catálogo nem na auditoria. A ativação é atômica e de uso único. Trate o convite como segredo até sua utilização.

O botão **Reemitir convite de ativação**, no painel de ONGs, atende somente contas pendentes. Reemitir invalida imediatamente o link anterior. Contas já existentes e ativas mantêm suas senhas; vínculos adicionais não as redefinem. Senhas iniciais distribuídas antes desta atualização não são automaticamente revogadas: planeje a troca assistida dessas credenciais.

## Verificação

Para executar toda a rotina local com relatórios, consulte o [guia de QA local](QA-LOCAL.md) e use `scripts/qa-local.ps1`. O guia também inclui os cenários manuais de ativação e reemissão.

Execute `php scripts/test-security-p0.php` para verificar senhas e `node scripts/test-shared.cjs` para integração com banco descartável. A integração também exercita limites, convites e regressões dos fluxos existentes. Use a configuração local de testes, nunca credenciais do banco publicado.
