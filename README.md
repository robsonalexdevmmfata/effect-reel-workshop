# Effect Reel Workshop

Crie um painel web moderno, responsivo e com visual futurista (Dark Mode por padrão, usando Tailwind CSS e componentes limpos estilo shadcn/ui) chamado "TikTok Effect & Video AutoHub". 

O objetivo do painel é gerenciar a criação automatizada de assets para filtros do Effect House e a edição de vídeos de divulgação (estilo Money Print Turbo, com foco em custo zero).

O dashboard deve possuir um layout em abas (Tabs) ou menu lateral organizado com as seguintes seções:

1. ABA 1: GERADOR DE ASSETS PARA FILTROS (Effect House)

- Campo de input de texto ("Prompt da Ideia / Tema do Filtro").

- Seletor de estilo visual (Ex: "Vector 2D Transparent", "Cyberpunk Mask", "Funny Roleta", "Glow-up Effect").

- Botão "Gerar Artes e Texturas (PNG Transparent)".

- Área de grid exibindo os resultados gerados (com botões de preview, download individual e botão "Baixar Pacote ZIP para o Effect House").

2. ABA 2: PROCESSADOR DE VÍDEOS & LEGENDAS (Automático)

- Área de "Drop zone" para upload de arquivos de vídeo brutos (gravações de tela usando os filtros).

- Opções de configuração em switches/toggles: 

  * Remover silêncios e pausas (Auto-Editor).

  * Gerar legendas automáticas estilo CapCut (Whisper).

  * Formato de saída (Vertical 9:16 - 1080x1920).

- Botão "Processar Vídeos".

- Barra de progresso simulada e histórico de vídeos prontos para download.

3. ABA 3: STATUS DO SISTEMA E GOOGLE COLAB

- Cards de status indicando:

  * Conexão com o Servidor Local / Colab: [Online / Pronto]

  * Armazenamento Utilizado / Pasta de Destino

  * Consumo de Tokens / API Gratuita (Pollinations / Whisper Local)

- Um bloco de código rápido com o script Python do Google Colab para o usuário copiar com um clique.

Faça a interface com uma experiência de usuário impecável, ícones modernos (Lucide Icons) e feedbacks visuais claros (loading states e toasts de sucesso).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://effect-reel-workshop.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1dceecce-e930-4ce4-b284-f8b2b5b8e6be).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
