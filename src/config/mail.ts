import nodemailer from 'nodemailer'

/**
 * É uma função `async`, e não um objeto, porque em desenvolvimento a conta de
 * teste do Ethereal é criada em tempo de execução — o que é uma chamada de rede.
 *
 * Em produção, basta preencher EMAIL_HOST/EMAIL_USER/EMAIL_PASS no .env que
 * este arquivo passa a usar o provedor real, sem precisar mexer em mais nada.
 */
async function mailConfig() {
  const config = {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  }

  if (process.env.NODE_ENV === 'development' && !config.host) {
    const testAccount = await nodemailer.createTestAccount()

    return {
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    }
  }

  return config
}

export default mailConfig
