import { NextRequest, NextResponse } from 'next/server'

const WEBHOOK_URL = 'https://n8n.nutritamilivalle.com.br/webhook/d1b0eaf3-addf-4515-b91d-419a58bf0915'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cpf } = body

    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      )
    }

    const cpfNumbers = cpf.replace(/\D/g, '')

    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: cpfNumbers }),
    })

    if (!webhookResponse.ok) {
      return NextResponse.json(
        { error: 'Erro ao processar solicitação. Tente novamente mais tarde.' },
        { status: 500 }
      )
    }

    const data = await webhookResponse.json()

    if (data.sucesso === false) {
      return NextResponse.json(
        { error: data.mensagemErro || 'CPF não encontrado no sistema' },
        { status: 404 }
      )
    }

    if (data.sucesso === true) {
      return NextResponse.json({ 
        success: true, 
        email: data.email,
      })
    }

    return NextResponse.json(
      { error: 'Resposta inesperada do servidor. Tente novamente.' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar solicitação de recuperação. Tente novamente mais tarde.' },
      { status: 500 }
    )
  }
}
