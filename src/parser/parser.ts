import type { DocumentNode, GongwenAST } from '../types/ast'
import { NodeType } from '../types/ast'
import { detectNodeType, HEADING_1_RE } from './matchers'

/** 不应被识别为发文机关署名的结尾标点 */
const SIGNATURE_EXCLUDE_ENDINGS = ['。', '：', ':', '；', ';', '！', '!', '？', '?', '，', ',']

/**
 * 检查节点是否可能为发文机关署名
 * 条件：类型为 PARAGRAPH，内容长度不超过15字，不以特定标点结尾
 */
function isPossibleSignature(node: DocumentNode | undefined): boolean {
  if (!node || node.type !== NodeType.PARAGRAPH) return false
  const content = node.content.trim()
  if (content.length === 0 || content.length > 15) return false
  return !SIGNATURE_EXCLUDE_ENDINGS.some(ending => content.endsWith(ending))
}

/**
 * 将纯文本解析为公文 AST（纯函数）
 *
 * 规则:
 * 1. 跳过空行
 * 2. 第一个非空行视为公文标题（DOCUMENT_TITLE）
 * 3. 后续行通过正则检测类型
 * 4. 解析完成后识别发文机关署名（DATE 前一个节点，满足条件则改为 SIGNATURE）
 */
export function parseGongwen(text: string): GongwenAST {
  const lines = text.split('\n')
  let title: DocumentNode | null = null
  const body: DocumentNode[] = []

  let titleFound = false
  let addresseeChecked = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()

    // 跳过空行
    if (trimmed.length === 0) continue

    const lineNumber = i + 1

    // 首个非空行 → 公文标题
    if (!titleFound) {
      title = { type: NodeType.DOCUMENT_TITLE, content: trimmed, lineNumber }
      titleFound = true
      continue
    }

    // 后续行：先检测主送机关（标题后第一个非空行 + 冒号结尾），再做正则检测
    if (!addresseeChecked) {
      addresseeChecked = true
      if (
        (trimmed.endsWith('：') || trimmed.endsWith(':')) &&
        !HEADING_1_RE.test(trimmed)
      ) {
        body.push({ type: NodeType.ADDRESSEE, content: trimmed, lineNumber })
        continue
      }
    }

    // 正则检测类型
    const type = detectNodeType(trimmed)
    body.push({ type, content: trimmed, lineNumber })
  }

  // 识别发文机关署名：遍历 body，找到 DATE 节点，检查前一个节点
  for (let i = 1; i < body.length; i++) {
    if (body[i].type === NodeType.DATE && isPossibleSignature(body[i - 1])) {
      body[i - 1] = { ...body[i - 1], type: NodeType.SIGNATURE }
    }
  }

  return { title, body }
}
