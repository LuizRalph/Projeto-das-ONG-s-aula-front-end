# Modelagem híbrida relacional e documental com JSON: estudo aplicado ao ONG Connect

**Disciplina:** Modelagem de Banco de Dados — turmas de terça-feira, conforme o enunciado fornecido. **Data da revisão:** 26/10/2026. **Apresentação prevista no PDF:** 27/10/2026.

## Integrantes do grupo

| Nome | RGM |
|---|---|
| Daniel Costa Ferreira | 048098108 |
| Daniel Paulino | 048711152 |
| Dioni Alves Moreira | 047399112 |
| Igor Roehr lúcio de Godoy Strauss | 5947848251 |
| Luiz Carlos Domeneguetti Lourenção | 047147695 |
| Luiz Paulo Gomes do Prado e Silva | 048424170 |
| Raphael Vital | 047147768 |

Os sete integrantes e respectivos RGMs foram informados pelo grupo. Turma: **Modelagem de Bancos de Dados — terça-feira, noite**. Instituição: **Cruzeiro do Sul — Campus Paulista**.

## Resumo

O trabalho estuda o uso de documentos JSON junto a entidades relacionais no MariaDB, utilizando um portal de organizações sociais como caso prático. O domínio contém contas, ONGs, projetos, oportunidades, candidaturas e recebimentos simulados. Os identificadores, vínculos, estados e valores financeiros são modelados em colunas e relações; alguns atributos variáveis e listas ficam em documentos JSON. A comparação usa uma representação tradicional com uma tabela de dias por oportunidade e uma representação documental com a lista no JSON. Um experimento local reproduzível compara equivalência das consultas, extensão do cadastro e validação sintática. O resultado sustenta a flexibilidade do documento para esse exemplo, sem demonstrar superioridade geral de desempenho. O DER e os scripts permitem relacionar a pesquisa à implementação real.

**Palavras-chave:** modelagem de dados; MariaDB; JSON; integridade referencial; dados semiestruturados.

## 1. Problema e objetivo

Oportunidades de voluntariado podem possuir modalidade, local, vários dias de atuação, horários e orientações distintas. A identidade da oportunidade e sua ligação ao projeto são estáveis; parte do cadastro pode evoluir. Como representar essa variedade sem perder os vínculos com projetos e candidaturas?

O objetivo geral é avaliar uma modelagem híbrida de dados relacionais e documentos JSON no contexto do ONG Connect. Os objetivos específicos são descrever fundamentos, explicitar benefícios e custos, apresentar o modelo relacional real, construir um exemplo comparável e interpretar os resultados com limitações.

O enunciado apresenta uma loja como exemplo. Este trabalho utiliza um domínio diferente com entidades, cardinalidades e integridade equivalentes em finalidade didática. Não se presume autorização para ignorar uma orientação adicional do professor que exija especificamente a loja.

## 2. Tecnologia escolhida e delimitação do enquadramento

O recorte proposto é **gestão híbrida relacional/documental com SQL e JSON em um mesmo SGBD**, associado à pesquisa de gestão multimodelo. A literatura sobre bancos multimodelo discute a convivência de modelos para atender à variedade de dados [1]. O projeto demonstra um recorte limitado dessa ideia, não uma implementação própria de SGBD multimodelo nem uma comparação com bancos de grafos ou vetoriais.

O grupo informou que não havia tecnologia previamente definida/aprovada. O recorte foi escolhido por já existir no código e poder ser demonstrado sem inventar funcionalidades. **MariaDB e JSON não são tecnologias recém-lançadas.** A RFC utilizada é de 2017 e a pesquisa citada é de 2019. A documentação cobre a pesquisa e a demonstração dessa abordagem; a aceitação como “tecnologia emergente” no sentido da disciplina permanece dependente do professor. Se ele exigir uma tecnologia diferente, é necessário alterar o estudo e executar outro experimento, não apenas mudar o título.

## 3. Fundamentação bibliográfica e técnica

### 3.1 Variedade de dados e composição de modelos

Lu e Holubová [1] apresentam a gestão multimodelo como uma linha de investigação sobre diferentes representações em uma plataforma de dados. Este estudo usa essa discussão como motivação para combinar um núcleo de vínculos relacionais com alguns documentos, sem tratar todos os tipos de dado como intercambiáveis.

### 3.2 Documentos e validação

JSON é um formato textual para intercâmbio de dados, conforme a RFC 8259 [2]. No caso estudado, objetos descrevem atributos e arrays representam listas. Isso permite guardar informações adicionais sem acrescentar imediatamente uma coluna à tabela; não elimina a necessidade de definir estrutura, significado e políticas de validação.

O MariaDB documenta seu alias `JSON` como `LONGTEXT`, com validação por `JSON_VALID` [3,4]. A implementação do portal usa explicitamente texto e `CHECK`. Validar sintaxe não valida a regra de negócio: por exemplo, `{"vagas":"muitas"}` pode ser JSON sintaticamente correto e continuar inadequado ao cadastro. A API valida campos, tipos e agenda.

### 3.3 Índices e portabilidade

Colunas geradas podem materializar ou derivar valores e suportar índices no MariaDB [5]. O portal usa uma coluna gerada para a unicidade de candidaturas ativas; isso não significa que seus atributos JSON já tenham índices derivados. Tal alternativa não foi implementada como parte deste estudo.

PostgreSQL distingue `json` textual e `jsonb` com outra representação e recursos de indexação [6]. Essa diferença serve como alerta de portabilidade: os resultados deste experimento em MariaDB não são resultados de `jsonb` ou de outro SGBD.

As referências completas estão em [REFERENCIAS.md](REFERENCIAS.md). As afirmações sobre o funcionamento do portal são verificadas no schema, migrações e API, não deduzidas apenas das fontes externas.

## 4. Domínio e aplicação prática

O portal possui três perfis autenticados: administrador geral, responsável por ONG e voluntário. A associação de responsáveis e ONGs é N:N, por `usuarios_ongs`. A ONG organiza projetos; cada projeto oferece oportunidades. Uma candidatura referencia um usuário e uma oportunidade. Valores privados e públicos são separados e não são misturados como se fossem a mesma operação.

O [DER atual](../09-ESTRUTURA-DE-DADOS.md) identifica as tabelas, chaves e cardinalidades. A fonte física combina o schema inicial e sete migrações. O sistema real utiliza:

| Núcleo relacional | Informação documental |
|---|---|
| Projeto, ONG e segmento por FK | Detalhes variáveis da oportunidade em `dados` |
| Usuário, oportunidade e status da candidatura | Dados da inscrição em `candidaturas.dados` |
| Conta, e-mail único e perfil | Informações complementares em `dados_voluntario` |
| Autor, recurso e ação de auditoria | Metadados permitidos em `detalhes` |

Valores financeiros permanecem em `DECIMAL(12,2)`, e não em campos JSON arbitrários. Os arquivos de documentos ficam em armazenamento privado; o banco guarda metadados e vínculos. Preferências locais não substituem os cadastros compartilhados.

### Exemplo real de documento

```json
{
  "titulo": "Apoio nas oficinas",
  "modalidade": "Presencial",
  "local": "Sede fictícia",
  "vagas": 5,
  "diasAtuacao": ["SEG", "QUA"],
  "horarioInicio": "09:00",
  "horarioFim": "11:00",
  "ativa": true
}
```

O documento não contém a única referência do projeto: `oportunidades.projeto_id` é uma FK real. A validação de capacidade/agenda ocorre em transações nas operações relevantes. `JSON_VALID` não deve receber crédito por garantias que são implementadas no PHP ou pelos índices.

## 5. Comparação com abordagem tradicional

O comparador relacional possui uma linha de oportunidade com atributos estáveis e uma tabela associativa `dias`, com uma linha para cada dia. O comparador documental armazena uma linha por oportunidade e um array `diasAtuacao`. Ambos representam os mesmos 2.000 registros sintéticos e retornam 1.000 oportunidades de segunda-feira.

| Critério | Colunas e associação relacional | Documento JSON com IDs relacionais |
|---|---|---|
| Lista de dias | Linhas na associação; índice por dia | Array no documento; extração durante a consulta testada |
| Novo atributo no exemplo | Acrescentar coluna na tabela do experimento | Acrescentar chave no documento |
| Obrigatoriedade e tipos | Podem ser expressos nas colunas/restrições | Exigem validação além da sintaxe do JSON |
| Vínculos de negócio | FKs em colunas | FKs mantidas fora dos documentos no portal |
| Consulta frequente por um atributo | Índice explícito e plano previsível | Pode exigir normalização ou extração indexada |
| Melhor utilização neste caso | Identidade, estados, valores, relações e consultas frequentes | Complementos variáveis e listas de baixo volume |

Essa comparação não implica que todo modelo relacional exija sempre `ALTER TABLE` para extensibilidade: ele também admite tabelas auxiliares ou outros desenhos. O experimento compara dois desenhos explícitos, não todas as alternativas possíveis.

## 6. Método experimental e resultados

O script `scripts/academic-json-comparison.php` cria apenas tabelas temporárias. Não altera cadastros do portal nem o schema permanente. São usados dados determinísticos fictícios, 20 repetições aquecidas por consulta, mesmo SGBD/conexão e verificação da equivalência dos resultados. O código testa também rejeição de JSON inválido e extensão de um atributo nas duas abordagens.

O [relatório experimental](EXPERIMENTO.md) apresenta comandos, planos e valores efetivamente medidos. O resultado bruto fica em `resultados-experimento.json`. Não se apresentam números de produção ou uma medição em PostgreSQL.

O teste inicial mostrou retorno equivalente e mediana inferior para o desenho relacional indexado. No exemplo JSON, o novo atributo foi armazenado sem alterar a tabela, mas a busca na lista examinou os documentos. Assim, **a vantagem sustentada é de flexibilidade no exemplo, não de velocidade**. Essa conclusão deve ser mantida mesmo que o desempenho varie entre execuções.

## 7. Discussão crítica e ameaças à validade

A amostra é pequena, local, sintética e sem usuários concorrentes. A consulta relacional usa índice de dia; o comparador JSON não usa coluna gerada indexada. A diferença de planos faz parte da comparação, mas impede atribuir todo o resultado ao formato de dados. A ordem fixa das consultas, o cache aquecido, o hardware e a versão também limitam a generalização.

Não foram medidos escrita concorrente, custo de backup, tamanho em disco, replicação, JSON indexado ou resultados em outros SGBDs. As tabelas temporárias do microexperimento não possuem FKs entre si; as FKs da aplicação são evidenciadas no DER e nas migrações, e não atribuídas a esse microteste.

No sistema atual, dias e horários são lidos para verificar conflito de agenda. Caso consultas por esses campos cresçam, normalizar a agenda pode ser melhor do que ampliar documentos. A auditoria não preserva cada versão de cada campo, e relatórios por período consideram a situação atual dos registros. Esses limites não devem ser omitidos na demonstração.

## 8. Conclusão

O ONG Connect mostra que documentos JSON podem coexistir com relações explícitas e transações. O desenho preserva as garantias relacionais onde elas são essenciais e permite representar atributos complementares sem multiplicar imediatamente as colunas. O estudo também mostra o custo dessa flexibilidade: validação semântica adicional, consultas que precisam interpretar documentos e cuidado com indexação e portabilidade.

Para este domínio, a escolha recomendada é seletiva: manter identidades, recursos financeiros, permissões e vínculos em estruturas relacionais e avaliar JSON apenas onde a variedade justifica o custo. A demonstração, o DER e o experimento atendem aos componentes técnicos documentados; o grupo deve confirmar o enquadramento temático com o professor, completar turma/instituição e realizar a apresentação/envio conforme o enunciado.
