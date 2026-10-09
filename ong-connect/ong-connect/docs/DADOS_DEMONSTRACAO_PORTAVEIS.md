# Dados demonstrativos portáteis

O pacote acadêmico inclui **6 ONGs e 17 projetos fictícios**, com valores de arrecadação, metas, voluntários e imagens ilustrativas predefinidas. Há ainda cinco oportunidades fictícias.

## Onde estão os dados

- `data/ongs.json`, `data/projetos.json`, `data/oportunidades.json`: fontes legíveis e editáveis dos exemplos.
- `assets/js/demo-data.js`: cópia dos mesmos dados carregada automaticamente antes de `app.js`, permitindo demonstrar os cadastros sem depender de `fetch()` para os registros iniciais.
- `assets/images/demo/ong-1.svg` a `ong-6.svg` e `projeto-1.svg` a `projeto-17.svg`: imagens ilustrativas locais e predefinidas. Não exigem conexão à internet.

As imagens são **ilustrações SVG**, não fotografias reais de ONGs. Todos os valores e entidades são fictícios.

## Abrir em outro computador

Extraia todo o ZIP e abra `index.html` com Live Server no VS Code (recomendado). O JavaScript carrega os dados demonstrativos diretamente de `demo-data.js`; as imagens são locais. A aplicação não exige transportar o `localStorage` do computador anterior.

Cadastros e edições feitos pelo usuário continuam gravados somente no `localStorage` do navegador e **não são automaticamente transferidos**. Para levar novas alterações a outro computador, é necessário incorporá-las aos dados-base do projeto.

## Como atualizar os dados iniciais

Mantenha os três JSON e o `assets/js/demo-data.js` sincronizados. O arquivo `demo-data.js` contém o objeto `window.ONG_CONNECT_DEMO_DATA` com os mesmos arrays. Os arquivos de imagem referenciados pelo campo `imagem` devem existir em `assets/images/demo/`.

## Validação

Conferir 6 ONGs, 17 projetos, imagens visíveis e navegação entre os cards, incluindo as páginas internas. Os valores podem diferir caso o navegador tenha edições anteriores armazenadas localmente.
