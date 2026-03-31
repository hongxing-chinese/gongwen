import { describe, expect, it } from 'vitest'
import { getAttachmentParagraphStyle, getParagraphStyle } from '../styleFactory'
import { NodeType } from '../../types/ast'
import { DEFAULT_CONFIG } from '../../types/documentConfig'

describe('getParagraphStyle', () => {
  it('正文段落保留首行缩进', () => {
    const style = getParagraphStyle(NodeType.PARAGRAPH, DEFAULT_CONFIG)

    expect(style.indent).toMatchObject({ left: 0 })
    expect(style.indent).toHaveProperty('firstLine')
  })

  it('主送机关默认不再额外设置段前', () => {
    const style = getParagraphStyle(NodeType.ADDRESSEE, DEFAULT_CONFIG)

    expect(style.spacing).toMatchObject({ before: 0, after: 0 })
  })
})

describe('getAttachmentParagraphStyle', () => {
  it('附件默认保留段前空一行', () => {
    const style = getAttachmentParagraphStyle(false, false, DEFAULT_CONFIG)

    expect(style.spacing).toHaveProperty('before')
  })

  it('标题后首个附件可去掉段前', () => {
    const style = getAttachmentParagraphStyle(false, false, DEFAULT_CONFIG, true)

    expect(style.spacing).not.toHaveProperty('before')
  })
})
