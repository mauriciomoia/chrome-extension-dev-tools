# Strategi - Ferramentas para Desenvolvedores

Esta é uma extensão para o Google Chrome desenvolvida para apoiar a equipe de desenvolvimento da Strategi. A extensão integra-se com o ClickUp e a API Gemini para fornecer ferramentas e informações úteis diretamente no navegador.

## Funcionalidades

*   **Integração com ClickUp:**
    *   Exibe informações detalhadas da tarefa do ClickUp, como nome e status, quando você está em uma página de tarefa.
    *   Mostra a documentação relevante para o status atual da tarefa, facilitando o acesso a diretrizes e procedimentos.
    *   **Visualização de Documentação de Status:** Ao carregar uma tarefa do ClickUp, a extensão agora busca e exibe o conteúdo da documentação de status associada, convertendo o conteúdo de Markdown para HTML para uma leitura mais amigável.
    *   A seção de documentação de status é **rolável verticalmente** para acomodar conteúdos extensos, e o texto **quebra linha horizontalmente** para melhor visualização.

*   **Inteligência Artificial com Gemini:**
    *   **Avaliar Descrição:** Utiliza a API do Gemini para analisar a descrição da tarefa e fornecer sugestões de melhoria.
    *   **Gerar Changelog:** Gera automaticamente uma entrada de changelog concisa com base nos detalhes da tarefa.

## Instalação

Como esta é uma extensão de desenvolvimento, ela precisa ser carregada manualmente no Chrome. Siga os passos abaixo:

1.  **Clone ou baixe este repositório** para o seu computador.
2.  **Abra o Google Chrome** e vá para a página de extensões. Você pode digitar `chrome://extensions` na barra de endereço.
3.  **Ative o "Modo do desenvolvedor"** no canto superior direito da página.
4.  **Clique no botão "Carregar sem compactação"** que aparece no canto superior esquerdo.
5.  **Selecione a pasta do projeto** (a pasta que você clonou ou baixou).
6.  A extensão "Strategi - DEV Tools" deverá aparecer na sua lista de extensões e estará pronta para uso.

## Configuração

Após a instalação, você precisará configurar suas chaves de API:

1.  **Clique no ícone da extensão** na barra de ferramentas do Chrome.
2.  **Clique no ícone de engrenagem (Configurações)** para abrir a página de opções.
3.  **Insira suas chaves de API** para o ClickUp e o Gemini nos campos correspondentes.
4.  **Salve as configurações.**

Com as chaves salvas, a extensão estará totalmente funcional.
