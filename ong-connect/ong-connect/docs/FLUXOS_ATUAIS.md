# Fluxos atuais do ONG Connect

## Cadastro de ONG
1. Visitante solicita cadastro na página pública; registro local `Pendente`.
2. Administrador aprova (`Aprovado`) ou rejeita (`Rejeitado`, com motivo).
3. Aprovação abre formulário com nome, cidade, e-mail, descrição e outros dados iniciais reaproveitados.
4. **Solicitar informações restantes** muda para `Aguardando complementação` e apresenta link demonstrativo `pages/complementar-ong.html?pedido=...`.
5. Solicitante complementa na mesma origem/navegador; status `Aguardando revisão`.
6. Administrador continua, salva rascunho ou conclui e publica; status `Cadastrada`.

Não existe envio de e-mail, conta de solicitante nem autorização segura. O link não funciona entre computadores distintos sem backend.

## Interface administrativa
Os painéis Solicitações e Cadastrar ONG começam recolhidos; ONGs cadastradas começa expandido. Contadores: vermelho para `Pendente`; laranja para `Aprovado`, `Aguardando complementação`, `Aguardando revisão`. O cadastro institucional possui seis grupos e não armazena documentos sensíveis.

## Projetos e doações
Projetos vinculados a ONGs. Contribuições `Simulada` são armazenadas localmente; os valores apresentados somam bases fictícias JSON e registros locais. Não há pagamento nem comprovante financeiro real.

## Voluntariado
Inscrição, análise, justificativa e histórico local. Rejeição é definitiva na interface atual; histórico não é auditável juridicamente.

## Transparência
Indicadores consolidados e agrupamento por área de atuação. Não existe módulo de registro de repasses públicos; a seção correspondente informa ausência de dados. Distribuição por área não representa despesas comprovadas.

## Segurança
Interface de login e perfil demonstrativa, sem autenticação/autorização efetiva. Não utilizar com dados reais.
