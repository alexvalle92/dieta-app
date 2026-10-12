import { describe, expect, it } from "vitest"
import { RENEWAL_SECTIONS } from "@/lib/renewal/questions"
import { buildSubmissionAnswers, parseRenewalBody, prefillAnswers, type RenewalAnswers } from "@/lib/validation/renewal"

const SUBMISSION_ID = "0b5f3a9e-8f5e-4d0c-9c0e-3b3f0f6a1c11"

const answers: RenewalAnswers = {
  faixa_etaria: "25-34 anos",
  sexo_biologico: "Feminino",
  tipo_fisico: "Gordinho(a). Leve excesso de gordura corporal.",
  peso_comportamento: "Oscila com facilidade",
  sobremesa: "Sim",
  rotina_dia: "Passo a maior parte do tempo sentado(a)",
  sono: "5–6 horas",
  agua: "Mais de 6 copos",
  breakfast_foods: ["Ovo", "Café"],
  almoco: ["Carne de frango", "Com Feijão"],
  lanche_tarde: ["Fruta"],
  jantar: ["Sopa", "Batata doce"],
  habitos: ["Como de madrugada"],
  altura_cm: 165,
  peso_kg: 75.5,
  meta_peso_30d: 68,
}

const body = (over: Record<string, unknown> = {}, id: unknown = SUBMISSION_ID) => ({
  submissionId: id,
  answers: { ...answers, ...over },
})

describe("parseRenewalBody", () => {
  it("corpo válido passa e devolve os números como número", () => {
    const result = parseRenewalBody(body())
    expect(result).toEqual({ ok: true, value: { submissionId: SUBMISSION_ID, answers } })
    if (result.ok) {
      expect(typeof result.value.answers.altura_cm).toBe("number")
      expect(typeof result.value.answers.peso_kg).toBe("number")
      expect(typeof result.value.answers.meta_peso_30d).toBe("number")
    }
  })

  it("campos desconhecidos em answers são descartados (não seguem para o v0-tami-forms)", () => {
    const result = parseRenewalBody(body({ cpf: "00000000000", nome_completo: "Outra Pessoa", imc: "1" }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(Object.keys(result.value.answers).sort()).toEqual(Object.keys(answers).sort())
  })

  it.each([
    ["submissionId que não é UUID", body({}, "abc")],
    ["submissionId ausente", { answers }],
    ["single com opção fora da lista", body({ faixa_etaria: "60 anos" })],
    ["single com lista no lugar", body({ sono: ["5–6 horas"] })],
    ["multi com item fora da lista", body({ almoco: ["Carne de frango", "Pizza"] })],
    ["multi vazia", body({ jantar: [] })],
    ["multi com texto no lugar da lista", body({ habitos: "Como de madrugada" })],
    ["multi com item repetido", body({ jantar: ["Sopa", "Sopa"] })],
    ["altura_cm 119", body({ altura_cm: 119 })],
    ["altura_cm 231", body({ altura_cm: 231 })],
    ["altura_cm 170.5", body({ altura_cm: 170.5 })],
    ["altura_cm em texto", body({ altura_cm: "165" })],
    ["peso_kg 29.9", body({ peso_kg: 29.9 })],
    ["peso_kg 300.1", body({ peso_kg: 300.1 })],
    ["peso_kg com mais de uma casa", body({ peso_kg: 75.55 })],
    ["meta_peso_30d 29.9", body({ meta_peso_30d: 29.9 })],
    ["meta_peso_30d 300.1", body({ meta_peso_30d: 300.1 })],
    ["answers não é objeto", { submissionId: SUBMISSION_ID, answers: "x" }],
    ["answers é lista", { submissionId: SUBMISSION_ID, answers: [] }],
    ["answers ausente", { submissionId: SUBMISSION_ID }],
    ["corpo null", null],
    ["corpo texto", "x"],
  ])("recusa: %s", (_name, input) => {
    expect(parseRenewalBody(input)).toEqual({ ok: false })
  })

  it.each(["almoco", "sono", "altura_cm", "peso_kg", "meta_peso_30d", "habitos"])("recusa com %s ausente", (key) => {
    const rest: Record<string, unknown> = { ...answers }
    delete rest[key]
    expect(parseRenewalBody({ submissionId: SUBMISSION_ID, answers: rest })).toEqual({ ok: false })
  })

  it("aceita os limites: altura 120 e 230; peso e meta 30 e 300", () => {
    for (const altura_cm of [120, 230]) expect(parseRenewalBody(body({ altura_cm })).ok).toBe(true)
    for (const peso_kg of [30, 300, 75.1]) expect(parseRenewalBody(body({ peso_kg })).ok).toBe(true)
    for (const meta_peso_30d of [30, 300]) expect(parseRenewalBody(body({ meta_peso_30d })).ok).toBe(true)
  })

  it("toda opção listada nas perguntas é aceita (opções e validação não divergem)", () => {
    for (const section of RENEWAL_SECTIONS) {
      for (const q of section.questions) {
        if (q.type === "number") continue
        for (const option of q.options) {
          const value = q.type === "multi" ? [option.value] : option.value
          expect(parseRenewalBody(body({ [q.key]: value })).ok, `${q.key}: ${option.value}`).toBe(true)
        }
      }
    }
  })
})

describe("buildSubmissionAnswers", () => {
  const patient = { name: "Ana Souza", email: "ana@example.com", phone: "11987654321", cpf: "52998224725" }

  it("as 16 respostas, números em texto, imc com duas casas e os dados do paciente", () => {
    const out = buildSubmissionAnswers(patient, { ...answers, altura_cm: 165, peso_kg: 75.5, meta_peso_30d: 70 })

    expect(out).toEqual({
      faixa_etaria: "25-34 anos",
      sexo_biologico: "Feminino",
      tipo_fisico: "Gordinho(a). Leve excesso de gordura corporal.",
      peso_comportamento: "Oscila com facilidade",
      sobremesa: "Sim",
      rotina_dia: "Passo a maior parte do tempo sentado(a)",
      sono: "5–6 horas",
      agua: "Mais de 6 copos",
      breakfast_foods: ["Ovo", "Café"],
      almoco: ["Carne de frango", "Com Feijão"],
      lanche_tarde: ["Fruta"],
      jantar: ["Sopa", "Batata doce"],
      habitos: ["Como de madrugada"],
      altura_cm: "165",
      peso_kg: "75.5",
      meta_peso_30d: "70",
      imc: "27.73",
      nome_completo: "Ana Souza",
      email: "ana@example.com",
      whatsapp: "11987654321",
      cpf: "52998224725",
    })
  })

  it("telefone vazio no cadastro segue como texto vazio (a chave precisa existir)", () => {
    const out = buildSubmissionAnswers({ ...patient, phone: "" }, answers)
    expect(out).toHaveProperty("whatsapp", "")
  })

  it("os dados do paciente vêm do cadastro, nunca das respostas", () => {
    const polluted = { ...answers, cpf: "1", email: "x@y.z", nome_completo: "Outra", whatsapp: "2" } as RenewalAnswers
    const out = buildSubmissionAnswers(patient, polluted)
    expect(out).toMatchObject({
      cpf: "52998224725",
      email: "ana@example.com",
      nome_completo: "Ana Souza",
      whatsapp: "11987654321",
    })
  })
})

describe("prefillAnswers", () => {
  const stored = {
    faixa_etaria: "25-34 anos",
    sexo_biologico: "Feminino",
    tipo_fisico: "Gordinho(a). Leve excesso de gordura corporal.",
    peso_comportamento: "Oscila com facilidade",
    sobremesa: "Sim",
    rotina_dia: "Passo a maior parte do tempo sentado(a)",
    sono: "5–6 horas",
    agua: "Mais de 6 copos",
    breakfast_foods: ["Ovo", "Café"],
    almoco: ["Carne de frango", "Com Feijão"],
    lanche_tarde: ["Fruta"],
    jantar: ["Sopa", "Batata doce"],
    habitos: ["Como de madrugada"],
    altura_cm: "165",
    peso_kg: "75",
    meta_peso_30d: "68",
    imc: "27.55",
    email: "a@b.c",
  }

  it("null → {}", () => {
    expect(prefillAnswers(null)).toEqual({})
  })

  it("envio do quiz com tudo válido → todos os campos, menos peso_kg e meta_peso_30d", () => {
    const expected: Record<string, unknown> = { ...answers, altura_cm: 165 }
    delete expected.peso_kg
    delete expected.meta_peso_30d

    const result = prefillAnswers(stored)

    expect(result).toEqual(expected)
    expect(result).not.toHaveProperty("peso_kg")
    expect(result).not.toHaveProperty("meta_peso_30d")
  })

  it("altura em texto vira número", () => {
    expect(prefillAnswers({ altura_cm: "165" })).toEqual({ altura_cm: 165 })
    expect(prefillAnswers({ altura_cm: 172 })).toEqual({ altura_cm: 172 })
  })

  it.each(["abc", 500, "", "  ", "0x80", "1e2", "170.5", 119, null, true])("altura_cm %j → ausente", (altura_cm) => {
    expect(prefillAnswers({ altura_cm })).toEqual({})
  })

  it("opção antiga em lista de escolha múltipla é descartada", () => {
    expect(prefillAnswers({ almoco: ["Carne de frango", "Opção antiga"] })).toEqual({ almoco: ["Carne de frango"] })
  })

  it("single com opção que não existe mais → ausente", () => {
    expect(prefillAnswers({ sobremesa: "Sim, mas só às vezes", sono: "5-6 horas" })).toEqual({})
  })

  it("lista só com opções antigas → ausente (multi precisa de pelo menos uma)", () => {
    expect(prefillAnswers({ almoco: ["Opção antiga"] })).toEqual({})
  })

  it("texto no lugar da lista → ausente", () => {
    expect(prefillAnswers({ almoco: "Carne de frango" })).toEqual({})
  })

  it("tipos errados nunca lançam e ficam ausentes", () => {
    expect(prefillAnswers({ jantar: 42, sono: { a: 1 }, habitos: [1, null], agua: ["Mais de 6 copos"] })).toEqual({})
  })

  it("itens repetidos na lista antiga são reduzidos a um", () => {
    expect(prefillAnswers({ jantar: ["Sopa", "Sopa", "Mingau"] })).toEqual({ jantar: ["Sopa", "Mingau"] })
  })

  it("JSON que não é objeto (lista, texto, número) → {}, sem lançar", () => {
    for (const odd of [[], ["a"], "texto", 7, true]) {
      expect(prefillAnswers(odd as unknown as Record<string, unknown>)).toEqual({})
    }
  })

  it("chaves herdadas do protótipo não contam", () => {
    const obj = Object.create({ sono: "5–6 horas" }) as Record<string, unknown>
    expect(prefillAnswers(obj)).toEqual({})
  })
})
