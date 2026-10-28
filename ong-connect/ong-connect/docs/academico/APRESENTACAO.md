# Roteiro de apresentação e entrega

Material revisado em 26/10/2026. A duração abaixo é apenas uma sugestão de organização; o PDF não impõe tempo ou quantidade de slides.

## Identificação

Título: **Modelagem híbrida relacional e documental com JSON: ONG Connect**. Os sete integrantes e RGMs estão identificados no [relatório acadêmico](RELATORIO-ACADEMICO.md#integrantes-do-grupo). Turma: Modelagem de Bancos de Dados — terça-feira, noite. Instituição: Cruzeiro do Sul — Campus Paulista. O grupo respeita o limite de sete pessoas do enunciado. Data prevista: 27/10/2026. Confirmar o recorte com o professor antes de declarar o requisito temático atendido.

## Sequência sugerida

| Etapa | O que apresentar | Evidência |
|---|---|---|
| 1 | Problema de atributos variados nas oportunidades | Cadastro de vaga e pergunta de pesquisa |
| 2 | Gestão de dados heterogêneos e limites do recorte | Fundamentação e referências |
| 3 | Entidades, cardinalidades e integridade | DER atual, FKs e índices nas migrações |
| 4 | Uso concreto de JSON | Coluna `oportunidades.dados` e validação no PHP |
| 5 | Abordagem tradicional | Tabela da oportunidade e associação de dias |
| 6 | Experimento | Execução do script, igualdade de contagem e planos |
| 7 | Resultados, benefícios e custos | Medianas medidas, validação e extensão do atributo |
| 8 | Conclusão e limites | Quando normalizar, quando usar documento e o que não foi medido |

## Demonstração reproduzível

1. Iniciar o ambiente local e entrar com uma conta fictícia autorizada. Não projetar senhas, configurações privadas ou contas reais.
2. Abrir Projetos e uma oportunidade; mostrar o vínculo com ONG/projeto e a lista de dias.
3. Abrir o DER e explicar o relacionamento usuário–candidatura–oportunidade.
4. Executar `scripts/academic-json-comparison.php` pelo PHP com `pdo_mysql`, seguindo [EXPERIMENTO.md](EXPERIMENTO.md).
5. Mostrar que ambas as consultas encontram 1.000 registros; interpretar os tempos como microexperimento local.
6. Mostrar a rejeição de JSON inválido e a adição de atributo sem alteração de coluna na alternativa documental.
7. Explicar que isso não garante validação semântica e que o comparador relacional possui índice de dia.
8. Se houver tempo, mostrar a separação entre relatórios, operação de repasses e auditoria, como aplicação da persistência e das permissões.

Se a execução falhar, apresentar os resultados registrados como execução anterior, sem fingir demonstração ao vivo. Não alterar o banco do servidor para ensaiar.

## Perguntas que o grupo deve saber responder

- Por que guardar o projeto em FK, em vez de apenas dentro do JSON?
- O que `JSON_VALID` garante e o que continua sendo responsabilidade da API?
- Por que o teste relacional foi mais rápido na execução observada?
- Por que um campo novo sem `ALTER TABLE` não elimina a necessidade de governança do esquema?
- Por que os resultados não se aplicam automaticamente a `jsonb` ou a qualquer banco NoSQL?
- Quais dados continuam no navegador e quais são compartilhados pelo servidor?

## Checklist de entrega

- [ ] Confirmar o enquadramento da tecnologia com o professor.
- [x] Identificar os sete integrantes e RGMs e conferir o limite do grupo.
- [x] Identificar turma e instituição: Modelagem de Bancos de Dados — terça-feira, noite; Cruzeiro do Sul — Campus Paulista.
- [ ] Verificar links, legibilidade do DER e resultados do experimento.
- [ ] Separar relatório, referências, diagrama, código e roteiro no formato escolhido.
- [ ] Excluir credenciais, `.runtime/`, backups, dados pessoais e documentos privados do pacote a compartilhar.
- [ ] Apresentar e enviar conforme data e destinatário do PDF original.

Esta revisão não realizou envio de e-mail nem publicação no servidor.
