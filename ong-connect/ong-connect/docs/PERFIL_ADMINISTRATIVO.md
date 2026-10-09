# Perfil administrativo demonstrativo

- Logotipo leva ao dashboard administrativo.
- Visualizar site abre a página pública em outra aba.
- Menu lateral não inclui Voltar ao site.
- Menu de usuário mostra a hierarquia Administrador geral (fixa nesta demonstração).
- Minhas informações permite editar nome, e-mail, telefone e foto, persistidos em `localStorage` sob `ongconnect_demo_account_v1`.
- Sair da conta retorna ao portal público e remove apenas a chave demonstrativa de sessão, sem apagar dados.
- **Não existe autenticação nem autorização real**. O acesso direto ao painel permanece possível.
- Para implementar múltiplos perfis reais será necessário backend, usuários autenticados, papéis vinculados a ONGs e autorização no servidor.
