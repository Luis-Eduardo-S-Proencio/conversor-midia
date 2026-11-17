import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { Alert } from './Alert'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('determinada: expõe valor, mínimo e máximo', async () => {
    const screen = await render(<ProgressBar label="Convertendo foto.png" value={64.4} />)
    const bar = screen.getByRole('progressbar', { name: 'Convertendo foto.png' })

    await expect.element(bar).toHaveAttribute('aria-valuenow', '64')
    await expect.element(bar).toHaveAttribute('aria-valuemin', '0')
    await expect.element(bar).toHaveAttribute('aria-valuemax', '100')
    await expect.element(screen.getByText('64%')).toBeVisible()
  })

  it('limita valores fora de 0 a 100', async () => {
    const screen = await render(<ProgressBar label="Progresso" value={140} />)
    await expect.element(screen.getByRole('progressbar', { name: 'Progresso' })).toHaveAttribute('aria-valuenow', '100')
  })

  it('indeterminada: sem valor numérico', async () => {
    const screen = await render(<ProgressBar label="Preparando arquivos" />)
    await expect.element(screen.getByRole('progressbar', { name: 'Preparando arquivos' })).not.toHaveAttribute('aria-valuenow')
  })

  it('com rótulo oculto continua nomeada', async () => {
    const screen = await render(<ProgressBar label="Enviando" value={10} hideLabel />)
    await expect.element(screen.getByRole('progressbar', { name: 'Enviando' })).toBeInTheDocument()
  })
})

describe('Alert', () => {
  it('erro interrompe o leitor de tela (role alert)', async () => {
    const screen = await render(<Alert variant="error" title="Formato não suportado">Escolha um JPG.</Alert>)
    await expect.element(screen.getByRole('alert').getByText('Formato não suportado')).toBeVisible()
  })

  it('sucesso, aviso e informação usam role status', async () => {
    const screen = await render(
      <>
        <Alert variant="success" title="Pronto" />
        <Alert variant="warning" title="Atenção" />
        <Alert variant="info" title="Dica" />
      </>,
    )
    expect(screen.getByRole('status').elements()).toHaveLength(3)
  })

  it('mensagem fixa da página não é região viva', async () => {
    const screen = await render(<Alert variant="info" title="Em breve" live={false} />)
    await expect.element(screen.getByText('Em breve')).toBeVisible()
    expect(screen.getByRole('status').elements()).toHaveLength(0)
  })
})
