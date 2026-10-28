"""DER vetorial em página única, a partir da fonte Mermaid do projeto."""
import re
import heapq
from reportlab.lib.pagesizes import A2, landscape
from reportlab.platypus import Flowable

PAGE = landscape(A2)


class CompactDiagram(Flowable):
    """Visão de chaves em A4; atributos completos nas páginas temáticas."""
    def __init__(self, source, names=None):
        super().__init__()
        self.width = 507
        self.height = 610
        self.source = source
        self.names = names

    def draw(self):
        c = self.canv
        entities = dict(re.findall(r'^    (\w+) \{\n(.*?)^    \}', self.source, re.M | re.S))
        order = ['CONTROLE_CNPJ','SOLICITACOES_ONGS','HISTORICO_SOLICITACOES',
                 'ONGS','USUARIOS_ONGS','USUARIOS',
                 'SEGMENTOS','PROJETOS','AUDITORIA',
                 'OPORTUNIDADES','CANDIDATURAS','HISTORICO_CANDIDATURAS',
                 'DOACOES','REPASSES_PUBLICOS','DOCUMENTOS_REPASSES_PUBLICOS',
                 'LOGIN_TENTATIVAS','MVP_LOCK','SCHEMA_MIGRATIONS']
        ids = {name: f'T{i+1:02}' for i,name in enumerate(order)}
        if self.names:order=list(self.names)
        columns=2 if self.names else 3
        font=8 if self.names else 5.7
        leading=11 if self.names else 6.3
        cell_width=74 if self.names else 46
        stride=94 if self.names else 60
        bw=cell_width*3
        sizes={n: int((30+len(entities[n].strip().splitlines())*leading+2)//3+1) for n in order}
        # Distribui quadros pela altura real dos campos.
        levels=[198]*columns;cells={}
        for n in sorted(order,key=lambda n:-sizes[n]):
            col=max(range(columns),key=lambda i:levels[i])
            top=levels[col];cells[n]=(2+col*stride,top-sizes[n]);levels[col]=top-sizes[n]-4
        if min(levels)<0:raise ValueError('Campos excedem a altura disponível: '+str(min(levels)))
        boxes={n:(x*3,y*3) for n,(x,y) in cells.items()}
        targets = {'controle_cnpj_id':'CONTROLE_CNPJ', 'ong_id':'ONGS',
                   'usuario_id':'USUARIOS', 'autor_id':'USUARIOS',
                   'registrado_por':'USUARIOS', 'enviado_por':'USUARIOS',
                   'segmento_id':'SEGMENTOS', 'projeto_id':'PROJETOS',
                   'oportunidade_id':'OPORTUNIDADES', 'candidatura_id':'CANDIDATURAS',
                   'repasse_id':'REPASSES_PUBLICOS', 'solicitacao_id':'SOLICITACOES_ONGS',
                   'solicitacao_anterior_id':'SOLICITACOES_ONGS'}
        # Caminhos em grade: desvia dos quadros e penaliza corredores já usados.
        blocked=set()
        for n,(x,y) in cells.items():
            blocked.update((a,b) for a in range(x,x+cell_width+1) for b in range(y,y+sizes[n]+1))
        used={}
        def ports(name):
            x,y=cells[name]
            half=sizes[name]//2;mid=cell_width//2
            return [((x-1,y+half),(x,y+half)),((x+cell_width+1,y+half),(x+cell_width,y+half)),
                    ((x+mid,y-1),(x+mid,y)),((x+mid,y+sizes[name]+1),(x+mid,y+sizes[name]))]
        edges=re.findall(r'^    (\w+) ([|o}{-]+) (\w+) : (\w+)',self.source,re.M)
        edges=[e for e in edges if e[0] in cells and e[2] in cells]
        # Relações curtas primeiro, para preservar os caminhos diretos.
        edges.sort(key=lambda e: abs(cells[e[0]][0]-cells[e[2]][0])+abs(cells[e[0]][1]-cells[e[2]][1]))
        for src,card,dst,label in edges:
            starts=ports(dst); ends=ports(src)
            if src==dst:
                starts=starts[:1];ends=ends[2:3]
            goals={p:q for p,q in ends}
            def heuristic(p):return min(abs(p[0]-q[0])+abs(p[1]-q[1]) for q in goals)
            queue=[];cost={};prev={};origins={}
            for p,q in starts:
                cost[p]=0;origins[p]=q;heapq.heappush(queue,(heuristic(p),0,p))
            found=None
            while queue:
                _,g,p=heapq.heappop(queue)
                if g!=cost[p]:continue
                if p in goals:found=p;break
                for step in [(1,0),(-1,0),(0,1),(0,-1)]:
                    n=(p[0]+step[0],p[1]+step[1])
                    if not(0<=n[0]<=169 and 0<=n[1]<=201) or n in blocked:continue
                    ng=g+1+used.get(n,0)*5
                    if ng<cost.get(n,float('inf')):
                        cost[n]=ng;prev[n]=p;origins[n]=origins[p]
                        heapq.heappush(queue,(ng+heuristic(n),ng,n))
            if found is None:raise ValueError('Sem rota para '+src+' / '+dst)
            route=[found]
            while route[-1] in prev:route.append(prev[route[-1]])
            route.reverse()
            for p in route:used[p]=used.get(p,0)+1
            route=[origins[found]]+route+[goals[found]]
            c.setStrokeColorRGB(.26,.53,.49);c.setLineWidth(.65)
            path=c.beginPath();path.moveTo(route[0][0]*3,route[0][1]*3)
            for x,y in route[1:]:path.lineTo(x*3,y*3)
            c.drawPath(path)
            # Ponta de seta junto à tabela referenciada (pai).
            ex,ey=route[-1];px,py=route[-2];vx,vy=ex-px,ey-py
            c.line(ex*3,ey*3,ex*3-vx*3-vy*1.8,ey*3-vy*3+vx*1.8)
            c.line(ex*3,ey*3,ex*3-vx*3+vy*1.8,ey*3-vy*3-vx*1.8)
        for name,(x,y) in boxes.items():
            bh=sizes[name]*3
            c.setFillColorRGB(1,1,1);c.setStrokeColorRGB(.80,.87,.86)
            c.roundRect(x,y,bw,bh,4,fill=1,stroke=1)
            c.setFillColorRGB(.93,.97,.96);c.rect(x+1,y+bh-20,bw-2,19,fill=1,stroke=0)
            c.setFillColorRGB(.03,.50,.44)
            c.setFont('BodyBold',6.3)
            c.drawString(x+5,y+bh-13,ids[name])
            c.setFont('BodyBold',min(8 if self.names else 6.9, (bw-31)/len(name)*1.52))
            c.drawString(x+25,y+bh-13,name)
            fields=[]
            for line in entities[name].strip().splitlines():
                field=line.strip().split('"')[0].strip().split()
                kind,column=field[:2]
                flags=field[2] if len(field)>2 else ''
                suffix=' → '+ids[targets[column]] if 'FK' in flags else ''
                fields.append((flags+' ' if flags else '')+column+' : '+kind+suffix)
            if not fields:
                fields=['Sem chave na fonte documental']
            c.setFillColorRGB(.14,.20,.27);c.setFont('Body',font)
            for j,field in enumerate(fields):
                from reportlab.pdfbase.pdfmetrics import stringWidth
                size=min(font,(bw-12)/max(stringWidth(field,'Body',font),1)*font)
                c.setFont('Body',size)
                assert size>=5.0, (name,field,size)
                assert bh-30-j*leading>=5, (name,field)
                c.drawString(x+6,y+bh-30-j*leading,field)


class FullDiagram(Flowable):
    def __init__(self, source):
        super().__init__()
        self.width = PAGE[0] - 64
        self.height = PAGE[1] - 105
        self.entities = dict(re.findall(r'^    (\w+) \{\n(.*?)^    \}', source, re.M | re.S))
        self.edges = re.findall(r'^    (\w+) ([|o}{-]+) (\w+) : (\w+)', source, re.M)

    def draw(self):
        c = self.canv
        w, h = self.width, self.height
        c.setFillColorRGB(.08, .23, .28)
        c.setFont('BodyBold', 21)
        c.drawString(0, h-22, 'DER completo — ONG Connect')
        c.setFont('Body', 10)
        c.drawString(0, h-42, '18 tabelas • PK: chave primária • FK: chave estrangeira • UK: unicidade • campos conforme DER-ATUAL.mmd')
        c.drawString(0, h-58, 'R01–R23 identificam relações; cardinalidades e significado na legenda. As três tabelas técnicas não possuem vínculos de negócio.')
        order = [
            'CONTROLE_CNPJ', 'SOLICITACOES_ONGS', 'HISTORICO_SOLICITACOES', 'ONGS', 'USUARIOS_ONGS', 'USUARIOS',
            'SEGMENTOS', 'PROJETOS', 'OPORTUNIDADES', 'CANDIDATURAS', 'HISTORICO_CANDIDATURAS', 'AUDITORIA',
            'LOGIN_TENTATIVAS', 'MVP_LOCK', 'SCHEMA_MIGRATIONS', 'DOACOES', 'REPASSES_PUBLICOS', 'DOCUMENTOS_REPASSES_PUBLICOS']
        gap = 32
        bw = (w-5*gap)/6
        bh = 244
        step = 282
        boxes = {}
        for i, name in enumerate(order):
            col, row = i % 6, i // 6
            boxes[name] = (col*(bw+gap), h-92-row*step-bh)
        # Rotas ortogonais nos corredores entre linhas e colunas.
        palette = [(0.10,.48,.43), (.28,.38,.64), (.60,.36,.17), (.49,.32,.58)]
        for i,(src, card, dst, label) in enumerate(self.edges):
            sx, sy = boxes[src]; tx, ty = boxes[dst]
            lane = (i % 9)*2.5+4
            start = (sx+bw, sy+bh-43-(i%5)*9)
            end = (tx, ty+bh-43-(i%5)*9)
            ax = sx+bw+lane; bx = tx-lane
            corridor = min(sy,ty)-8-(i%8)*3
            c.setStrokeColorRGB(*palette[i%4]); c.setLineWidth(.65)
            p=c.beginPath(); p.moveTo(*start)
            if src == dst:
                p.lineTo(ax,start[1]); p.lineTo(ax,sy+16); p.lineTo(sx+bw,sy+16)
            else:
                p.lineTo(ax,start[1]); p.lineTo(ax,corridor); p.lineTo(bx,corridor); p.lineTo(bx,end[1]); p.lineTo(*end)
            c.drawPath(p)
            c.setFillColorRGB(*palette[i%4]); c.setFont('BodyBold',6)
            c.drawString(start[0]+1,start[1]+2,f'R{i+1:02}')
            c.circle(end[0],end[1],1.8,fill=1,stroke=0)
        for name,(x,y) in boxes.items():
            c.setFillColorRGB(1,1,1); c.setStrokeColorRGB(.70,.81,.80)
            c.roundRect(x,y,bw,bh,5,fill=1,stroke=1)
            c.setFillColorRGB(.90,.96,.94); c.rect(x+1,y+bh-27,bw-2,26,fill=1,stroke=0)
            c.setFillColorRGB(.03,.38,.34)
            c.setFont('BodyBold', min(10, (bw-12)/max(len(name),1)*1.55))
            c.drawString(x+7,y+bh-18,name)
            c.setFillColorRGB(.12,.20,.26); c.setFont('Mono',8.4)
            lines = self.entities[name].strip().splitlines()
            for j,line in enumerate(lines):
                # Notas extensas permanecem no dicionário; mantém campos, tipos e chaves.
                field = line.strip().split('"')[0].strip()
                c.drawString(x+7,y+bh-43-j*12,field)
        c.setFont('BodyBold',11); c.setFillColorRGB(.08,.23,.28)
        c.drawString(0,170,'Relações e cardinalidades (origem → destino)')
        for i,(src,card,dst,label) in enumerate(self.edges):
            col,row = i//8,i%8
            x=col*w/3; y=153-row*17
            optional = card.startswith('o|')
            c.setFillColorRGB(*palette[i%4]); c.setFont('BodyBold',7.3)
            c.drawString(x,y,f'R{i+1:02}  {src} → {dst}')
            c.setFont('Body',7.1)
            c.drawString(x+24,y-8,('0..1 : 0..N' if optional else '1 : 0..N')+' • '+label)
        c.setFillColorRGB(.30,.39,.43); c.setFont('Body',8)
        c.drawString(0,0,'Visão integral da fonte documental; comentários de nulabilidade e regras adicionais permanecem no dicionário do relatório.')
