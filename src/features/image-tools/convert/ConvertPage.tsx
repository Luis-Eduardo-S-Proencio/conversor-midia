import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router'
import { ActionBar } from '../../../components/layout/ActionBar'
import { Container } from '../../../components/layout/Container'
import { PageHeader } from '../../../components/layout/PageHeader'
import { saveBlob } from '../../../components/tool/download'
import { Dropzone } from '../../../components/tool/Dropzone'
import { usePageFileDrop } from '../../../components/tool/usePageFileDrop'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { supportsImageWorker } from '../../../workers/image-client'
import { ConvertActions } from './ConvertActions'
import { ConvertFiles } from './ConvertFiles'
import { ConvertOptions } from './ConvertOptions'
import { ConvertResult } from './ConvertResult'
import { ACCEPTED_TYPES } from './settings'
import { useConvertTool } from './useConvertTool'

function BackToImages() {
  return (
    <Link to="/imagens" className="inline-flex min-h-11 items-center gap-1.5 text-fg-muted transition-colors hover:text-fg pointer-fine:min-h-0">
      <Icon icon={ArrowLeft} size="sm" />
      Imagens
    </Link>
  )
}

export function ConvertPage() {
  const tool = useConvertTool()
  const { items, summary } = tool
  const optionsHeadingId = useId()
  const filesHeading = useRef<HTMLHeadingElement>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const pickerButton = useRef<HTMLButtonElement>(null)
  const focusPickerWhenEmpty = useRef(false)
  const supported = supportsImageWorker()

  usePageFileDrop(tool.addFiles, supported && !summary.isConverting)

  // Ao terminar, leva o foco ao resultado, onde estão os botões de download.
  useEffect(() => {
    if (tool.completedRuns > 0) resultHeading.current?.focus()
  }, [tool.completedRuns])

  // O botão focado some ao esvaziar a lista: o foco vai para "Selecionar imagens", não para o topo.
  useEffect(() => {
    if (items.length > 0 || !focusPickerWhenEmpty.current) return
    focusPickerWhenEmpty.current = false
    pickerButton.current?.focus()
  }, [items.length])

  function handleReset() {
    focusPickerWhenEmpty.current = true
    tool.reset()
  }

  function handleRemove(id: string) {
    if (items.length === 1) {
      focusPickerWhenEmpty.current = true
      tool.remove(id)
      return
    }
    tool.remove(id)
    filesHeading.current?.focus()
  }

  function handleDownload(id: string) {
    const file = tool.getResultFile(id)
    if (file) saveBlob(file, file.name)
  }

  const actions = (size: 'md' | 'lg') => (
    <ConvertActions
      summary={summary}
      run={tool.run}
      size={size}
      onConvert={() => void tool.convert()}
      onCancel={tool.cancel}
      onReset={handleReset}
      getFiles={tool.getResultFiles}
      bundle={tool.createZip}
    />
  )

  return (
    <>
      <title>Converter imagem · Media Tools</title>
      <Container className="grid gap-6 py-8 md:gap-8 md:py-12">
        <PageHeader
          breadcrumb={<BackToImages />}
          title="Converter imagem"
          description="Converta entre JPG, PNG e WEBP, um ou vários arquivos de uma vez. As imagens não saem do seu dispositivo."
        />

        {!supported ? (
          <Alert variant="error" title="Navegador sem suporte" live={false}>
            Este navegador não tem os recursos necessários para converter imagens. Use uma versão recente do Chrome, Edge,
            Firefox ou Safari.
          </Alert>
        ) : items.length === 0 ? (
          <Dropzone
            buttonRef={pickerButton}
            accept={ACCEPTED_TYPES}
            onFiles={tool.addFiles}
            buttonLabel="Selecionar imagens"
            dragLabel="Arraste imagens para cá"
            hint="JPG, PNG ou WEBP · até 50 MB por arquivo · até 20 arquivos"
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <ConvertFiles
              items={items}
              settings={tool.settings}
              busy={summary.isConverting}
              notice={tool.notice}
              headingRef={filesHeading}
              onAdd={tool.addFiles}
              onRemove={handleRemove}
              onClear={handleReset}
              onDownload={handleDownload}
            />
            <section
              aria-labelledby={summary.hasResults ? undefined : optionsHeadingId}
              aria-label={summary.hasResults ? 'Resultado' : undefined}
              className="grid gap-5 rounded-lg border border-border bg-surface p-4 md:p-5 lg:sticky lg:top-20"
            >
              {summary.hasResults ? (
                <ConvertResult items={items} headingRef={resultHeading} />
              ) : (
                <>
                  <h2 id={optionsHeadingId} className="text-lg font-semibold tracking-tight">
                    Opções
                  </h2>
                  <ConvertOptions
                    settings={tool.settings}
                    onChange={tool.updateSettings}
                    webpSupported={tool.webpSupported}
                    hasTransparency={summary.hasTransparency}
                    disabled={summary.isConverting}
                  />
                </>
              )}
              <div className="hidden gap-2 md:grid">{actions('md')}</div>
              {summary.hasResults && (
                // Depois do download, a ação principal; no celular o download fica na barra fixa.
                <Button variant="ghost" icon={SlidersHorizontal} onClick={tool.invalidateResults}>
                  Alterar opções
                </Button>
              )}
            </section>
          </div>
        )}

        {supported && items.length > 0 && <ActionBar className="md:hidden">{actions('lg')}</ActionBar>}

        <p role="status" className="sr-only">
          {tool.announcement}
        </p>
      </Container>
    </>
  )
}
