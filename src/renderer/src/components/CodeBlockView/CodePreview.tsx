import { CodeTool, TOOL_SPECS, useCodeTool } from '@renderer/components/CodeToolbar'
import { useCodeStyle } from '@renderer/context/CodeStyleProvider'
import { useCodeHighlight } from '@renderer/hooks/useCodeHighlight'
import { useSettings } from '@renderer/hooks/useSettings'
import { uuid } from '@renderer/utils'
import { getReactStyleFromToken } from '@renderer/utils/shiki'
import { useVirtualizer } from '@tanstack/react-virtual'
import { debounce } from 'lodash'
import { ChevronsDownUp, ChevronsUpDown, Text as UnWrapIcon, WrapText as WrapIcon } from 'lucide-react'
import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface CodePreviewProps {
  children: string
  language: string
  setTools?: (value: React.SetStateAction<CodeTool[]>) => void
}

const MAX_COLLAPSE_HEIGHT = 350

/**
 * Shiki 流式代码高亮组件
 * - 通过 shiki tokenizer 处理流式响应，高性能
 * - 使用虚拟滚动和按需高亮，改善页面内有大量长代码块时的响应
 * - 并发安全
 */
const CodePreview = ({ children, language, setTools }: CodePreviewProps) => {
  const { codeShowLineNumbers, fontSize, codeCollapsible, codeWrappable } = useSettings()
  const { getShikiPreProperties, isShikiThemeDark } = useCodeStyle()
  const [expandOverride, setExpandOverride] = useState(!codeCollapsible)
  const [unwrapOverride, setUnwrapOverride] = useState(!codeWrappable)
  const shikiThemeRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const callerId = useRef(`${Date.now()}-${uuid()}`).current

  const rawLines = useMemo(() => (typeof children === 'string' ? children.trimEnd().split('\n') : []), [children])

  const { t } = useTranslation()
  const { registerTool, removeTool } = useCodeTool(setTools)

  // 展开/折叠工具
  useEffect(() => {
    registerTool({
      ...TOOL_SPECS.expand,
      icon: expandOverride ? <ChevronsDownUp className="icon" /> : <ChevronsUpDown className="icon" />,
      tooltip: expandOverride ? t('code_block.collapse') : t('code_block.expand'),
      visible: () => {
        const scrollHeight = scrollerRef.current?.scrollHeight
        return codeCollapsible && (scrollHeight ?? 0) > MAX_COLLAPSE_HEIGHT
      },
      onClick: () => setExpandOverride((prev) => !prev)
    })

    return () => removeTool(TOOL_SPECS.expand.id)
  }, [codeCollapsible, expandOverride, registerTool, removeTool, t])

  // 自动换行工具
  useEffect(() => {
    registerTool({
      ...TOOL_SPECS.wrap,
      icon: unwrapOverride ? <WrapIcon className="icon" /> : <UnWrapIcon className="icon" />,
      tooltip: unwrapOverride ? t('code_block.wrap.on') : t('code_block.wrap.off'),
      visible: () => codeWrappable,
      onClick: () => setUnwrapOverride((prev) => !prev)
    })

    return () => removeTool(TOOL_SPECS.wrap.id)
  }, [codeWrappable, unwrapOverride, registerTool, removeTool, t])

  // 重置用户操作（可以考虑移除，保持用户操作结果）
  useEffect(() => {
    setExpandOverride(!codeCollapsible)
  }, [codeCollapsible])

  // 重置用户操作（可以考虑移除，保持用户操作结果）
  useEffect(() => {
    setUnwrapOverride(!codeWrappable)
  }, [codeWrappable])

  const shouldCollapse = useMemo(() => codeCollapsible && !expandOverride, [codeCollapsible, expandOverride])
  const shouldWrap = useMemo(() => codeWrappable && !unwrapOverride, [codeWrappable, unwrapOverride])

  // 计算行号数字位数
  const gutterDigits = useMemo(
    () => (codeShowLineNumbers ? Math.max(rawLines.length.toString().length, 1) : 0),
    [codeShowLineNumbers, rawLines.length]
  )

  // 设置 pre 标签属性
  useLayoutEffect(() => {
    getShikiPreProperties(language).then((properties) => {
      const shikiTheme = shikiThemeRef.current
      if (shikiTheme) {
        shikiTheme.className = `${properties.class || 'shiki'}`
        // 滚动条适应 shiki 主题变化而非应用主题
        shikiTheme.classList.add(isShikiThemeDark ? 'shiki-dark' : 'shiki-light')

        if (properties.style) {
          shikiTheme.style.cssText += `${properties.style}`
        }
        shikiTheme.tabIndex = properties.tabindex
      }
    })
  }, [language, getShikiPreProperties, isShikiThemeDark])

  // Virtualizer 配置
  const getScrollElement = useCallback(() => scrollerRef.current, [])
  const getItemKey = useCallback((index: number) => `${callerId}-${index}`, [callerId])
  // `line-height: 1.6` 为全局样式，但是为了避免测量误差在这里取整
  const estimateSize = useCallback(() => Math.round((fontSize - 1) * 1.6), [fontSize])

  // 创建 virtualizer 实例
  const virtualizer = useVirtualizer({
    count: rawLines.length,
    getScrollElement,
    getItemKey,
    estimateSize,
    overscan: 20
  })

  const virtualItems = virtualizer.getVirtualItems()

  // 使用代码高亮 Hook
  const { tokenLines, highlightLines } = useCodeHighlight({
    rawLines,
    language,
    callerId
  })

  // 防抖高亮提高流式响应的性能，数字大一点也不会影响用户体验
  const debouncedHighlightLines = useMemo(() => debounce(highlightLines, 300), [highlightLines])

  // 渐进式高亮
  useEffect(() => {
    if (virtualItems.length > 0 && shikiThemeRef.current) {
      const lastIndex = virtualItems[virtualItems.length - 1].index
      debouncedHighlightLines(lastIndex + 1)
    }
  }, [virtualItems, debouncedHighlightLines])

  return (
    <div ref={shikiThemeRef}>
      <ScrollContainer
        ref={scrollerRef}
        className="shiki-scroller"
        $wrap={shouldWrap}
        $lineHeight={estimateSize()}
        style={
          {
            '--gutter-width': `${gutterDigits}ch`,
            fontSize: `${fontSize - 1}px`,
            maxHeight: shouldCollapse ? MAX_COLLAPSE_HEIGHT : undefined
          } as React.CSSProperties
        }>
        <div
          className="shiki-list"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}>
          <div
            style={{
              /*
               * FIXME: @tanstack/react-virtual 使用绝对定位，但是会导致
               * 有气泡样式 `self-end` 并且气泡中只有代码块时整个代码块收缩
               * 到最小宽度（目前应该是工具栏的宽度）。改为相对定位可以保证宽
               * 度足够，目前没有发现其他副作用。
               * 如果发现破坏虚拟列表功能，或者将来有更好的解决方案，再调整。
               */
              position: 'relative',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
              willChange: 'transform'
            }}>
            {virtualizer.getVirtualItems().map((virtualItem) => (
              <div key={virtualItem.key} data-index={virtualItem.index} ref={virtualizer.measureElement}>
                <VirtualizedRow
                  rawLine={rawLines[virtualItem.index]}
                  tokenLine={tokenLines[virtualItem.index]}
                  showLineNumbers={codeShowLineNumbers}
                  index={virtualItem.index}
                />
              </div>
            ))}
          </div>
        </div>
      </ScrollContainer>
    </div>
  )
}

CodePreview.displayName = 'CodePreview'

interface VirtualizedRowData {
  rawLine: string
  tokenLine?: any[]
  showLineNumbers: boolean
}

/**
 * 单行代码渲染
 */
const VirtualizedRow = memo(
  ({ rawLine, tokenLine, showLineNumbers, index }: VirtualizedRowData & { index: number }) => {
    return (
      <div className="line">
        {showLineNumbers && <span className="line-number">{index + 1}</span>}
        <span className="line-content">
          {tokenLine ? (
            // 渲染高亮后的内容
            tokenLine.map((token, tokenIndex) => (
              <span key={tokenIndex} style={getReactStyleFromToken(token)}>
                {token.content}
              </span>
            ))
          ) : (
            // 渲染原始内容
            <span className="line-content-raw">{rawLine || ' '}</span>
          )}
        </span>
      </div>
    )
  }
)

VirtualizedRow.displayName = 'VirtualizedRow'

const ScrollContainer = styled.div<{
  $wrap?: boolean
  $lineHeight?: number
}>`
  display: block;
  overflow: auto;
  position: relative;
  border-radius: inherit;
  padding: 0.5em 1em;

  .line {
    display: flex;
    align-items: flex-start;
    width: 100%;
    line-height: ${(props) => props.$lineHeight}px;

    .line-number {
      width: var(--gutter-width, 1.2ch);
      text-align: right;
      opacity: 0.35;
      margin-right: 1rem;
      user-select: none;
      flex-shrink: 0;
      overflow: hidden;
      font-family: inherit;
      font-variant-numeric: tabular-nums;
    }

    .line-content {
      flex: 1;
      * {
        white-space: ${(props) => (props.$wrap ? 'pre-wrap' : 'pre')};
        overflow-wrap: ${(props) => (props.$wrap ? 'break-word' : 'normal')};
      }
    }

    .line-content-raw {
      opacity: 0.35;
    }
  }
`

export default memo(CodePreview)
