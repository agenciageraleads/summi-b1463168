-- Create blog_posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  published_at DATE NOT NULL DEFAULT CURRENT_DATE,
  modified_at DATE NOT NULL DEFAULT CURRENT_DATE,
  author TEXT NOT NULL DEFAULT 'Equipe Summi',
  reading_time INTEGER NOT NULL DEFAULT 5,
  keywords TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Produtividade',
  tags TEXT[] NOT NULL DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public users can read published posts
CREATE POLICY "Public read published posts"
  ON public.blog_posts
  FOR SELECT
  USING (published = true);

-- Admin users have full access (uses the existing profiles.role check)
CREATE POLICY "Admin full access"
  ON public.blog_posts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seed the 6 static blog posts as published
INSERT INTO public.blog_posts (slug, title, excerpt, content, published_at, modified_at, author, reading_time, keywords, category, tags, published)
VALUES
(
  'como-parar-de-perder-mensagens-importantes-no-whatsapp',
  'Como Parar de Perder Mensagens Importantes no WhatsApp',
  'Você tem dezenas de conversas ativas e não consegue dar conta de ler tudo? Veja como a IA pode te ajudar a nunca mais perder uma mensagem importante.',
  E'## O problema das mensagens perdidas no WhatsApp\n\nSe você usa o WhatsApp para trabalho — seja como profissional autônomo, empresário ou colaborador em equipes — provavelmente já viveu a situação: abriu o app e se deparou com 200 mensagens não lidas espalhadas por dezenas de grupos e conversas individuais. A sensação é de ansiedade e impotência. Você sabe que ali, no meio daquele caos, existem mensagens importantes esperando por você.\n\nO problema é que, para encontrá-las, você precisa abrir conversa por conversa, ler (ou ouvir) cada mensagem, e tentar processar tudo ao mesmo tempo. Isso consome tempo, energia mental e ainda assim há uma grande chance de você deixar algo passar.\n\nSegundo pesquisas de produtividade, profissionais que usam o WhatsApp como ferramenta de trabalho perdem em média **47 minutos por dia** apenas gerenciando mensagens. Isso equivale a mais de 3 horas por semana jogadas fora.\n\n## Por que nosso cérebro não consegue acompanhar o volume\n\nO WhatsApp foi desenhado para ser informal e rápido. Mas quando ele se torna a principal ferramenta de comunicação profissional, o volume de mensagens cresce de forma exponencial. Grupos de equipe, grupos de clientes, conversas individuais de fornecedores, parceiros, amigos, família — tudo misturado no mesmo lugar.\n\nNosso cérebro não foi projetado para processar esse volume de informação textual de forma eficiente. Ele **não consegue distinguir automaticamente** o que é urgente e importante do que é irrelevante, porque isso exige ler e interpretar cada mensagem individualmente.\n\n## Como a IA resolve esse problema\n\nÉ aqui que entra a inteligência artificial. Ferramentas como a Summi funcionam como um filtro inteligente para o seu WhatsApp. Em vez de você ter que ler cada mensagem, a IA:\n\n### 1. Identifica padrões de importância\nA IA analisa o conteúdo das mensagens e aprende quais tipos de informação são relevantes para você. Se você é um vendedor, palavras como "proposta", "prazo", "reunião" ou "comprar" têm peso diferente de uma figurinha de bom dia.\n\n### 2. Agrupa e resume por temas\nEm vez de te mostrar 200 mensagens individuais, a Summi entrega um **resumo organizado** com os pontos principais de cada conversa ativa. Você lê 1 resumo e absorve o essencial de 50 conversas.\n\n### 3. Alertas em tempo real para palavras-chave\nVocê define as palavras que importam para você — "urgente", "pagamento", o nome de um cliente específico — e a IA te avisa imediatamente quando elas aparecem, independente de qual grupo ou conversa.\n\n### 4. Transcrição de áudios\nÁudios longos de 3, 5, 10 minutos? A IA transcreve tudo em texto e entrega um resumo em segundos. Você lê o essencial em vez de ouvir um áudio enrolado.\n\n## Conclusão\n\nParar de perder mensagens importantes no WhatsApp não é questão de disciplina — é questão de ter as ferramentas certas. A IA funciona como um assistente pessoal que nunca dorme, nunca perde uma mensagem e sempre te entrega o que é mais relevante de forma organizada e resumida.',
  '2026-02-10',
  '2026-03-03',
  'Equipe Summi',
  6,
  'perder mensagens whatsapp, mensagens importantes whatsapp, organizar whatsapp, priorizar conversas whatsapp',
  'Produtividade',
  ARRAY['WhatsApp', 'Produtividade', 'IA', 'Gestão de mensagens'],
  true
),
(
  'como-transcrever-audios-do-whatsapp',
  'Como Transcrever Áudios do WhatsApp: O Guia Definitivo',
  'Áudios longos no WhatsApp são um pesadelo? Aprenda a transcrever automaticamente qualquer áudio e economize horas da sua semana.',
  E'## O problema dos áudios no WhatsApp\n\nO áudio do WhatsApp se tornou o formato de comunicação preferido dos brasileiros. É rápido para quem envia, mas pode ser um martírio para quem recebe — especialmente em ambientes profissionais onde você precisa de discrição, quando está em reunião, ou simplesmente quando o áudio tem 7 minutos e você não tem esse tempo.\n\nPior: diferente de mensagens de texto, áudios **não são pesquisáveis**. Se um cliente te mandou um áudio com os detalhes de um pedido há 2 semanas, você precisa ouvir tudo de novo para encontrar essa informação. Isso é ineficiente.\n\n## Como funciona a transcrição automática de áudios\n\nFerramentas modernas de IA, como a tecnologia usada pela Summi, utilizam modelos de reconhecimento de fala avançados para converter áudio em texto com precisão superior a 95% — mesmo com sotaques regionais brasileiros, gírias e ruído de fundo.\n\nO processo é simples:\n\n1. **O áudio chega no seu WhatsApp**\n2. **A IA processa automaticamente** em segundo plano\n3. **Você recebe a transcrição em texto** ao abrir a conversa\n4. **Opcionalmente, recebe um resumo** do áudio em poucos pontos\n\n## Benefícios da transcrição de áudios no WhatsApp\n\n### Ganhe tempo\nUm áudio de 5 minutos pode ser lido em transcrição em menos de 1 minuto. Multiplicado por dezenas de áudios por dia, isso representa horas economizadas por semana.\n\n### Trabalhe em ambientes silenciosos\nEm reuniões, em transporte público, em ambientes de trabalho compartilhados — você pode ler qualquer áudio sem precisar usar fones ou incomodar ninguém.\n\n### Pesquise o que foi dito\nCom a transcrição em texto, você pode usar a busca do WhatsApp ou de qualquer documento para encontrar exatamente o que precisa.\n\n### Crie registros e documentação\nTranscrições de reuniões em grupo, instruções de clientes, acordos verbais — tudo pode ser documentado automaticamente e arquivado para referência futura.\n\n## Conclusão\n\nA transcrição automática de áudios no WhatsApp não é mais um luxo — é uma necessidade para qualquer profissional que usa o app como ferramenta de trabalho.',
  '2026-02-17',
  '2026-03-03',
  'Equipe Summi',
  7,
  'transcrever audios whatsapp, transcrição whatsapp, converter audio em texto whatsapp',
  'Tutoriais',
  ARRAY['Transcrição', 'Áudios', 'WhatsApp', 'Produtividade'],
  true
),
(
  'automacao-whatsapp-business-guia-completo',
  'Automação de WhatsApp Business: O Guia Completo para 2026',
  'Descubra como automatizar seu WhatsApp Business de forma inteligente, aumentar sua produtividade e nunca mais perder um cliente por demora no atendimento.',
  E'## O que é automação de WhatsApp Business?\n\nAutomação de WhatsApp Business é o uso de tecnologia — especialmente inteligência artificial — para executar tarefas repetitivas e de triagem no WhatsApp sem intervenção humana constante.\n\nPara pequenos e médios negócios brasileiros, o WhatsApp é a principal ferramenta de vendas e atendimento. Mais de **93% dos brasileiros que têm smartphone usam WhatsApp**, e a maioria prefere contatar empresas por ali.\n\n## Os principais tipos de automação\n\n### 1. Triagem e priorização de mensagens (IA)\nA IA analisa todas as mensagens recebidas e as classifica por urgência e tipo: cliente novo, suporte, pedido, reclamação, etc.\n\n### 2. Transcrição e resumo de áudios\nMensagens de áudio são extremamente comuns no Brasil. Automatizar a transcrição significa que sua equipe pode processar áudios sem precisar ouvir cada um.\n\n### 3. Resumos de conversas longas\nGrupos de trabalho e conversas com muitas mensagens acumuladas podem ser resumidos automaticamente.\n\n### 4. Alertas por palavras-chave\nConfigure palavras como "cancelar", "urgente", "reclamação" para receber notificações imediatas.\n\n## Resultados esperados\n\n- **Redução de 60-80% no tempo de triagem** de mensagens\n- **Tempo de resposta inicial 3x mais rápido**\n- **Aumento de 40% na taxa de conversão** em vendas\n- **Equipes mais focadas** em atendimento de qualidade\n\n## Conclusão\n\nA automação de WhatsApp Business não é mais uma vantagem competitiva — está se tornando uma necessidade para negócios que recebem volume significativo de mensagens.',
  '2026-02-24',
  '2026-03-03',
  'Equipe Summi',
  9,
  'automação whatsapp business, automatizar whatsapp, whatsapp business automação, chatbot whatsapp',
  'Negócios',
  ARRAY['Automação', 'WhatsApp Business', 'Atendimento', 'IA'],
  true
),
(
  'produtividade-whatsapp-dicas-profissionais',
  '5 Hábitos que Vão Transformar sua Produtividade no WhatsApp',
  'Profissionais de alta performance usam o WhatsApp de forma completamente diferente. Descubra os hábitos e ferramentas que fazem toda a diferença.',
  E'## WhatsApp: ferramenta ou distração?\n\nO WhatsApp é a faca de dois gumes do profissional brasileiro. Por um lado, é onde acontecem negócios, coordenações de equipe e atendimento ao cliente. Por outro, é onde o tempo some sem você perceber.\n\n## Hábito 1: Defina janelas de verificação, não verificação contínua\n\nO maior vilão da produtividade no WhatsApp é a interrupção constante. Cada notificação quebra seu fluxo de trabalho e pode levar até 23 minutos para você recuperar o foco total.\n\n**O que fazer**: Desative as notificações e defina 3 horários fixos para checar o WhatsApp — por exemplo, às 9h, 13h e 17h.\n\n## Hábito 2: Use a IA para fazer a triagem por você\n\nEm vez de abrir o WhatsApp e sair scrollando por todas as conversas, use uma ferramenta de IA que já fez a triagem antes de você abrir o app.\n\n## Hábito 3: Processe áudios com transcrição automática\n\nUm áudio de 5 minutos pode ser lido em transcrição em menos de 1 minuto. Multiplicado por dezenas de áudios por dia, isso representa horas economizadas por semana.\n\n## Hábito 4: Responda com qualidade, não com velocidade\n\nHá uma pressão cultural no Brasil para responder mensagens no WhatsApp quase instantaneamente. Essa pressão é prejudicial à produtividade e à qualidade das respostas.\n\n## Hábito 5: Archive o que não é ativo, saia do que é irrelevante\n\nRevise seus grupos mensalmente. Saia de grupos onde você não agrega e não recebe valor.\n\n## Conclusão\n\nProdutividade no WhatsApp não é sobre usar menos — é sobre usar de forma intencional.',
  '2026-03-01',
  '2026-03-03',
  'Equipe Summi',
  5,
  'produtividade whatsapp, dicas whatsapp profissional, como usar whatsapp no trabalho',
  'Produtividade',
  ARRAY['Produtividade', 'WhatsApp', 'Hábitos', 'Profissionais'],
  true
),
(
  'ia-para-whatsapp-business-como-funciona',
  'IA para WhatsApp Business: Como Funciona e Por Que Você Precisa',
  'A inteligência artificial está revolucionando a forma como profissionais e empresas usam o WhatsApp. Entenda como funciona e o que ela pode fazer pelo seu negócio.',
  E'## O que mudou com a IA no WhatsApp?\n\nEm 2026, os modelos de linguagem avançados tornaram possível uma interação com IA que é contextual, adaptativa, analítica e multilingual — funcionando perfeitamente em português com gírias e regionalismos.\n\n## O que a IA pode fazer no seu WhatsApp Business hoje\n\n### Análise e classificação de mensagens\nA IA lê todas as suas mensagens recebidas e as classifica por tipo e urgência.\n\n### Transcrição de áudios com alta precisão\nModelos de speech-to-text modernos conseguem transcrever áudios em português com mais de 95% de precisão, incluindo sotaques regionais.\n\n### Resumos inteligentes de conversas\nGrupos de trabalho, conversas longas com clientes — a IA condensa tudo em pontos essenciais.\n\n### Alertas proativos\nA IA monitora continuamente suas conversas e te notifica quando detecta situações que merecem atenção imediata.\n\n## Como a IA do WhatsApp funciona tecnicamente\n\n**1. Conexão segura com o WhatsApp** — via APIs criptografadas\n**2. Processamento em tempo real** — análise do conteúdo em milissegundos\n**3. Armazenamento temporário e seguro** — em conformidade com a LGPD\n**4. Entrega de insights** — resumos, alertas, transcrições direto no WhatsApp\n\n## Conclusão\n\nA pergunta não é mais "devo usar IA no meu WhatsApp?", mas "por que ainda não estou usando?"',
  '2026-03-03',
  '2026-03-03',
  'Equipe Summi',
  7,
  'ia whatsapp business, inteligencia artificial whatsapp, whatsapp business ia, assistente ia whatsapp',
  'Tecnologia',
  ARRAY['IA', 'WhatsApp Business', 'Tecnologia', 'Automação'],
  true
),
(
  'resumo-de-conversas-whatsapp-economize-tempo',
  'Resumo de Conversas no WhatsApp: Como Economizar Horas por Semana',
  'Imagine entrar em uma conversa de 300 mensagens e em 30 segundos saber tudo que foi discutido. Com IA, isso é possível agora.',
  E'## O problema das 300 mensagens não lidas\n\nVocê entrou no grupo da equipe depois de um dia fora do escritório e tem 300 mensagens acumuladas. O que você faz?\n\nCom IA: recebe um resumo automático em 30 segundos com os 5 pontos principais discutidos.\n\n## O que é resumo automático de conversas no WhatsApp?\n\nResumo automático é uma funcionalidade de IA que analisa o conteúdo de conversas e gera um texto condensado com os pontos mais relevantes, decisões tomadas, ações definidas e informações-chave.\n\n## Como a IA gera um bom resumo\n\n### Identifica os tópicos principais\nAgrupa mensagens por assunto — se o grupo discutiu tópicos diferentes, o resumo apresenta blocos distintos.\n\n### Destaca decisões e ações\n"Ficou decidido que a entrega será na sexta" e "João vai verificar com o fornecedor" são informações de alto valor priorizadas.\n\n### Filtra o ruído\nEmojis de reação, confirmações simples e conversas irrelevantes são excluídos.\n\n### Sinaliza urgências\nPerguntas sem resposta, prazos mencionados e solicitações diretas são destacadas separadamente.\n\n## Quanto tempo você realmente economiza?\n\n- Economia por grupo por dia: ~8 minutos\n- Economia total diária (5 grupos): ~40 minutos\n- **Economia anual: ~170 horas — mais de 4 semanas de trabalho**\n\n## Conclusão\n\nO resumo automático de conversas é uma das funcionalidades de IA que geram retorno mais imediato e mensurável.',
  '2026-03-03',
  '2026-03-03',
  'Equipe Summi',
  6,
  'resumo conversas whatsapp, resumir mensagens whatsapp, sumarizar whatsapp, grupos whatsapp resumo',
  'Produtividade',
  ARRAY['Resumo', 'WhatsApp', 'IA', 'Grupos', 'Produtividade'],
  true
);
