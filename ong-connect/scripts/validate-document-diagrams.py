"""Confere cada campo dentro do retângulo da respectiva tabela nos PDFs."""
from pathlib import Path
import sys
import importlib.util
import re

ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.runtime/pdf-tools'))
import fitz
spec=importlib.util.spec_from_file_location('schema_docs',ROOT/'scripts/schema-documentation.py')
schema=importlib.util.module_from_spec(spec);spec.loader.exec_module(schema)
tables=schema.physical_columns(ROOT)

for filename in ['ONG-Connect-Entrega-Professor.pdf','ONG-Connect-DER-Completo.pdf','ONG-Connect-Documentacao-Academica.pdf']:
    document=fitz.open(ROOT/'entrega'/filename)
    counts={name:0 for name in tables}
    for page in document:
        assert abs(page.rect.width-595.276)<1 and abs(page.rect.height-841.89)<1
        boxes=[drawing['rect'] for drawing in page.get_drawings() if drawing.get('fill')==(1.0,1.0,1.0) and drawing['rect'].width>100 and drawing['rect'].height>25]
        for word in page.get_text('words'):
            name=word[4]
            if name not in tables:continue
            candidates=[box for box in boxes if box.contains(fitz.Rect(word[:4]))]
            if not candidates:continue
            box=min(candidates,key=lambda r:r.width*r.height)
            text=page.get_textbox(box)
            for field in tables[name]:
                assert re.search(r'\b'+re.escape(field)+r'\b',text),(filename,page.number+1,name,field)
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines',[]):
                    for span in line['spans']:
                        bounds=fitz.Rect(span['bbox'])
                        if box.contains(bounds.tl) and box.intersects(bounds):
                            assert (box+(-.5,-.5,.5,.5)).contains(bounds),(filename,name,span['text'])
            counts[name]+=1
    minimum=1 if filename=='ONG-Connect-DER-Completo.pdf' else 2
    assert all(count>=minimum for count in counts.values()),(filename,counts)
    print(filename+': '+str(len(document))+' páginas A4; 18 tabelas e 151 campos conferidos dentro dos quadros.')
