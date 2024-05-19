import { Text, Button, SegmentedControl, Toggle, useForm } from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import { h } from 'preact'

interface FormState {
  useColor: boolean
  colorStyle: string
  useText: boolean
  useRem: boolean
  useEffect: boolean
  useSpacing: boolean
  useScreens: boolean
  selectedBase: string
  outputType: string
}

function Form({loading, setLoading, setOutput, handleExit}: {loading: boolean, setLoading: (loading: boolean) => void, setOutput: (data: string) => void, handleExit: any}) {
  const {
    disabled,
    formState,
    handleSubmit,
    initialFocus,
    setFormState
  } = useForm<FormState>({         
    useColor: true,
    colorStyle: 'RGBA',
    useText: true,
    useRem: false,
    selectedBase: '16',
    useEffect: true,
    useSpacing: false,
    useScreens: false,
    outputType: 'config'
  }, {
    close: function (formState: FormState) {
      event?.preventDefault();
      emit('close')
    },
    submit: function (formState: FormState) {
      event?.preventDefault();
      setLoading(true)
      emit('generate', formState)
    },
    validate: function (formState: FormState) {
      if (formState.useColor === false && formState.useText === false && formState.useEffect === false) {
        emit('message', 'Please select at least one style to export')
        return false
      } else {
        return true
      }
    }
  });
  
  function updateValue(e:any) {
    const name: string = (event!.target as any).name
    if (e.target?.type === 'checkbox') {
      setFormState(e.target.checked, name as any)
    } else {
      setFormState(e.target.value, name as any)
    }
  }

  function handleCancel(e:any) {
    e.preventDefault();
    setLoading(false)
    setOutput('')
  }

  return (
  <form onSubmit={handleSubmit} class="flex flex-col gap-4 justify-between h-full" style={{marginBlockEnd: 0}}>
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label for="color-style" class="text-base">Color system</label>
        <select 
          name="colorStyle" 
          class="appearance-auto p-2"
          value={formState.colorStyle}
          onChange={updateValue} 
          {...initialFocus}
        >
          <option value="RGBA">RGBA</option>
          <option value="Hex">Hex</option>
          <option value="HSLA">HSLA</option>
        </select>
      </div>

      <div class="flex flex-col gap-4">
        <label for="color-style" class="text-base">Styles to export</label>
        <div class="flex flex-col gap-4">
          <Toggle name="useColor" value={formState.useColor} onChange={updateValue}><Text>Colors & Gradients</Text></Toggle>
          <Toggle name="useText" value={formState.useText} onChange={updateValue}><Text>Typography</Text></Toggle>
          {formState.useText === true && (
            <div class="ml-6">
              <Toggle name="useRem" value={formState.useRem} onChange={updateValue}><Text>Use REM units?</Text></Toggle>
            </div>
          )}
          {formState.useRem === true && (
            <div class="flex items-center gap-2 ml-6">
              <label class="min-w-max" for="selected-base">
                Base size
              </label>
              <select
                name="selectedBase"
                value={formState.selectedBase}
                class="appearance-auto p-2"
                onChange={updateValue}
              >
                <option value="8">8px</option>
                <option value="10">10px</option>
                <option value="12">12px</option>
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
                <option value="20">20px</option>
                <option value="21">21px</option>
                <option value="22">22px</option>
              </select>
            </div>
          )}
          <Toggle name="useSpacing" value={formState.useSpacing} onChange={updateValue}><Text>Spacing</Text></Toggle>
        </div>
        <div class="checkbox">
          <Toggle name="useEffect" value={formState.useEffect} onChange={updateValue}><Text>Effects</Text></Toggle>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label for="outputType" class="text-base">Output as</label>
        <div>
          <SegmentedControl
            name="outputType"
            value={formState.outputType}
            onChange={updateValue}
            options={[
              { value: 'config', children: 'Tailwind 3 (json)' },
              { value: 'css-vars', children: 'Tailwind 4 (CSS Variables)' }
            ]}
          />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <Button id="generate" type="submit" loading={loading} disabled={disabled} fullWidth>{loading ? 'Generating' : 'Generate'}</Button>
      {loading && (
        <Button type="button" secondary fullWidth onClick={handleCancel}>Cancel</Button>
      ) || (      
        <Button type="button" secondary fullWidth onClick={handleExit}>Close</Button>
      )}
    </div>
  </form>
)
}

export { Form }