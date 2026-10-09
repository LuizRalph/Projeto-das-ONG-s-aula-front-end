# 05 — Cadastro de ONGs: fluxo completo

## Etapa 1 — Solicitação pública
O visitante abre **Cadastrar minha ONG** na página inicial e informa os dados solicitados (como nome, CNPJ, cidade, responsável, e-mail, telefone e descrição). A validação do formulário deve ser satisfeita antes de registrar o pedido. O pedido recebe status `Pendente`.

## Etapa 2 — Análise inicial
Em **Dashboard → Gerenciar ONGs → Solicitações**, o administrador visualiza os dados e pode:
- **Aprovar**: status `Aprovado`, com abertura do formulário de cadastro preenchido com informações já recebidas.
- **Rejeitar**: solicita justificativa e marca `Rejeitado`.

Aprovação é **pré-aprovação**, não publicação automática.

## Etapa 3 — Solicitar complementação
Ao selecionar **Solicitar informações restantes**, o status passa para `Aguardando complementação`. O sistema exibe link para `pages/complementar-ong.html?pedido=ID`. No protótipo, o link funciona apenas na mesma origem/navegador que contém a solicitação.

## Etapa 4 — Resposta do cadastrante
O formulário complementar recolhe informações institucionais adicionais. Quando enviado com sucesso, grava os campos em `complementacao` e muda o status para `Aguardando revisão`.

## Etapa 5 — Revisão, rascunho e publicação
O administrador escolhe **Continuar cadastro** ou **Revisar e publicar**. O sistema recupera dados iniciais, complementação e eventual rascunho. Pode salvar como rascunho sem publicar ou completar os campos e concluir. Após a publicação, a solicitação passa a `Cadastrada`.

## Seis grupos do cadastro institucional
1. **Identificação**: razão social, nome, sigla, CNPJ, natureza, categoria e outros dados.
2. **Endereço e contato**: localização, e-mail, telefone e canais institucionais.
3. **Responsáveis**: representante legal e contato responsável.
4. **Perfil**: descrição, missão, público atendido, atuação e imagem.
5. **Documentação**: situação documental informada; sem upload de arquivos confidenciais.
6. **Doações e parcerias**: informações institucionais e campos condicionais a parcerias públicas.

## Estados e notificações
| Estado | Significado | Alerta |
|---|---|---|
| `Pendente` | Aguarda análise | Vermelho |
| `Aprovado` | Pré-aprovada | Laranja |
| `Aguardando complementação` | Espera dados adicionais | Laranja |
| `Aguardando revisão` | Complementação enviada | Laranja |
| `Cadastrada` | Cadastro publicado | Nenhum |
| `Rejeitado` | Pedido recusado | Nenhum |

## Observações
Dados permanecem no `localStorage`; não há envio de e-mail, verificação oficial do CNPJ, armazenamento seguro de documentos ou comunicação entre computadores. São limitações do protótipo acadêmico.
