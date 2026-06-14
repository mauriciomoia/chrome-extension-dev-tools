# Strategi - DEV Tools

Esta é uma extensão para o Google Chrome desenvolvida para apoiar a equipe de desenvolvimento da **Strategi**. A extensão integra-se com o ClickUp, GitHub e a API do Google Gemini para fornecer ferramentas e informações úteis diretamente no navegador.

---

## 🚀 Funcionalidades

### 📋 Integração com ClickUp
Quando você acessa a página de uma tarefa no ClickUp, a extensão disponibiliza as seguintes ferramentas contextuais:
*   **Informações da Tarefa:** Exibe detalhes rápidos da tarefa atual, como nome e status.
*   **Documentação de Status:** Identifica o status atual da tarefa e exibe a documentação, diretrizes e procedimentos associados àquele status, buscando as informações diretamente no ClickUp Docs.
    *   *A documentação é renderizada de Markdown para HTML em uma área com rolagem para facilitar a leitura.*
*   **Avaliar Descrição (IA):** Analisa a descrição da tarefa usando a inteligência artificial do Gemini e sugere melhorias para garantir clareza, completude e adoção de boas práticas.
*   **Gerar Changelog / Publicar Docs (IA):** Gera automaticamente uma entrada de changelog concisa com base no título, status e descrição da tarefa.

### 🐙 Integração com GitHub
Quando você acessa a página de um *commit* no GitHub:
*   **Code Review (IA):** Analisa as alterações do commit utilizando IA para auxiliar na revisão de código, sugerindo melhorias ou identificando potenciais problemas.

---

## 🛠️ Instalação

Como esta é uma extensão em fase de desenvolvimento e uso interno, ela precisa ser carregada manualmente no Google Chrome:

1.  **Baixe o código-fonte:** Clone este repositório ou baixe o arquivo `.zip` e extraia-o no seu computador.
    ```bash
    git clone https://github.com/seu-usuario/chrome-extension-dev-tools.git
    ```
2.  **Acesse a página de extensões:** Abra o Google Chrome e digite `chrome://extensions` na barra de endereço.
3.  **Habilite o Modo do Desenvolvedor:** No canto superior direito da tela, ative a chave **"Modo do desenvolvedor"**.
4.  **Carregue a extensão:** Clique no botão **"Carregar sem compactação"** (localizado no canto superior esquerdo).
5.  **Selecione a pasta:** Navegue até a pasta do projeto (onde está localizado o arquivo `manifest.json`) e selecione-a.
6.  🎉 **Pronto!** A extensão "Strategi - DEV Tools" aparecerá na sua lista de extensões e estará pronta para uso. Recomendamos fixá-la na barra de ferramentas clicando no ícone de "quebra-cabeça" do Chrome.

---

## ⚙️ Configuração

Para que a extensão funcione perfeitamente, é necessário configurar as chaves de API do ClickUp e do Google Gemini:

1.  **Abra a extensão:** Clique no ícone da extensão "Strategi - DEV Tools" na barra de ferramentas do Chrome.
2.  **Acesse o Menu/Configurações:** Clique no ícone de menu (três barras) ou de engrenagem para acessar as opções.
3.  **Insira as Chaves de API:**
    *   **ClickUp API Token:** Insira seu token de acesso pessoal do ClickUp (necessário para buscar detalhes das tarefas e documentos).
    *   **Gemini API Key:** Insira sua chave de API do Google Gemini (necessária para as funcionalidades de Inteligência Artificial).
4.  **Salve as configurações.**

Com as chaves salvas, atualize a página do ClickUp ou do GitHub e utilize as funcionalidades da extensão!
