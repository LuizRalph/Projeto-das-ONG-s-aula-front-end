"""Separa a documentação acadêmica do guia interno; preserva o PDF original."""
from pathlib import Path
import importlib.util
import re
import tempfile

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('pdf_base', ROOT / 'scripts/generate-project-pdf.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
diagram_spec = importlib.util.spec_from_file_location('full_der', ROOT / 'scripts/full-database-diagram.py')
diagram = importlib.util.module_from_spec(diagram_spec)
diagram_spec.loader.exec_module(diagram)
DOCS = ROOT / 'ong-connect/docs'
ACA = DOCS / 'academico'
schema_spec = importlib.util.spec_from_file_location('schema_docs', ROOT / 'scripts/schema-documentation.py')
schema_docs = importlib.util.module_from_spec(schema_spec)
schema_spec.loader.exec_module(schema_docs)


def complete_source():
    source=read(ACA / 'DER-ATUAL.mmd')
    physical=schema_docs.physical_columns(ROOT)
    def replace(match):
        name,body=match.groups()
        flags={}
        for line in body.strip().splitlines():
            tokens=line.strip().split('"')[0].split()
            if len(tokens)>2:flags[tokens[1]]=tokens[2]
        rows=[]
        for field,kind in physical[name].items():
            rows.append('        '+kind+' '+field+(' '+flags[field] if field in flags else ''))
        return '    '+name+' {\n'+'\n'.join(rows)+'\n    }'
    return re.sub(r'^    (\w+) \{\n(.*?)^    \}',replace,source,flags=re.M|re.S)


def detailed_views(story):
    groups=[
        ('Catálogo e classificação', ['ONGS','SEGMENTOS','PROJETOS','OPORTUNIDADES']),
        ('Contas e candidaturas', ['USUARIOS','USUARIOS_ONGS','CANDIDATURAS','HISTORICO_CANDIDATURAS']),
        ('Doações, repasses e documentos', ['DOACOES','REPASSES_PUBLICOS','DOCUMENTOS_REPASSES_PUBLICOS']),
        ('Solicitações e controle de CNPJ', ['CONTROLE_CNPJ','SOLICITACOES_ONGS','HISTORICO_SOLICITACOES']),
        ('Auditoria e tabelas técnicas', ['AUDITORIA','LOGIN_TENTATIVAS','MVP_LOCK','SCHEMA_MIGRATIONS'])]
    for title,names in groups:
        story.extend([base.PageBreak(),base.Paragraph(title,base.styles['Section']),
            base.Paragraph('Todos os campos físicos, incluindo datas e atributos de apresentação. PK: chave primária; FK: estrangeira; UK: unicidade. Setas apontam à tabela referenciada. Referências Txx mantêm a identificação da visão geral, inclusive quando a tabela está em outra página.',base.styles['SmallText']),
            diagram.CompactDiagram(complete_source(),names)])
        source=complete_source()
        edges=re.findall(r'^    (\w+) ([|o}{-]+) (\w+) : (\w+)',source,re.M)
        relations=[f'{a} → {b}: '+('0..1 : 0..N' if card.startswith('o|') else '1 : 0..N') for a,card,b,_ in edges if a in names and b in names]
        if relations:
            story.append(base.Paragraph('Cardinalidades: '+'; '.join(relations)+'.',base.styles['SmallText']))


base.model_views=detailed_views


def render_text(text, story, model=False):
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / 'section.md'
        path.write_text(text, encoding='utf-8')
        base.parse_md(path, story, model=model)


def chapter(story, title, text, model=False):
    story.extend([base.PageBreak(), base.Paragraph(title, base.styles['Chapter'])])
    if model:
        story.extend([base.Paragraph('Visão geral das 18 tabelas', base.styles['Section']),
            base.Paragraph('As linhas conectam as tabelas; as setas apontam para a tabela referenciada pela chave estrangeira. Os identificadores T01–T18 junto às FKs complementam a leitura. A autorreferência de SOLICITACOES_ONGS também está representada.', base.styles['SmallText']),
            diagram.CompactDiagram(complete_source()),
            base.Paragraph('Todos os campos físicos estão representados. Os quadros têm altura proporcional ao conteúdo. A versão ampliada e as cardinalidades estão nas páginas seguintes; as tabelas técnicas não possuem vínculos de negócio.', base.styles['SmallText']),base.PageBreak()])
    render_text(text, story, model)


def read(path):
    return path.read_text(encoding='utf-8')


def build(filename, title, subtitle, sections, team=False):
    story = [base.Spacer(1, 30), base.Paragraph('ONG CONNECT', base.styles['Chapter']),
             base.Paragraph(title, base.styles['Chapter']),
             base.Paragraph(subtitle, base.styles['Text']),
             base.Paragraph('Modelagem de Banco de Dados • Revisão: 27/10/2026', base.styles['SmallText'])]
    if team:
        report = read(ACA / 'RELATORIO-ACADEMICO.md')
        names = report.split('## Integrantes do grupo')[1].split('## Resumo')[0]
        names = names.split('Os sete integrantes')[0]
        render_text('## Integrantes do grupo\n' + names, story)
        render_text('**Instituição:** Cruzeiro do Sul — Campus Paulista. **Turma:** Modelagem de Bancos de Dados — terça-feira, noite.\n\n**Apresentação prevista:** 27/10/2026.', story)
    story.extend([base.PageBreak(), base.Paragraph('Sumário', base.styles['Chapter'])])
    toc = base.TableOfContents()
    toc.levelStyles = [base.ParagraphStyle('DeliveryTOC', fontName='Body', fontSize=10, leading=17, spaceBefore=10)]
    story.append(toc)
    for heading, text, model in sections:
        chapter(story, heading, text, model)
    def header(c, doc):
        c.saveState()
        c.setFont('Body', 8)
        c.setFillColor(base.MUTED)
        if doc.page > 1:
            c.drawString(44, base.H - 31, 'ONG CONNECT / ' + title.upper())
        c.drawString(44, 22, 'Revisão documental • 27/10/2026')
        c.drawRightString(base.W - 44, 22, str(doc.page))
        c.restoreState()
    output = ROOT / 'entrega' / filename
    doc = base.Document(str(output), pagesize=base.A4, leftMargin=44, rightMargin=44,
                        topMargin=54, bottomMargin=48, title='ONG Connect — ' + title, author='Grupo ONG Connect')
    doc.addPageTemplates(base.PageTemplate(id='Delivery', frames=[base.Frame(44,48,base.WIDTH,base.H-102,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)], onPage=header))
    doc.multiBuild(story)
    if team:
        standalone = ROOT / 'entrega/ONG-Connect-DER-Completo.pdf'
        c = base.canvas.Canvas(str(standalone), pagesize=base.A4)
        c.setTitle('ONG Connect — DER completo — 18 tabelas')
        c.setFont('Body',8); c.setFillColor(base.MUTED)
        c.drawString(44,base.H-31,'ONG CONNECT / MODELO DE DADOS')
        c.setFont('BodyBold',21); c.setFillColor(base.INK)
        c.drawString(44,base.H-80,'Visão geral das 18 tabelas')
        c.setFont('Body',9)
        c.drawString(44,base.H-104,'As linhas ligam as tabelas; as setas apontam para a tabela referenciada.')
        c.drawString(44,base.H-120,'PK: chave primária. FK: chave estrangeira. Detalhes e cardinalidades no relatório.')
        diagram.CompactDiagram(complete_source()).drawOn(c,44,75)
        c.setFont('Body',8); c.setFillColor(base.MUTED)
        c.drawString(44,22,'Revisão documental • 27/10/2026');c.drawRightString(base.W-44,22,'1')
        c.save()
    print(output)


def generate():
    report = read(ACA / 'RELATORIO-ACADEMICO.md')
    report = report[report.index('## Resumo'):]
    # Retira orientações administrativas; mantém delimitação científica e limitações.
    report = re.sub(r'O enunciado apresenta uma loja.*?\n\n', '', report, flags=re.S)
    report = re.sub(r'O grupo informou que não havia tecnologia.*?\n\n',
        'MariaDB e JSON não são tecnologias recém-lançadas. O recorte estuda a combinação de modelos relacionais e documentais; seu enquadramento como tecnologia emergente na disciplina permanece sujeito à avaliação do professor.\n\n', report, flags=re.S)
    report = report.replace('; o grupo deve confirmar o enquadramento temático com o professor, completar turma/instituição e realizar a apresentação/envio conforme o enunciado.', '.')
    report = report.replace('As referências completas estão em [REFERENCIAS.md](REFERENCIAS.md).', 'As referências completas estão no capítulo 4 deste documento.')
    report = report.replace('[DER atual](../09-ESTRUTURA-DE-DADOS.md)', 'DER apresentado no capítulo 2')
    report = report.replace('[relatório experimental](EXPERIMENTO.md)', 'capítulo 3')
    experiment = read(ACA / 'EXPERIMENTO.md')
    academic_experiment = re.sub(r'## Reproduzir\n.*?(?=## Interpretação)', '', experiment, flags=re.S)
    build('ONG-Connect-Entrega-Professor.pdf', 'Relatório acadêmico',
          'Modelagem híbrida relacional e documental com JSON no MariaDB', [
          ('1. Estudo acadêmico', report, False),
          ('2. Modelo de dados e relacionamentos', read(DOCS / '09-ESTRUTURA-DE-DADOS.md'), True),
          ('3. Experimento e resultados', academic_experiment, False),
          ('4. Referências', read(ACA / 'REFERENCIAS.md'), False)], team=True)
    guide = '''## Finalidade e arquivos

O arquivo ONG-Connect-Entrega-Professor.pdf é a versão destinada à avaliação. Este guia é de apoio aos integrantes. O PDF ONG-Connect-Documentacao-Academica.pdf reúne o material completo e também recebeu os quadros com todos os campos. A versão anterior à atualização integral dos campos está preservada em .runtime/pdf-before-complete-fields.

## Pendências antes da entrega

1. Identificação preenchida: Modelagem de Bancos de Dados — terça-feira, noite; Cruzeiro do Sul — Campus Paulista.
2. Confirmar com o professor o enquadramento do tema como tecnologia emergente. MariaDB e JSON não são novos; a combinação de modelos é o objeto do estudo.
3. Conferir nomes e RGMs e as instruções de envio do enunciado original.
4. Conferir legibilidade, ensaiar a apresentação e enviar o relatório pelo canal indicado pelo professor.

## Divisão sugerida entre os sete integrantes

| Participante | Responsabilidade sugerida |
|---|---|
| 1 | Problema, objetivos e contexto do portal |
| 2 | Fundamentação e delimitação do tema |
| 3 | DER, cardinalidades e integridade |
| 4 | Exemplo JSON e validação na API |
| 5 | Método e execução do experimento |
| 6 | Resultados, planos e limitações |
| 7 | Conclusão, referências e fechamento |

A distribuição é uma sugestão, sem atribuição nominal. Todos devem compreender a conclusão e os limites.

## Respostas para o ensaio

| Pergunta | Resposta essencial |
|---|---|
| Por que manter projeto_id fora do JSON? | A FK preserva o vínculo e a integridade referencial no banco. |
| JSON_VALID valida vagas e agenda? | Valida a sintaxe; regras de negócio e tipos esperados precisam de validação na API. |
| Qual alternativa foi mais rápida? | No registro de 26/10, a mediana relacional foi 2,138 ms e a JSON 3,375 ms. Os índices dos desenhos são diferentes. |
| Qual benefício foi observado? | Inclusão de atributo no documento sem acrescentar coluna nesse desenho; não se demonstrou superioridade geral de desempenho. |
| A comparação equivale a PostgreSQL jsonb? | Não. O experimento foi feito no MariaDB, em ambiente local e com dados sintéticos. |
| Como apresentar se o ambiente falhar? | Mostrar a execução registrada, identificando sua data e sem apresentá-la como execução ao vivo. |

## Atualizar os PDFs

As fontes estão em ong-connect/docs e ong-connect/docs/academico. O script scripts/generate-delivery-pdfs.py gera as duas versões e requer as dependências do gerador original em .runtime/pdf-tools e as fontes Segoe UI do Windows. Edite a identificação e os conteúdos na fonte antes de gerar novamente. O experimento não foi reexecutado nesta revisão; os números correspondem à execução documentada de 26/10/2026.
'''
    build('ONG-Connect-Apoio-Grupo.pdf', 'Guia de apoio ao grupo',
          'Uso interno • preparação, demonstração e operação do projeto', [
          ('1. Organização do grupo e preparação', guide, False),
          ('2. Roteiro de apresentação', read(ACA / 'APRESENTACAO.md'), False),
          ('3. Protocolo experimental e comandos', experiment, False),
          ('4. Requisitos e permissões', read(DOCS / 'requisitos.md'), False),
          ('5. Casos de uso', read(DOCS / 'casos-de-uso.md'), False),
          ('6. Arquitetura', read(DOCS / '02-ARQUITETURA.md'), False),
          ('7. Instalação e operação', read(DOCS / 'PHP-MARIADB.md'), False),
          ('8. Conferência do enunciado', read(ACA / 'MATRIZ-CONFORMIDADE.md'), False)])
    # Atualiza também a documentação completa que permanece aberta no IDE.
    import shutil
    previous=ROOT/'.runtime/pdf-before-complete-fields'
    previous.mkdir(parents=True,exist_ok=True)
    original=ROOT/'entrega/ONG-Connect-Documentacao-Academica.pdf'
    if original.exists() and not (previous/original.name).exists():
        shutil.copy2(original,previous/original.name)
    def original_views(story):
        story.extend([base.PageBreak(),base.Paragraph('Visão geral das 18 tabelas',base.styles['Section']),
            base.Paragraph('Todos os campos físicos do schema e das migrações. Setas apontam para a tabela referenciada; páginas seguintes apresentam os quadros ampliados.',base.styles['SmallText']),
            diagram.CompactDiagram(complete_source())])
        detailed_views(story)
    base.model_views=original_views
    base.generate()


if __name__ == '__main__':
    generate()
