// Perguntas do formulário de renovação (spec de vencimento e renovação, §8.1). Sem import de servidor:
// a tela e a validação (lib/validation/renewal.ts) leem esta mesma lista, para as opções não divergirem.
// Os `value`s e `label`s foram copiados de v0-tami-forms/app/page.tsx: o `value` é o que o quiz grava em
// `quiz_responses.answers` e o que o gerador do plano entende, por isso não pode ser alterado aqui.

export type ChoiceQuestion = {
  key: string
  label: string
  type: "single" | "multi"
  options: { value: string; label: string }[]
}

export type NumberQuestion = {
  key: string
  label: string
  type: "number"
  min: number
  max: number
  step: number
}

export type Question = ChoiceQuestion | NumberQuestion

// Opções cujo texto na tela é o próprio valor gravado.
const same = (values: string[]) => values.map((value) => ({ value, label: value }))

export const RENEWAL_SECTIONS: { title: string; questions: Question[] }[] = [
  {
    title: "Sobre você",
    questions: [
      {
        key: "faixa_etaria",
        label: "Qual é a sua faixa etária?",
        type: "single",
        options: same(["18-24 anos", "25-34 anos", "35-44 anos", "45-59 anos"]),
      },
      {
        key: "sexo_biologico",
        label: "Qual é o seu sexo biológico?",
        type: "single",
        options: same(["Masculino", "Feminino"]),
      },
      {
        key: "altura_cm",
        label: "Qual é a sua altura (em centímetros)?",
        type: "number",
        min: 120,
        max: 230,
        step: 1,
      },
      {
        key: "tipo_fisico",
        label: "Qual dessas opções representa melhor o seu tipo físico atual?",
        type: "single",
        // No quiz cada opção tem título e descrição; o valor gravado junta os dois.
        options: same([
          "Magro(a). Baixo percentual de gordura, estrutura mais fina.",
          "Falso Magro(a). Peso normal, gordura localizada e pouca definição.",
          "Gordinho(a). Leve excesso de gordura corporal.",
          "Muito gordinho(a). Acúmulo de gordura evidente.",
        ]),
      },
      {
        key: "peso_comportamento",
        label: "Como o seu peso costuma se comportar ao longo do tempo?",
        type: "single",
        options: [
          {
            value: "Dificuldade para ganhar peso/massa",
            label: "Tenho dificuldade para ganhar peso ou massa muscular.",
          },
          {
            value: "Oscila com facilidade",
            label: "Meu peso oscila com facilidade — perco e ganho rapidamente.",
          },
          {
            value: "Ganho com facilidade",
            label: "Tendo a ganhar peso com facilidade e demoro mais para eliminar.",
          },
        ],
      },
    ],
  },
  {
    title: "Peso",
    questions: [
      {
        key: "peso_kg",
        label: "Informe seu peso atual (em kg):",
        type: "number",
        min: 30,
        max: 300,
        step: 0.1,
      },
      {
        key: "meta_peso_30d",
        label: "Qual é a sua meta de peso?",
        type: "number",
        min: 30,
        max: 300,
        step: 0.1,
      },
    ],
  },
  {
    title: "Refeições",
    questions: [
      {
        key: "breakfast_foods",
        label: "O que você quer comer no café da manhã?",
        type: "multi",
        options: same([
          "Pão francês",
          "Pão de forma integral",
          "Ovo",
          "Requeijão",
          "Café",
          "Café com leite",
          "Não quero fazer café da manhã",
        ]),
      },
      {
        key: "almoco",
        label: "O que você quer comer no almoço?",
        type: "multi",
        options: [
          { value: "Carne de frango", label: "Carne de frango" },
          { value: "Carne de peixe", label: "Carne de Peixe" },
          { value: "Carne de porco", label: "Carne de porco" },
          { value: "Carne de boi", label: "Carne de boi" },
          { value: "Com Feijão", label: "Com Feijão" },
          { value: "Sem Feijão", label: "Sem feijão" },
          { value: "Não quero fazer almoço", label: "Não quero fazer almoço" },
        ],
      },
      {
        key: "lanche_tarde",
        label: "O que você quer comer no lanche da tarde?",
        type: "multi",
        options: same([
          "Fruta",
          "Crepioca",
          "Pão",
          "Vitamina",
          "Whey Protein",
          "Bolo de caneca",
          "Não quero fazer lanche da tarde",
        ]),
      },
      {
        key: "jantar",
        label: "O que você quer comer no jantar?",
        type: "multi",
        options: same([
          "Hamburguer",
          "Macarrão",
          "Mingau",
          "Sopa",
          "Batata doce",
          "Batata inglesa",
          "Não quero fazer janta",
        ]),
      },
      {
        key: "sobremesa",
        label: "Você quer ter uma opção de sobremesa no seu plano alimentar?",
        type: "single",
        options: [
          { value: "Sim", label: "Sim, com certeza!" },
          { value: "Não", label: "Não, prefiro evitar." },
        ],
      },
    ],
  },
  {
    title: "Rotina",
    questions: [
      {
        key: "rotina_dia",
        label: "Como você descreveria sua rotina durante o dia?",
        type: "single",
        options: same([
          "Passo a maior parte do tempo sentado(a)",
          "Pausas ativas ou movimento ocasional",
          "Em pé ou em movimento quase todo o dia",
        ]),
      },
      {
        key: "sono",
        label: "Quantas horas você costuma dormir por noite?",
        type: "single",
        options: same(["Menos de 5 horas", "5–6 horas", "7–8 horas", "Mais de 8 horas"]),
      },
      {
        key: "agua",
        label: "Qual é a sua média de consumo de água por dia?",
        type: "single",
        options: same([
          "Quase não bebo água",
          "Aproximadamente 2 copos (500 ml)",
          "2–6 copos (0,5–1,5 L)",
          "Mais de 6 copos",
        ]),
      },
      {
        key: "habitos",
        label: "Você se identifica com algum desses hábitos alimentares? 🤦🏾‍♀️",
        type: "multi",
        options: same([
          "Como de madrugada",
          "Como por emoção/ansiedade/tédio",
          "Dificuldade em resistir a doces",
          "Exagero nos fins de semana",
          "Nenhum desses",
        ]),
      },
    ],
  },
]
