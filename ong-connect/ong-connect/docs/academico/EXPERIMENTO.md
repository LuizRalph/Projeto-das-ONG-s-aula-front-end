# Experimento: associação relacional versus array JSON

Executado localmente em **26/10/2026**; data e fuso da execução constam no [resultado bruto](resultados-experimento.json). Script: `scripts/academic-json-comparison.php`, na pasta externa.

## Perguntas verificadas

1. As duas representações retornam o mesmo conjunto esperado de oportunidades por dia?
2. Um atributo adicional pode ser colocado no JSON sem acrescentar coluna?
3. O banco rejeita sintaxe JSON inválida quando existe `CHECK(JSON_VALID(...))`?
4. Como se comportam os planos e tempos das duas consultas específicas?

## Ambiente e dados

- PHP **8.5.12**, MariaDB **11.4.5-MariaDB**, conexão local PDO; sem acesso ao banco remoto.
- 2.000 oportunidades fictícias em cada desenho, IDs de 1 a 2.000.
- IDs ímpares têm SEG/QUA e pares têm TER/QUI, resultando em 4.000 linhas de dias na alternativa normalizada.
- Mesmos títulos, capacidades e distribuição; cada consulta por SEG encontra 1.000 oportunidades.
- Uma consulta inicial de aquecimento, seguida de 20 repetições medidas por `hrtime`.
- Mediana das posições centrais ordenadas e p95 pelo método da posição 19 em 20 (nearest rank).
- Tabelas `TEMPORARY` com InnoDB e prefixo `academic_`, restritas à conexão. Não modificam schema nem registros permanentes; desaparecem ao fechar a conexão. O código não usa `DROP DATABASE` nem cargas no portal.

## Desenhos comparados

```sql
-- Relacional: colunas e associação para os dias.
CREATE TEMPORARY TABLE academic_rel (
  id INT PRIMARY KEY, titulo VARCHAR(100), vagas INT NOT NULL
) ENGINE=InnoDB;
CREATE TEMPORARY TABLE academic_dias (
  oportunidade_id INT NOT NULL, dia CHAR(3) NOT NULL,
  PRIMARY KEY(oportunidade_id,dia), INDEX por_dia(dia,oportunidade_id)
) ENGINE=InnoDB;

-- Documental dentro do mesmo SGBD.
CREATE TEMPORARY TABLE academic_json (
  id INT PRIMARY KEY,
  dados LONGTEXT NOT NULL CHECK(JSON_VALID(dados))
) ENGINE=InnoDB;
```

As tabelas temporárias não implementam FKs entre si. A demonstração das FKs pertence ao [modelo real do portal](../09-ESTRUTURA-DE-DADOS.md), que contém a relação oportunidade–projeto e os demais vínculos. Não se atribui ao microexperimento uma garantia que ele não testa.

```sql
SELECT COUNT(*)
FROM academic_rel o
JOIN academic_dias d ON d.oportunidade_id=o.id
WHERE d.dia='SEG';

SELECT COUNT(*)
FROM academic_json
WHERE JSON_CONTAINS(dados,'"SEG"','$.diasAtuacao');
```

## Resultados da execução registrada

| Medida | Relacional indexado | JSON sem índice derivado |
|---|---:|---:|
| Registros retornados na contagem | 1000 | 1000 |
| Mínimo por consulta | 2.022 ms | 3.205 ms |
| Mediana por consulta | 2.138 ms | 3.375 ms |
| p95 por consulta | 2.68 ms | 4.236 ms |
| Repetições medidas | 20 | 20 |

O `EXPLAIN` foi gravado no JSON dos resultados. Na execução registrada, a alternativa relacional utilizou o índice `por_dia` e lookup pela PK; a alternativa documental realizou leitura integral para avaliar o array. A medição não é evidência de que todo uso de JSON é lento: é o resultado destes desenhos e desta consulta.

O teste também confirmou:

- JSON malformado rejeitado pelo banco: **sim**.
- Chave `acessibilidade` acrescentada via `JSON_SET`, sem `ALTER TABLE`: **sim**.
- Coluna `acessibilidade` acrescentada ao desenho relacional com `ALTER TABLE`, seguida de atualização: executado no ambiente temporário.

A facilidade de adicionar a chave foi observada funcionalmente, não como um benchmark de custo de migração. Outros desenhos relacionais também poderiam tratar extensibilidade de outras formas.

## Reproduzir

Com PHP disponível no PATH e extensões carregadas:

```powershell
php scripts/academic-json-comparison.php
```

No ambiente portátil preparado, execute na pasta externa:

```powershell
& ".runtime/php/php.exe" -n -d extension_dir=.runtime/php/ext -d extension=pdo_mysql -d extension=mbstring scripts/academic-json-comparison.php
```

A conexão usa a configuração privada já existente ou as variáveis de ambiente suportadas pelo projeto. O usuário SQL precisa de permissão para criar tabelas temporárias. Não é preciso substituir o banco da aplicação. O script aborta com erro se a equivalência, a validação ou a extensão do atributo falhar.

## Interpretação e limites

O benefício observado do documento é a flexibilidade da representação complementar; a consulta relacional indexada foi mais rápida nesta execução. Não se generalizam os números para PostgreSQL, MySQL, produção, outro volume ou JSON com coluna gerada indexada.

A avaliação é local, aquecida, com uma distribuição artificial, 20 repetições e ordem fixa dos desenhos. Não mede rede, múltiplos usuários, escrita concorrente, custo em disco ou migração real de milhares de linhas permanentes. O índice na associação e a ausência de índice derivado no documento são diferenças explícitas. Cache e ruído do computador afetam as medições.

O resultado não prova que o portal deve ser refeito nem que foi implementado um novo SGBD. Ele fornece uma comparação pequena e reproduzível para discutir escolhas de modelagem.
