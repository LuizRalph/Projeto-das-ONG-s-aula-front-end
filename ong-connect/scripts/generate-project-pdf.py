"""Gera o PDF acadêmico local a partir da documentação Markdown revisada."""
from pathlib import Path
import sys,re,html,hashlib,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.runtime/pdf-tools'))
import markdown
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.platypus import BaseDocTemplate,PageTemplate,Frame,Paragraph,Spacer,PageBreak,Table,TableStyle,Preformatted,Flowable,KeepTogether
from reportlab.platypus.tableofcontents import TableOfContents

OUT=ROOT/'entrega/ONG-Connect-Documentacao-Academica.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
FONT=Path('C:/Windows/Fonts')
for name,file in [('Body','segoeui.ttf'),('BodyBold','segoeuib.ttf'),('BodyItalic','segoeuii.ttf'),('Mono','consola.ttf')]:pdfmetrics.registerFont(TTFont(name,str(FONT/file)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='BodyBold',italic='BodyItalic',boldItalic='BodyBold')
TEAL=colors.HexColor('#087f70');INK=colors.HexColor('#243345');MUTED=colors.HexColor('#526878');LINE=colors.HexColor('#dce7e6');PALE=colors.HexColor('#edf7f4')
W,H=A4;WIDTH=W-88
styles=getSampleStyleSheet()
styles.add(ParagraphStyle('Text',fontName='Body',fontSize=10,leading=15,textColor=INK,spaceAfter=8,splitLongWords=True))
styles.add(ParagraphStyle('SmallText',parent=styles['Text'],fontSize=8.3,leading=12,textColor=MUTED))
styles.add(ParagraphStyle('Chapter',parent=styles['Text'],fontName='BodyBold',fontSize=21,leading=27,spaceAfter=18,keepWithNext=True))
styles.add(ParagraphStyle('Section',parent=styles['Text'],fontName='BodyBold',fontSize=13.2,leading=18,spaceBefore=13,spaceAfter=8,keepWithNext=True))
styles.add(ParagraphStyle('Subsection',parent=styles['Section'],fontSize=11,leading=16,spaceBefore=8))
styles.add(ParagraphStyle('TableText',parent=styles['Text'],fontSize=8.1,leading=11.5,spaceAfter=0))
styles.add(ParagraphStyle('TableHead',parent=styles['TableText'],fontName='BodyBold',textColor=colors.white))
styles.add(ParagraphStyle('CodeText',fontName='Mono',fontSize=7.1,leading=10,textColor=INK,backColor=colors.HexColor('#f3f6f8'),borderPadding=9,spaceBefore=6,spaceAfter=12))
styles.add(ParagraphStyle('Quote',parent=styles['Text'],leftIndent=12,borderColor=TEAL,borderWidth=1,borderPadding=8,fontSize=9.1,leading=14))

def inline(node):
    result=html.escape(node.text or '')
    for child in node:
        text=inline(child);tag=child.tag
        if tag in ('strong','b'):text='<b>'+text+'</b>'
        elif tag in ('em','i'):text='<i>'+text+'</i>'
        elif tag=='code':text='<font name="Mono">'+text+'</font>'
        elif tag=='a' and child.get('href','').startswith(('https://','http://')):text='<link color="#087f70" href="'+html.escape(child.get('href'),quote=True)+'">'+text+'</link>'
        elif tag=='br':text='<br/>'
        result+=text+html.escape(child.tail or '')
    return result

class Diagram(Flowable):
    """Visões temáticas vetoriais; cardinalidades rotuladas nas conexões."""
    def __init__(self,nodes,edges):super().__init__();self.width=WIDTH;self.height=550;self.nodes=nodes;self.edges=edges
    def draw(self):
        c=self.canv;cw=225;ch=126;positions={}
        for name,fields,col,row in self.nodes:positions[name]=(5+col*(WIDTH-cw-10),410-row*182,cw,ch)
        # Ligações sob as entidades. As setas indicam referência, não fluxo de execução.
        for source,target,label in self.edges:
            a=positions[source];b=positions[target]
            if a[0]==b[0]:
                x=a[0]+a[2]/2;y=a[1];end=b[1]+b[3];points=[(x,y),(x,end)];lx=x+5;ly=(y+end)/2
            elif a[1]==b[1]:
                left,right=(a,b) if a[0]<b[0] else (b,a);x=left[0]+left[2];end=right[0];y=left[1]+left[3]/2;points=[(x,y),(end,y)];lx=(x+end)/2-12;ly=y+7
            else:
                x=a[0]+a[2]/2;y=a[1];ex=b[0]+b[2]/2;ey=b[1]+b[3];mid=(y+ey)/2;points=[(x,y),(x,mid),(ex,mid),(ex,ey)];lx=min(x,ex)+10;ly=mid+5
            c.setStrokeColor(colors.HexColor('#5d8b86'));c.setLineWidth(1)
            path=c.beginPath();path.moveTo(*points[0])
            for p in points[1:]:path.lineTo(*p)
            c.drawPath(path)
            c.setFont('Body',7.5);c.setFillColor(MUTED);c.drawString(lx,ly,label)
        for name,fields,col,row in self.nodes:
            x,y,w,h=positions[name];c.setFillColor(colors.white);c.setStrokeColor(LINE);c.roundRect(x,y,w,h,7,fill=1,stroke=1)
            c.setFillColor(PALE);c.roundRect(x,y+h-28,w,28,7,fill=1,stroke=0)
            c.setFillColor(TEAL);c.setFont('BodyBold',8.1);c.drawString(x+9,y+h-18,name)
            c.setFont('Mono',7.6);c.setFillColor(INK)
            for i,text in enumerate(fields):c.drawString(x+9,y+h-44-i*14,text)

VIEWS=[
('Catálogo e classificação',[
 ('ONGS',['PK id','UK cnpj (opcional)','nome, cidade, contato'],0,0),('SEGMENTOS',['PK id','UK nome','ativo'],1,0),
 ('PROJETOS',['PK id','FK ong_id, segmento_id','titulo, descricao, meta','objetivo e orientacoes'],0,1),
 ('OPORTUNIDADES',['PK id','FK projeto_id','dados: JSON valido'],0,2)],
 [('ONGS','PROJETOS','1 : N'),('SEGMENTOS','PROJETOS','0..1 : N'),('PROJETOS','OPORTUNIDADES','1 : N')]),
('Contas, vínculos e candidaturas',[
 ('USUARIOS',['PK id; UK email','nome, senha_hash, perfil','telefone; dados_voluntario'],0,0),('ONGS',['PK id','nome, cnpj'],1,0),
 ('USUARIOS_ONGS',['PK/FK usuario_id','PK/FK ong_id'],0,1),('OPORTUNIDADES',['PK id; FK projeto_id','dados: agenda, capacidade'],1,1),
 ('CANDIDATURAS',['PK id','FK usuario_id, oportunidade_id','status; dados JSON','ativa: coluna gerada'],0,2),('HISTORICO_CANDIDATURAS',['PK id; FK candidatura_id','FK autor_id','status, justificativa, data'],1,2)],
 [('USUARIOS','USUARIOS_ONGS','1 : N'),('ONGS','USUARIOS_ONGS','1 : N'),('OPORTUNIDADES','CANDIDATURAS','1 : N'),('CANDIDATURAS','HISTORICO_CANDIDATURAS','1 : N')]),
('Recursos privados, repasses e documentos',[
 ('USUARIOS',['PK id','Autor ou apoiador'],0,0),('ONGS',['PK id','Organizacao responsavel'],1,0),
 ('PROJETOS',['PK id; FK ong_id','Identidade do projeto'],0,1),('REPASSES_PUBLICOS',['PK id; FK ong_id','FK projeto_id (opcional)','FK registrado_por','valor, data, prestacao, status'],1,1),
 ('DOACOES',['PK id','FK usuario_id, projeto_id','valor DECIMAL(12,2)','status; chave de reenvio'],0,2),('DOCUMENTOS_REPASSES_PUBLICOS',['PK id; FK repasse_id','FK enviado_por','arquivo, hash, MIME, tamanho','excluido_em (logica)'],1,2)],
 [('ONGS','REPASSES_PUBLICOS','1 : N'),('PROJETOS','DOACOES','1 : N'),('PROJETOS','REPASSES_PUBLICOS','0..1 : N'),('REPASSES_PUBLICOS','DOCUMENTOS_REPASSES_PUBLICOS','1 : N')]),
('Solicitações, controle permanente e auditoria',[
 ('CONTROLE_CNPJ',['PK id; UK cnpj','bloqueado_em, motivo'],0,0),('ONGS',['PK id','Resultado eventual do pedido'],1,0),
 ('SOLICITACOES_ONGS',['PK id; FK controle_cnpj_id','FK ong_id (opcional)','FK solicitacao_anterior_id','cnpj, status'],0,1),('USUARIOS',['PK id','Autor opcional de acoes'],1,1),
 ('HISTORICO_SOLICITACOES',['PK id; FK controle_cnpj_id','FK solicitacao_id (opcional)','FK autor_id (opcional)','rejeicao_unica; justificativa'],0,2),('AUDITORIA',['PK id; FK autor_id (opcional)','recurso, registro_id, acao','resultado; detalhes JSON','nome do autor; requisicao'],1,2)],
 [('CONTROLE_CNPJ','SOLICITACOES_ONGS','1 : N'),('ONGS','SOLICITACOES_ONGS','0..1 : N'),('SOLICITACOES_ONGS','HISTORICO_SOLICITACOES','0..1 : N'),('USUARIOS','AUDITORIA','0..1 : N')])]

def model_views(story):
    extra={
      'Contas, vínculos e candidaturas':'Vínculos adicionais: USUARIOS 1:N CANDIDATURAS e USUARIOS 1:N HISTORICO_CANDIDATURAS (autor da decisão).',
      'Recursos privados, repasses e documentos':'Vínculos adicionais: USUARIOS 1:N DOACOES, USUARIOS 1:N REPASSES_PUBLICOS e USUARIOS 1:N DOCUMENTOS_REPASSES_PUBLICOS.',
      'Solicitações, controle permanente e auditoria':'Vínculos adicionais: CONTROLE_CNPJ 1:N HISTORICO_SOLICITACOES; USUARIOS 0..1:N HISTORICO_SOLICITACOES; SOLICITACOES_ONGS 0..1:N SOLICITACOES_ONGS (tentativa anterior).'
    }
    for title,nodes,edges in VIEWS:
        story.extend([PageBreak(),Paragraph(title,styles['Section']),Paragraph('Visão temática dos principais vínculos. PK: chave primária; FK: estrangeira; UK: unicidade. 1:N indica um para muitos; 0..1 indica vínculo opcional. Campos e relações complementares estão no dicionário e na fonte integral DER-ATUAL.mmd.',styles['SmallText']),Spacer(1,8),Diagram(nodes,edges)])
        if title in extra:story.append(Paragraph(extra[title],styles['SmallText']))
    story.extend([PageBreak(),Paragraph('Tabelas técnicas sem vínculos de negócio',styles['Section']),Paragraph('LOGIN_TENTATIVAS: chave, tentativas e início da janela. MVP_LOCK: chave de controle e marcador da carga. SCHEMA_MIGRATIONS: versão e data de aplicação. Essas tabelas completam as 18 entidades e não possuem relacionamentos de negócio.',styles['Text'])])

def parse_md(path,story,skip_cover=False,model=False):
    source=path.read_text(encoding='utf-8')
    if skip_cover:source=source[source.index('## Resumo'):]
    body=ET.fromstring('<root>'+markdown.markdown(source,extensions=['tables','fenced_code'])+'</root>')
    for node in body:
        tag=node.tag
        if tag=='h1':continue
        if tag in ('h2','h3','h4'):
            story.append(Paragraph(inline(node),styles['Section' if tag=='h2' else 'Subsection']))
        elif tag=='p':story.append(Paragraph(inline(node),styles['Text']))
        elif tag in ('ul','ol'):
            for i,item in enumerate(node):story.append(Paragraph(('• ' if tag=='ul' else str(i+1)+'. ')+inline(item),styles['Text']))
        elif tag=='blockquote':
            story.append(Paragraph(' '.join(inline(e) for e in node),styles['Quote']))
        elif tag=='pre':
            code=node.find('code');language=code.get('class','') if code is not None else '';text=''.join(node.itertext()).rstrip()
            if 'mermaid' in language:
                if model:model_views(story)
                continue
            story.append(Preformatted(text,styles['CodeText'],maxLineLength=93))
        elif tag=='table':
            rows=[]
            for tr in node.findall('.//tr'):
                rows.append([Paragraph(inline(cell),styles['TableHead' if cell.tag=='th' else 'TableText']) for cell in tr])
            if not rows:continue
            count=len(rows[0]);weights=[1]*count
            if count==2:weights=[.62,.38] if 'RGM' in ''.join(node.itertext()) else [.35,.65]
            if count==3:weights=[.29,.45,.26]
            widths=[WIDTH*w/sum(weights) for w in weights]
            table=Table(rows,colWidths=widths,repeatRows=1,hAlign='LEFT')
            table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),TEAL),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f4f8f8')]),('LINEBELOW',(0,0),(-1,-1),.3,LINE)]))
            story.extend([table,Spacer(1,12)])

class Document(BaseDocTemplate):
    def __init__(self,*a,**k):super().__init__(*a,**k);self.counter=0
    def afterFlowable(self,flowable):
        if isinstance(flowable,Paragraph) and flowable.style.name=='Chapter':
            text=flowable.getPlainText()
            if text in ['Sumário','Documentação do projeto']:return
            key='chapter-'+hashlib.sha1(text.encode()).hexdigest()[:12];self.canv.bookmarkPage(key);self.canv.addOutlineEntry(text,key,0,False);self.notify('TOCEntry',(0,text,self.page,key))

def page_header(c,doc):
    c.saveState()
    if doc.page>1:
        c.setFont('Body',8);c.setFillColor(MUTED);c.drawString(44,H-31,'ONG CONNECT  /  DOCUMENTAÇÃO ACADÊMICA');c.setStrokeColor(LINE);c.line(44,H-39,W-44,H-39)
    c.setStrokeColor(LINE);c.line(44,35,W-44,35);c.setFont('Body',8);c.setFillColor(MUTED);c.drawString(44,22,'Versão documental • 26/10/2026');c.drawRightString(W-44,22,str(doc.page));c.restoreState()

def generate():
    doc=Document(str(OUT),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=54,bottomMargin=48,title='ONG Connect — Documentação acadêmica',author='Grupo ONG Connect',subject='Modelagem híbrida relacional e documental com JSON')
    doc.addPageTemplates(PageTemplate(id='Normal',frames=[Frame(44,48,WIDTH,H-102,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=page_header))
    story=[Spacer(1,28),Paragraph('ONG CONNECT',ParagraphStyle('CoverBrand',fontName='BodyBold',fontSize=34,leading=40,textColor=TEAL,spaceAfter=14)),Paragraph('Documentação do projeto',styles['Chapter']),Paragraph('Modelagem híbrida relacional e documental<br/>com JSON no MariaDB',ParagraphStyle('CoverSubtitle',parent=styles['Text'],fontSize=17,leading=24,spaceAfter=18)),Paragraph('Modelagem de Banco de Dados • Apresentação prevista: 27/10/2026',styles['SmallText']),Spacer(1,18),Paragraph('Integrantes do grupo',styles['Section'])]
    report=ROOT/'ong-connect/docs/academico/RELATORIO-ACADEMICO.md';text=report.read_text(encoding='utf-8');team=re.search(r'\| Nome \| RGM \|\n\|---\|---\|\n(.*?)\n\n',text,re.S).group(1)
    rows=[[Paragraph('Nome',styles['TableHead']),Paragraph('RGM',styles['TableHead'])]]
    for line in team.splitlines():
        name,rgm=[v.strip() for v in line.strip('|').split('|')];rows.append([Paragraph(html.escape(name),styles['TableText']),Paragraph(rgm,styles['TableText'])])
    table=Table(rows,colWidths=[WIDTH*.76,WIDTH*.24]);table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),TEAL),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LEFTPADDING',(0,0),(-1,-1),10)]));story.extend([table,Spacer(1,18),Paragraph('Turma: Modelagem de Bancos de Dados — terça-feira, noite. Instituição: Cruzeiro do Sul — Campus Paulista. O grupo possui sete integrantes, conforme o limite do enunciado.',styles['SmallText']),Paragraph('Escopo: documentação acadêmica e demonstração com dados fictícios. A aceitação do recorte como tecnologia emergente deve ser confirmada com o professor; este documento não declara aprovação ou envio da atividade.',styles['Quote']),PageBreak(),Paragraph('Sumário',styles['Chapter'])])
    toc=TableOfContents();toc.levelStyles=[ParagraphStyle('TOCLevel',fontName='Body',fontSize=10,leading=17,leftIndent=0,firstLineIndent=0,spaceBefore=9,textColor=INK)];story.append(toc)
    chapters=[('1. Estudo acadêmico',report,True,False),('2. Modelo de dados e relacionamentos',ROOT/'ong-connect/docs/09-ESTRUTURA-DE-DADOS.md',False,True),('3. Experimento e resultados',ROOT/'ong-connect/docs/academico/EXPERIMENTO.md',False,False),('4. Requisitos e permissões',ROOT/'ong-connect/docs/requisitos.md',False,False),('5. Casos de uso',ROOT/'ong-connect/docs/casos-de-uso.md',False,False),('6. Arquitetura',ROOT/'ong-connect/docs/02-ARQUITETURA.md',False,False),('7. Instalação e operação',ROOT/'ong-connect/docs/PHP-MARIADB.md',False,False),('8. Referências',ROOT/'ong-connect/docs/academico/REFERENCIAS.md',False,False),('9. Matriz de conformidade',ROOT/'ong-connect/docs/academico/MATRIZ-CONFORMIDADE.md',False,False),('10. Roteiro de apresentação',ROOT/'ong-connect/docs/academico/APRESENTACAO.md',False,False)]
    chapters.append(('11. Segurança e melhorias para operação online',ROOT/'ong-connect/docs/academico/SEGURANCA-PRODUCAO.md',False,False))
    for title,path,skip,model in chapters:story.extend([PageBreak(),Paragraph(title,styles['Chapter'])]);parse_md(path,story,skip,model)
    doc.multiBuild(story)
    print(str(OUT))

if __name__=='__main__':generate()
