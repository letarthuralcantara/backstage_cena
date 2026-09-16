import nodemailer from 'nodemailer'
import path from 'node:path'
import mailConfig from '../config/mail.js'

let transporter: nodemailer.Transporter | null = null

const ASSUNTO_BOAS_VINDAS = 'Bem-vindo(a) ao Backstage Cena!'
const REMETENTE_PADRAO = 'Backstage Cena <noreply@backstagecena.com>'

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character] ?? character))
}

function criarConteudoEmail(nome: string) {
  const nomeExibicao = nome.trim() || 'músico'
  const nomeSeguro = escapeHtml(nomeExibicao)

  const urlPerfil = process.env.APP_PROFILE_URL?.trim()
  const urlPerfilSegura = urlPerfil
    ? escapeHtml(urlPerfil)
    : undefined

  const texto = [
    `Olá, ${nomeExibicao}!`,
    'Sua conta no Backstage Cena foi criada com sucesso.',
    'Complete seu perfil para começar a se conectar com músicos, produtores e artistas independentes.',
    urlPerfil ? `Complete seu perfil em: ${urlPerfil}` : '',
    'Se você não criou esta conta, entre em contato com o suporte pelo número 83 98713-1376.',
    'Até breve!',
    'Equipe Backstage Cena',
  ]
    .filter(Boolean)
    .join('\n\n')

  const botaoPerfil = urlPerfilSegura
    ? `
      <table
        role="presentation"
        border="0"
        cellspacing="0"
        cellpadding="0"
        style="margin: 30px 0 10px"
      >
        <tr>
          <td
            align="center"
            bgcolor="#8b5cf6"
            style="
              border-radius: 50px;
              background: linear-gradient(135deg, #8b5cf6, #d946ef);
              box-shadow: 0 0 24px rgba(139, 92, 246, 0.45);
            "
          >
            <a
              href="${urlPerfilSegura}"
              target="_blank"
              style="
                display: inline-block;
                padding: 16px 28px;
                color: #ffffff;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 14px;
                font-weight: 700;
                letter-spacing: 0.5px;
                text-decoration: none;
                text-transform: uppercase;
                border-radius: 50px;
              "
            >
              Completar meu perfil
            </a>
          </td>
        </tr>
      </table>
    `
    : ''

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>${ASSUNTO_BOAS_VINDAS}</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #050505;
          font-family: Arial, Helvetica, sans-serif;
          color: #ffffff;
        "
      >
        <!-- Texto de pré-visualização do e-mail -->
        <div
          style="
            display: none;
            max-height: 0;
            overflow: hidden;
            opacity: 0;
          "
        >
          Sua conta no Backstage Cena foi criada com sucesso.
        </div>

        <table
          role="presentation"
          width="100%"
          border="0"
          cellspacing="0"
          cellpadding="0"
          style="
            min-height: 100vh;
            background-color: #050505;
            background-image:
              radial-gradient(
                circle at 10% 10%,
                rgba(139, 92, 246, 0.18),
                transparent 42%
              ),
              radial-gradient(
                circle at 90% 90%,
                rgba(217, 70, 239, 0.12),
                transparent 42%
              );
            padding: 40px 16px;
          "
        >
          <tr>
            <td align="center" valign="top">

              <!-- Cartão principal -->
              <table
                role="presentation"
                width="100%"
                border="0"
                cellspacing="0"
                cellpadding="0"
                style="
                  max-width: 600px;
                  overflow: hidden;
                  background-color: #0d0d0f;
                  border: 1px solid rgba(255, 255, 255, 0.12);
                  border-radius: 24px;
                  box-shadow:
                    0 20px 60px rgba(0, 0, 0, 0.65),
                    0 0 50px rgba(139, 92, 246, 0.12);
                "
              >

                <!-- Faixa superior com gradiente -->
                <tr>
                  <td
                    style="
                      height: 3px;
                      background-color: #8b5cf6;
                      background: linear-gradient(
                        90deg,
                        #8b5cf6,
                        #d946ef
                      );
                      font-size: 0;
                      line-height: 0;
                    "
                  >
                    &nbsp;
                  </td>
                </tr>

                <!-- Cabeçalho -->
                <tr>
                  <td
                    align="center"
                    style="
                      padding: 38px 28px 32px;
                      background-color: rgba(255, 255, 255, 0.035);
                      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    "
                  >
                    <img
                      src="cid:backstage-logo"
                      alt="Backstage Cena"
                      width="240"
                      style="
                        display: block;
                        width: 240px;
                        max-width: 90%;
                        height: auto;
                        margin: 0 auto 22px;
                      "
                    />

                    <p
                      style="
                        margin: 0;
                        color: #8b5cf6;
                        font-size: 11px;
                        font-weight: 700;
                        letter-spacing: 3px;
                        line-height: 1.5;
                        text-transform: uppercase;
                      "
                    >
                      Plataforma Musical Independente
                    </p>
                  </td>
                </tr>

                <!-- Conteúdo principal -->
                <tr>
                  <td style="padding: 42px 38px 36px">
                    <p
                      style="
                        margin: 0 0 14px;
                        color: #8b5cf6;
                        font-size: 12px;
                        font-weight: 700;
                        letter-spacing: 2px;
                        text-transform: uppercase;
                      "
                    >
                      Conta criada com sucesso
                    </p>

                    <h1
                      style="
                        margin: 0 0 22px;
                        color: #ffffff;
                        font-size: 30px;
                        font-weight: 800;
                        line-height: 1.2;
                      "
                    >
                      Olá, ${nomeSeguro}!
                    </h1>

                    <p
                      style="
                        margin: 0 0 18px;
                        color: #d1d5db;
                        font-size: 16px;
                        line-height: 1.8;
                      "
                    >
                      Sua conta no
                      <strong style="color: #d946ef">
                        Backstage Cena
                      </strong>
                      foi criada com sucesso.
                    </p>

                    <p
                      style="
                        margin: 0;
                        color: #a1a1aa;
                        font-size: 15px;
                        line-height: 1.8;
                      "
                    >
                      Agora você pode completar seu perfil, mostrar seus
                      talentos e se conectar com músicos, produtores e artistas
                      independentes.
                    </p>

                    ${botaoPerfil}

                    <!-- Aviso de segurança e suporte -->
                    <table
                      role="presentation"
                      width="100%"
                      border="0"
                      cellspacing="0"
                      cellpadding="0"
                      style="
                        margin-top: 32px;
                        background-color: rgba(139, 92, 246, 0.08);
                        border: 1px solid rgba(139, 92, 246, 0.28);
                        border-radius: 14px;
                      "
                    >
                      <tr>
                        <td
                          style="
                            padding: 18px 20px;
                            border-left: 3px solid #8b5cf6;
                          "
                        >
                          <p
                            style="
                              margin: 0 0 7px;
                              color: #ffffff;
                              font-size: 14px;
                              font-weight: 700;
                              line-height: 1.5;
                            "
                          >
                            Não reconhece esta conta?
                          </p>

                          <p
                            style="
                              margin: 0;
                              color: #b8b8c2;
                              font-size: 13px;
                              line-height: 1.7;
                            "
                          >
                            Se você não criou esta conta, entre em contato
                            com o suporte pelo número
                            <strong style="color: #d946ef">
                              83 98713-1376
                            </strong>.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Rodapé -->
                <tr>
                  <td
                    align="center"
                    style="
                      padding: 26px 28px 30px;
                      background-color: rgba(255, 255, 255, 0.025);
                      border-top: 1px solid rgba(255, 255, 255, 0.08);
                    "
                  >
                    <p
                      style="
                        margin: 0 0 9px;
                        color: #8b5cf6;
                        font-size: 12px;
                        font-weight: 700;
                        letter-spacing: 1.5px;
                        text-transform: uppercase;
                      "
                    >
                      Encontre parceiros. Crie projetos. Faça história.
                    </p>

                    <p
                      style="
                        margin: 0;
                        color: #71717a;
                        font-size: 12px;
                        line-height: 1.6;
                      "
                    >
                      Até breve!  

                      <strong style="color: #a1a1aa">
                        Equipe Backstage Cena
                      </strong>
                    </p>
                  </td>
                </tr>

              </table>

              <p
                style="
                  max-width: 540px;
                  margin: 22px auto 0;
                  color: #52525b;
                  font-size: 11px;
                  line-height: 1.6;
                  text-align: center;
                "
              >
                Este é um e-mail automático. Por favor, não responda
                diretamente a esta mensagem.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  return { text: texto, html }
}

/**
 * Envia o e-mail de boas-vindas após a criação da conta.
 */
async function enviarBoasVindas(
  destinatario: string,
  nome: string,
): Promise<void> {
  const config = await mailConfig()

  // O cadastro não deve falhar se o SMTP não estiver configurado.
  if (!config?.host) {
    console.warn(
      `SMTP não configurado: e-mail de boas-vindas para ${destinatario} não enviado.`,
    )

    return
  }

  if (!transporter) {
    transporter = nodemailer.createTransport(config)
  }

  const { text, html } = criarConteudoEmail(nome)

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? REMETENTE_PADRAO,
    to: destinatario,
    subject: ASSUNTO_BOAS_VINDAS,
    text,
    html,

    // Logo oficial do site incorporado no e-mail.
    attachments: [
      {
        filename: 'logo.png',
        path: path.resolve(
          process.cwd(),
          'public',
          'images',
          'logo.png',
        ),
        cid: 'backstage-logo',
        contentType: 'image/png',
      },
    ],

    ...(process.env.EMAIL_REPLY_TO && {
      replyTo: process.env.EMAIL_REPLY_TO,
    }),
  })

  if (process.env.NODE_ENV === 'development') {
    const previewUrl = nodemailer.getTestMessageUrl(info)

    if (previewUrl) {
      console.info(
        `Preview do e-mail de boas-vindas: ${previewUrl}`,
      )
    }
  }
}

export default {
  enviarBoasVindas,
}
