"""Lê colunas do schema e das migrações sem acessar banco ou configurações."""
import re


def split_sql(text, separator=','):
    result=[];start=0;depth=0;quote=None
    for i,ch in enumerate(text):
        if quote:
            if ch==quote and (i==0 or text[i-1]!='\\'):quote=None
        elif ch in "'\"`":quote=ch
        elif ch=='(':depth+=1
        elif ch==')':depth-=1
        elif ch==separator and depth==0:
            result.append(text[start:i].strip());start=i+1
    result.append(text[start:].strip())
    return result


def physical_columns(root):
    tables={}
    paths=[root/'database/schema.sql']+sorted((root/'database/migrations').glob('*.sql'))
    for path in paths:
        sql=re.sub(r'--[^\n]*','',path.read_text(encoding='utf-8'))
        for stmt in split_sql(sql,';'):
            create=re.match(r'CREATE TABLE(?: IF NOT EXISTS)?\s+(\w+)\s*\((.*)\)\s*ENGINE',stmt,re.I|re.S)
            alter=re.match(r'ALTER TABLE\s+(\w+)\s+(.*)',stmt,re.I|re.S)
            if create:
                name,body=create.groups();cols=tables.setdefault(name.upper(),{})
                definitions=split_sql(body)
            elif alter:
                name,body=alter.groups();cols=tables.setdefault(name.upper(),{})
                definitions=[]
                for action in split_sql(body):
                    match=re.match(r'(?:ADD COLUMN(?: IF NOT EXISTS)?|MODIFY(?: COLUMN)?)\s+(.*)',action,re.I|re.S)
                    if match:definitions.append(match.group(1))
            else:continue
            for definition in definitions:
                match=re.match(r'(\w+)\s+((?:VAR)?CHAR(?:\([^)]*\))?|(?:LONG)?TEXT|BIGINT|TINYINT|INT|DECIMAL\([^)]*\)|TIMESTAMP|DATETIME|DATE|ENUM\([^)]*\))',definition,re.I|re.S)
                if match:
                    field,kind=match.groups()
                    if field.upper() in ('PRIMARY','FOREIGN','UNIQUE','INDEX','CONSTRAINT','CHECK'):continue
                    cols[field]=kind.upper() if not kind.upper().startswith('ENUM') else 'ENUM'
    tables.setdefault('SCHEMA_MIGRATIONS',{'versao':'VARCHAR(100)','aplicado_em':'TIMESTAMP'})
    return tables
