import { render, VerticalSpace } from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import { Form } from './components/form'
import { ResultsModal } from './components/results'
import { h } from 'preact'
import { useEffect, useState, useRef } from 'preact/hooks'
import '!./styles/output.css'

function Plugin() {
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const textAreaRef = useRef(null)

  function handleExit() {
    emit('close')
  }

  useEffect(() => {
    window.addEventListener('message', (message) => {
      if (message.data.pluginMessage.type === 'generated') {
        const data = JSON.parse(message.data.pluginMessage.data)
        setOutput(data)
        setLoading(false)
      } else if (message.data.pluginMessage.type === 'error') {
        console.error('Error', message.data.pluginMessage.data)
        setLoading(false)
        setOutput('')
      }
    })
  }, [])

  function handleCopy(e: any) {
    e.preventDefault()
    emit('copy', { output })
    ;(textAreaRef.current! as HTMLTextAreaElement).select()
    document.execCommand('copy')
  }

  return (
    <div className="flex flex-col px-4 h-full">
      <VerticalSpace space="medium" />

      <Form loading={loading} setLoading={setLoading} setOutput={setOutput} handleExit={handleExit} />

      <ResultsModal handleCopy={handleCopy} handleExit={handleExit} output={output} textAreaRef={textAreaRef} />

      <VerticalSpace space="medium" />
    </div>
  )
}

export default render(Plugin)
