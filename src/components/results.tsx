import { Modal, IconButton, IconNavigateBack32, IconCross32, Text, Button } from '@create-figma-plugin/ui'
import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'

function ResultsModal({
  handleCopy,
  handleExit,
  output,
  textAreaRef,
}: { handleCopy: any; handleExit: any; output: string; textAreaRef: any }) {
  const [isOpen, setIsOpen] = useState(false)

  function handleCloseButtonClick(event: any) {
    setIsOpen(false)
  }

  useEffect(() => {
    window.addEventListener('message', (message) => {
      if (message.data.pluginMessage.type === 'generated') {
        const data = JSON.parse(message.data.pluginMessage.data)
        setIsOpen(true)
      } else if (message.data.pluginMessage.type === 'error') {
        console.error('Error', message.data.pluginMessage.data)
        setIsOpen(false)
      }
    })
  }, [])

  return (
    <Modal open={isOpen} transition={true} position="right">
      <div style={{ width: '100%', height: '100%' }} class="flex flex-col gap-2 p-4">
        <div class="flex gap-4 justify-between">
          <IconButton onClick={handleCloseButtonClick} title="Go back">
            <IconNavigateBack32 />
          </IconButton>
          <Button onClick={handleCopy} class="w-full">
            <Text>Copy to Clipboard</Text>
          </Button>
          <IconButton onClick={handleExit} title="Close">
            <IconCross32 />
          </IconButton>
        </div>
        <div class="font-mono h-full">
          <textarea
            name="output"
            class="overflow-x-scroll overflow-wrap whitespace-pre w-full h-full resize-none bg-transparent"
            ref={textAreaRef}
            value={output}
            onClick={handleCopy}
            readOnly
          >
            Select all
          </textarea>
        </div>
      </div>
    </Modal>
  )
}

export { ResultsModal }
