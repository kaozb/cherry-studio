// import { useRuntime } from '@renderer/hooks/useRuntime'
import { useSettings } from '@renderer/hooks/useSettings'
import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import type { Message } from '@renderer/types/newMessage'
import { Popover } from 'antd'
import { t } from 'i18next'
import styled from 'styled-components'

interface MessageTokensProps {
  message: Message
  isLastMessage?: boolean
}

const MessgeTokens: React.FC<MessageTokensProps> = ({ message }) => {
  const { showTokens } = useSettings()
  // const { generating } = useRuntime()
  const locateMessage = () => {
    EventEmitter.emit(EVENT_NAMES.LOCATE_MESSAGE + ':' + message.id, false)
  }

  if (!message.usage) {
    return <div />
  }

  if (message.role === 'user') {
    return (
      <MessageMetadata className="message-tokens" onClick={locateMessage}>
        {showTokens && `Tokens: ${message?.usage?.total_tokens}`}
      </MessageMetadata>
    )
  }

  if (message.role === 'assistant') {
    let metrixs = ''
    let hasMetrics = false
    if (message?.metrics?.completion_tokens && message?.metrics?.time_completion_millsec) {
      hasMetrics = true
      metrixs = t('settings.messages.metrics', {
        time_first_token_millsec: message?.metrics?.time_first_token_millsec,
        token_speed: (message?.metrics?.completion_tokens / (message?.metrics?.time_completion_millsec / 1000)).toFixed(
          0
        )
      })
    }

    const tokensInfo = (
      <span className="tokens">
        Tokens:
        <span>{message?.usage?.total_tokens}</span>
        <span>↑{message?.usage?.prompt_tokens}</span>
        <span>↓{message?.usage?.completion_tokens}</span>
      </span>
    )

    return (
      <MessageMetadata className="message-tokens" onClick={locateMessage}>
        {hasMetrics ? (
          <Popover content={metrixs} placement="top" trigger="hover" styles={{ root: { fontSize: 11 } }}>
            {showTokens && tokensInfo}
          </Popover>
        ) : (
          tokensInfo
        )}
      </MessageMetadata>
    )
  }

  return null
}

const MessageMetadata = styled.div`
  font-size: 11px;
  color: var(--color-text-2);
  user-select: text;
  margin: 2px 0;
  cursor: pointer;
  text-align: right;

  .tokens {
    display: block;

    span {
      padding: 0 2px;
    }
  }
`

export default MessgeTokens
