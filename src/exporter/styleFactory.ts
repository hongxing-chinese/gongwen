import {
  AlignmentType,
  type IParagraphOptions,
  type IRunOptions,
  type IFontAttributesProperties,
  LineRuleType,
} from 'docx'
import { NodeType } from '../types/ast'
import type { DocumentConfig } from '../types/documentConfig'
import { ptToTwip, cmToTwip, CHARS_PER_LINE } from '../types/documentConfig'

/**
 * 构建 IFontAttributesProperties，支持中英文字体分离
 * 
 * 字体分配规则：
 * - ascii: 基本西文字符（英文字母、数字）
 * - eastAsia: 东亚文字（中文、日文、韩文）
 * - hAnsi: 高ANSI字符（包括省略号、破折号等中文标点）
 * 
 * 注意：省略号（U+2026）、破折号（U+2014）等字符被 Word 归类为 hAnsi，
 * 因此 hAnsi 需要使用中文字体以确保这些标点使用正确的中文字体。
 */
function font(eastAsia: string, ascii = 'Times New Roman'): IFontAttributesProperties {
  return { ascii, eastAsia, hAnsi: eastAsia, cs: ascii }
}

/**
 * 计算首行缩进值（twips）
 * 缩进 = 字符数 × (字号 + 字符间距)
 * 字符间距用于确保每行恰好28字，缩进也需要同步调整
 */
function calculateFirstLineIndent(config: DocumentConfig): number {
  return calculateCharWidth(config) * config.body.firstLineIndent
}

/**
 * 计算单个字符宽度（twips）
 * 字符宽度 = 字号 + 字符间距
 */
function calculateCharWidth(config: DocumentConfig): number {
  const availableTwips = 11906 - cmToTwip(config.margins.left) - cmToTwip(config.margins.right)
  const charSpacingTwips = Math.floor(availableTwips / CHARS_PER_LINE - config.body.fontSize * 20)
  return config.body.fontSize * 20 + charSpacingTwips
}

/** 节点类型 → 段落样式 */
export function getParagraphStyle(type: NodeType, config: DocumentConfig): Partial<IParagraphOptions> {
  const lineSpacingValue = ptToTwip(config.body.lineSpacing)
  const firstLineIndentTwips = calculateFirstLineIndent(config)
  const charWidthTwips = calculateCharWidth(config)

  const BASE_SPACING = {
    line: lineSpacingValue,
    lineRule: LineRuleType.EXACT,
    before: 0,
    after: 0,
  } as const

  const BODY_INDENT = { firstLine: firstLineIndentTwips, left: 0 } as const

  switch (type) {
    case NodeType.DOCUMENT_TITLE:
      return {
        alignment: AlignmentType.CENTER,
        spacing: {
          line: ptToTwip(config.title.lineSpacing),
          lineRule: LineRuleType.EXACT,
          before: 0,
          after: ptToTwip(config.body.lineSpacing),
        },
      }

    case NodeType.ADDRESSEE:
      return {
        alignment: AlignmentType.JUSTIFIED,
        spacing: { ...BASE_SPACING, before: lineSpacingValue },
        indent: { left: 0 },
      }

    case NodeType.ATTACHMENT:
      return {
        alignment: AlignmentType.JUSTIFIED,
        spacing: { ...BASE_SPACING, before: lineSpacingValue },
        indent: { left: 2 * charWidthTwips },
      }

    case NodeType.DATE:
      return {
        alignment: AlignmentType.RIGHT,
        spacing: BASE_SPACING,
        indent: { right: 4 * charWidthTwips },
      }

    // 正文及所有标题级别：两端对齐 + 首行缩进
    default:
      return {
        alignment: AlignmentType.JUSTIFIED,
        spacing: BASE_SPACING,
        indent: BODY_INDENT,
      }
  }
}

/** 节点类型 → 文本样式 (font / size / bold) */
export function getRunStyle(type: NodeType, config: DocumentConfig): Partial<IRunOptions> {
  const bodyFontSize = config.body.fontSize * 2 // pt → half-point
  const titleFontSize = config.title.fontSize * 2

  // 字符间距微调：使每行恰好 28 字 (GB/T 9704)
  // characterSpacing 单位为 twips (1/20 pt)，向下取整确保不超出可用宽度
  const availableTwips = 11906 - cmToTwip(config.margins.left) - cmToTwip(config.margins.right)
  const charSpacing = Math.floor(availableTwips / CHARS_PER_LINE - config.body.fontSize * 20)

  switch (type) {
    case NodeType.DOCUMENT_TITLE:
      return {
        font: font(config.title.fontFamily),
        size: titleFontSize,
      }

    case NodeType.HEADING_1:
      return {
        font: font(config.advanced.h1.fontFamily, config.advanced.h1.asciiFontFamily || config.advanced.h1.fontFamily),
        size: config.advanced.h1.fontSize * 2,
        characterSpacing: charSpacing,
      }

    case NodeType.HEADING_2:
      return {
        font: font(config.advanced.h2.fontFamily, config.advanced.h2.asciiFontFamily || config.advanced.h2.fontFamily),
        size: config.advanced.h2.fontSize * 2,
        characterSpacing: charSpacing,
      }

    case NodeType.HEADING_3:
      return {
        font: font(config.advanced.h3.fontFamily, config.advanced.h3.asciiFontFamily || config.advanced.h3.fontFamily),
        size: config.advanced.h3.fontSize * 2,
        bold: true,
        characterSpacing: charSpacing,
      }

    case NodeType.ADDRESSEE:
      return {
        font: font(
          config.advanced.addressee.fontFamily,
          config.advanced.addressee.asciiFontFamily || config.advanced.addressee.fontFamily,
        ),
        size: config.advanced.addressee.fontSize * 2,
        characterSpacing: charSpacing,
      }

    case NodeType.HEADING_4:
    case NodeType.PARAGRAPH:
    case NodeType.ATTACHMENT:
    case NodeType.DATE:
    default:
      return {
        font: font(config.body.fontFamily),
        size: bodyFontSize,
        characterSpacing: charSpacing,
      }
  }
}
