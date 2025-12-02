export interface ChangelogItem {
  number: number;
  title: string;
  description: string;
  subitems?: { title: string; description: string }[];
}

export interface ChangelogData {
  titulo: string;
  empresa: string;
  data_atualizacao: string;
  introducao: string;
  novas_funcionalidades: ChangelogItem[];
  melhorias_tecnicas_operacionais: ChangelogItem[];
  performance_infraestrutura: ChangelogItem[];
}

export const changelogData: ChangelogData = {
  titulo: "Changelog — Plataforma LM",
  empresa: "Even Tecnologia",
  data_atualizacao: "30 de novembro de 2025",
  introducao: "A Even Tecnologia, firmada em fundamento de rocha, fé, credibilidade e visão de futuro, apresenta a mais recente atualização da Plataforma LM, trazendo aprimoramentos estratégicos, novas funcionalidades e avanços significativos em performance, experiência do usuário, governança interna e infraestrutura.",
  novas_funcionalidades: [
    {
      number: 1,
      title: "Novo Layout de Upsell",
      description: "Inserção de um novo layout de upsell no checkout e na página pós-aprovação, ampliando possibilidades de conversão e cross-sell."
    },
    {
      number: 2,
      title: "Novos Blocos de Conteúdo",
      description: "",
      subitems: [
        {
          title: "Marquee",
          description: "agora disponível para uso em múltiplas áreas do site, inclusive dentro de banners da homepage."
        },
        {
          title: "Stories",
          description: "novo bloco em formato \"stories\", permitindo criação de grupos com vídeos do YouTube Shorts, imagens e CTAs customizados."
        },
        {
          title: "Multi-banners",
          description: "novo formato que permite adicionar múltiplos banners em um mesmo bloco, cada um com seu próprio link/CTA."
        }
      ]
    },
    {
      number: 3,
      title: "Novo Formato de Oferta — Upsell Infinito",
      description: "Ofertas pós-compra com descontos contínuos para o mesmo usuário, ampliando estratégias de retenção e recorrência."
    },
    {
      number: 4,
      title: "Integrações e Trackeamento",
      description: "",
      subitems: [
        {
          title: "Novas integrações",
          description: "realizadas através de agregadores parceiros."
        },
        {
          title: "Trackeamento aprimorado",
          description: "com segregação de APIs da Meta por afiliado diretamente no painel administrativo."
        },
        {
          title: "Novo modelo de comissionamento",
          description: "por recuperação para afiliados."
        }
      ]
    },
    {
      number: 5,
      title: "Gamificação de Onboarding",
      description: "Novos formatos de gamificação adicionados: Cartinha e Raspadinha, aumentando engajamento, curiosidade e retenção dos novos usuários.",
      subitems: [
        {
          title: "Cartinha",
          description: ""
        },
        {
          title: "Raspadinha",
          description: ""
        }
      ]
    }
  ],
  melhorias_tecnicas_operacionais: [
    {
      number: 6,
      title: "Correções e Ajustes",
      description: "Corrigida a condição que impedia ganhadores com sorteios em andamento de aparecerem no bloco Últimos Ganhadores."
    },
    {
      number: 7,
      title: "Painel Administrativo — Evoluções Importantes",
      description: "",
      subitems: [
        {
          title: "Exibição dos números da sorte",
          description: "por sorteio dentro de um mesmo pagamento, facilitando análises e auditorias."
        },
        {
          title: "Nova permissão para administradores restritos",
          description: "que podem criar, editar e visualizar ganhadores."
        },
        {
          title: "Melhorias de UI",
          description: "para uma navegação mais fluida e produtiva."
        },
        {
          title: "Visualização de vendas do afiliado",
          description: "agora disponível diretamente no cadastro do próprio afiliado."
        }
      ]
    },
    {
      number: 8,
      title: "Painel do Revendedor",
      description: "Nova funcionalidade para geração de links de revenda por categoria de sorteio, otimizando fluxos comerciais."
    },
    {
      number: 9,
      title: "Frontend e Experiência Visual",
      description: "",
      subitems: [
        {
          title: "Nova versão de frontend",
          description: "implementada, mais leve, fluida e otimizada."
        },
        {
          title: "Readequação estrutural dos botões",
          description: "para padronização e consistência visual."
        }
      ]
    },
    {
      number: 10,
      title: "Tipagens e Arquitetura de Código",
      description: "Melhoria estrutural completa nas tipagens internas da plataforma, aumentando confiabilidade, legibilidade e segurança da aplicação."
    },
    {
      number: 11,
      title: "Cache e Performance",
      description: "Adicionados sistemas de cache em rotas específicas, gerando maior agilidade em consultas críticas e reduzindo carga de processamento."
    },
    {
      number: 12,
      title: "SEO e Indexação",
      description: "Melhorias significativas no sitemap e no robots.txt, contribuindo diretamente para indexação mais eficiente e melhor posicionamento orgânico."
    }
  ],
  performance_infraestrutura: [
    {
      number: 13,
      title: "Novo Mecanismo de Carregamento",
      description: "Ajustes estruturais que tornam o carregamento geral da plataforma mais rápido, estável e eficiente."
    }
  ]
};
