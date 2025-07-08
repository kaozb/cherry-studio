import { TopView } from '@renderer/components/TopView'
import { useDynamicLabelWidth } from '@renderer/hooks/useDynamicLabelWidth'
import { useProvider } from '@renderer/hooks/useProvider'
import { EndpointType, Model, Provider } from '@renderer/types'
import { Button, Flex, Form, FormProps, Modal, Select } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ShowParams {
  title: string
  provider: Provider
  batchModels: Model[]
}

interface Props extends ShowParams {
  resolve: (data: any) => void
}

type FieldType = {
  provider: string
  group?: string
  endpointType?: EndpointType
}

const PopupContainer: React.FC<Props> = ({ title, provider, resolve, batchModels }) => {
  const [open, setOpen] = useState(true)
  const [form] = Form.useForm()
  const { addModel } = useProvider(provider.id)
  const { t } = useTranslation()

  const onOk = () => {
    setOpen(false)
  }

  const onCancel = () => {
    setOpen(false)
  }

  const onClose = () => {
    resolve({})
  }

  const onAddModel = (values: FieldType) => {
    batchModels.forEach((model) => {
      addModel({
        ...model,
        endpoint_type: values.endpointType
      })
    })
    return true
  }

  const onFinish: FormProps<FieldType>['onFinish'] = (values) => {
    if (onAddModel(values)) {
      resolve({})
    }
  }

  return (
    <Modal
      title={title}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      maskClosable={false}
      afterClose={onClose}
      footer={null}
      transitionName="animation-move-down"
      centered>
      <Form
        form={form}
        labelCol={{ style: { width: useDynamicLabelWidth([t('settings.models.add.endpoint_type')]) } }}
        labelAlign="left"
        colon={false}
        style={{ marginTop: 25 }}
        onFinish={onFinish}
        initialValues={{
          endpointType: 'openai'
        }}>
        <Form.Item
          name="endpointType"
          label={t('settings.models.add.endpoint_type')}
          tooltip={t('settings.models.add.endpoint_type.tooltip')}
          rules={[{ required: true, message: t('settings.models.add.endpoint_type.required') }]}>
          <Select placeholder={t('settings.models.add.endpoint_type.placeholder')}>
            <Select.Option value="openai">OpenAI</Select.Option>
            <Select.Option value="openai-response">OpenAI-Response</Select.Option>
            <Select.Option value="anthropic">Anthropic</Select.Option>
            <Select.Option value="gemini">Gemini</Select.Option>
            <Select.Option value="jina-rerank">Jina-Rerank</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item style={{ marginBottom: 8, textAlign: 'center' }}>
          <Flex justify="end" align="center" style={{ position: 'relative' }}>
            <Button type="primary" htmlType="submit" size="middle">
              {t('settings.models.add.add_model')}
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default class NewApiBatchAddModelPopup {
  static topviewId = 0
  static hide() {
    TopView.hide('NewApiBatchAddModelPopup')
  }
  static show(props: ShowParams) {
    return new Promise<any>((resolve) => {
      TopView.show(
        <PopupContainer
          {...props}
          resolve={(v) => {
            resolve(v)
            this.hide()
          }}
        />,
        'NewApiBatchAddModelPopup'
      )
    })
  }
}
