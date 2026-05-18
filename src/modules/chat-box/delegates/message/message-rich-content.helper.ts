import { ChatMessageContentFormat } from '@modules/chat-box/message-management/constants/content-format.constant';
import { BadRequestException } from '@nestjs/common';

const MAX_RICH_CONTENT_BYTES = 16 * 1024;
const MAX_TOTAL_NODES = 1200;
const MAX_TREE_DEPTH = 8;
const MAX_MENTION_NODES = 50;
const MAX_LINK_MARKS = 50;
const MAX_MENTION_LABEL_LENGTH = 200;
const MAX_CANONICAL_TEXT_LENGTH = 20_000;

const ALLOWED_NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'text',
  'bulletList',
  'orderedList',
  'listItem',
  'hardBreak',
  'mention',
]);
const ALLOWED_MARK_TYPES = new Set([
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'link',
]);
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const UUID_V4_OR_V5_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RichValidationStats = {
  nodeCount: number;
  mentionCount: number;
  linkCount: number;
};

export type NormalizedMessageRichPayload = {
  content?: string;
  richContent?: Record<string, any>;
  contentFormat: ChatMessageContentFormat;
};

export function normalizeMessageContentFormat(
  value?: ChatMessageContentFormat | null,
): ChatMessageContentFormat | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (
    value !== ChatMessageContentFormat.PLAIN_TEXT &&
    value !== ChatMessageContentFormat.RICH_TEXT_V1
  ) {
    throw new BadRequestException(
      'contentFormat must be one of plain_text or rich_text_v1',
    );
  }
  return value;
}

export function resolveMessageContentFormatByRichContent(
  richContent?: Record<string, any> | null,
): ChatMessageContentFormat {
  return richContent
    ? ChatMessageContentFormat.RICH_TEXT_V1
    : ChatMessageContentFormat.PLAIN_TEXT;
}

export function normalizeMessageRichPayload(params: {
  content?: string | null;
  richContent?: Record<string, any> | null;
  contentFormat?: ChatMessageContentFormat | null;
  requireContent?: boolean;
  allowEmptyContent?: boolean;
}): NormalizedMessageRichPayload {
  const requestedFormat = normalizeMessageContentFormat(params.contentFormat);
  const plainTextContent = normalizePlainTextContent(params.content);
  const normalizedRichContent = normalizeRichContentInput(params.richContent);

  if (
    requestedFormat === ChatMessageContentFormat.RICH_TEXT_V1 &&
    !normalizedRichContent
  ) {
    throw new BadRequestException(
      'richContent is required when contentFormat is rich_text_v1',
    );
  }
  if (
    requestedFormat === ChatMessageContentFormat.PLAIN_TEXT &&
    normalizedRichContent
  ) {
    throw new BadRequestException(
      'richContent must be empty when contentFormat is plain_text',
    );
  }

  if (!normalizedRichContent) {
    const finalContent =
      plainTextContent ||
      (params.allowEmptyContent === true ? '' : undefined);
    if (params.requireContent && !finalContent) {
      throw new BadRequestException('Message content is required');
    }

    return {
      content: finalContent,
      richContent: undefined,
      contentFormat: ChatMessageContentFormat.PLAIN_TEXT,
    };
  }

  const sanitizedRichContent = sanitizeRichTextDocument(normalizedRichContent);
  const canonicalText = normalizeCanonicalPlainText(
    derivePlainTextFromRichContent(sanitizedRichContent),
  );
  if (canonicalText.length > MAX_CANONICAL_TEXT_LENGTH) {
    throw new BadRequestException(
      `Message plain text exceeds max length ${MAX_CANONICAL_TEXT_LENGTH}`,
    );
  }
  const finalContent =
    canonicalText || (params.allowEmptyContent === true ? '' : undefined);
  if (params.requireContent && !finalContent) {
    throw new BadRequestException('Message content is required');
  }

  return {
    content: finalContent,
    richContent: sanitizedRichContent,
    contentFormat: ChatMessageContentFormat.RICH_TEXT_V1,
  };
}

export function sanitizeRichTextDocument(
  richContent: Record<string, any>,
): Record<string, any> {
  if (!richContent || typeof richContent !== 'object' || Array.isArray(richContent)) {
    throw new BadRequestException('richContent must be an object');
  }

  const encodedSize = Buffer.byteLength(JSON.stringify(richContent), 'utf8');
  if (encodedSize > MAX_RICH_CONTENT_BYTES) {
    throw new BadRequestException(
      `richContent exceeds max payload size ${MAX_RICH_CONTENT_BYTES} bytes`,
    );
  }

  const stats: RichValidationStats = {
    nodeCount: 0,
    mentionCount: 0,
    linkCount: 0,
  };
  const sanitized = sanitizeRichNode({
    node: richContent,
    parentType: null,
    depth: 1,
    stats,
  });

  if (sanitized.type !== 'doc') {
    throw new BadRequestException('richContent root node must be doc');
  }

  return sanitized;
}

export function derivePlainTextFromRichContent(
  richContent?: Record<string, any> | null,
): string {
  if (!richContent || typeof richContent !== 'object' || Array.isArray(richContent)) {
    return '';
  }
  return extractTextFromNode(richContent);
}

function normalizeRichContentInput(
  richContent?: Record<string, any> | null,
): Record<string, any> | undefined {
  if (richContent === undefined || richContent === null) {
    return undefined;
  }
  if (typeof richContent !== 'object' || Array.isArray(richContent)) {
    throw new BadRequestException('richContent must be an object');
  }
  return Object.keys(richContent).length > 0 ? richContent : undefined;
}

function normalizePlainTextContent(content?: string | null): string | undefined {
  if (typeof content !== 'string') {
    return undefined;
  }
  const normalized = content.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function sanitizeRichNode(params: {
  node: unknown;
  parentType: string | null;
  depth: number;
  stats: RichValidationStats;
}): Record<string, any> {
  if (!params.node || typeof params.node !== 'object' || Array.isArray(params.node)) {
    throw new BadRequestException('richContent node must be an object');
  }
  if (params.depth > MAX_TREE_DEPTH) {
    throw new BadRequestException(
      `richContent exceeds max depth ${MAX_TREE_DEPTH}`,
    );
  }

  const rawNode = params.node as Record<string, any>;
  const nodeType = normalizeNodeType(rawNode.type);
  if (!ALLOWED_NODE_TYPES.has(nodeType)) {
    throw new BadRequestException(`Unsupported richContent node type: ${nodeType}`);
  }

  params.stats.nodeCount += 1;
  if (params.stats.nodeCount > MAX_TOTAL_NODES) {
    throw new BadRequestException(
      `richContent exceeds max node count ${MAX_TOTAL_NODES}`,
    );
  }

  assertNodePlacement(params.parentType, nodeType);

  if (nodeType === 'text') {
    return sanitizeTextNode(rawNode, params.stats);
  }
  if (nodeType === 'hardBreak') {
    return { type: 'hardBreak' };
  }
  if (nodeType === 'mention') {
    return sanitizeMentionNode(rawNode, params.stats);
  }

  const sanitizedChildren = sanitizeNodeChildren({
    parentType: nodeType,
    rawContent: rawNode.content,
    depth: params.depth + 1,
    stats: params.stats,
  });

  if (nodeType === 'doc') {
    return {
      type: nodeType,
      content: sanitizedChildren,
    };
  }

  return sanitizedChildren.length > 0
    ? {
        type: nodeType,
        content: sanitizedChildren,
      }
    : {
        type: nodeType,
      };
}

function sanitizeTextNode(
  rawNode: Record<string, any>,
  stats: RichValidationStats,
): Record<string, any> {
  if (typeof rawNode.text !== 'string') {
    throw new BadRequestException('text node must contain text');
  }
  const sanitizedText = rawNode.text.replace(/\r/g, '');
  const marks = sanitizeMarks(rawNode.marks, stats);
  return marks.length > 0
    ? {
        type: 'text',
        text: sanitizedText,
        marks,
      }
    : {
        type: 'text',
        text: sanitizedText,
      };
}

function sanitizeMentionNode(
  rawNode: Record<string, any>,
  stats: RichValidationStats,
): Record<string, any> {
  const attrsRaw =
    rawNode.attrs && typeof rawNode.attrs === 'object' && !Array.isArray(rawNode.attrs)
      ? (rawNode.attrs as Record<string, any>)
      : undefined;
  if (!attrsRaw) {
    throw new BadRequestException('mention node must include attrs');
  }

  const mentionId =
    typeof attrsRaw.id === 'string' ? attrsRaw.id.trim() : undefined;
  if (!mentionId || !UUID_V4_OR_V5_PATTERN.test(mentionId)) {
    throw new BadRequestException(
      'mention node attrs.id must be a valid UUID string',
    );
  }

  const label =
    typeof attrsRaw.label === 'string' ? attrsRaw.label.trim() : undefined;
  if (label && label.length > MAX_MENTION_LABEL_LENGTH) {
    throw new BadRequestException(
      `mention label exceeds max length ${MAX_MENTION_LABEL_LENGTH}`,
    );
  }

  stats.mentionCount += 1;
  if (stats.mentionCount > MAX_MENTION_NODES) {
    throw new BadRequestException(
      `richContent exceeds max mention count ${MAX_MENTION_NODES}`,
    );
  }

  return label
    ? {
        type: 'mention',
        attrs: {
          id: mentionId,
          label,
        },
      }
    : {
        type: 'mention',
        attrs: {
          id: mentionId,
        },
      };
}

function sanitizeNodeChildren(params: {
  parentType: string;
  rawContent: unknown;
  depth: number;
  stats: RichValidationStats;
}): Record<string, any>[] {
  if (params.rawContent === undefined || params.rawContent === null) {
    return [];
  }
  if (!Array.isArray(params.rawContent)) {
    throw new BadRequestException(
      `Node ${params.parentType} content must be an array`,
    );
  }

  return params.rawContent.map((child) =>
    sanitizeRichNode({
      node: child,
      parentType: params.parentType,
      depth: params.depth,
      stats: params.stats,
    }),
  );
}

function sanitizeMarks(
  marks: unknown,
  stats: RichValidationStats,
): Record<string, any>[] {
  if (marks === undefined || marks === null) {
    return [];
  }
  if (!Array.isArray(marks)) {
    throw new BadRequestException('text node marks must be an array');
  }

  return marks.map((mark) => {
    if (!mark || typeof mark !== 'object' || Array.isArray(mark)) {
      throw new BadRequestException('mark must be an object');
    }
    const rawMark = mark as Record<string, any>;
    const markType =
      typeof rawMark.type === 'string' ? rawMark.type.trim() : '';
    if (!ALLOWED_MARK_TYPES.has(markType)) {
      throw new BadRequestException(`Unsupported richContent mark type: ${markType}`);
    }

    if (markType !== 'link') {
      return {
        type: markType,
      };
    }

    const attrs =
      rawMark.attrs &&
      typeof rawMark.attrs === 'object' &&
      !Array.isArray(rawMark.attrs)
        ? (rawMark.attrs as Record<string, any>)
        : undefined;
    const href =
      typeof attrs?.href === 'string' ? sanitizeLinkHref(attrs.href) : undefined;
    if (!href) {
      throw new BadRequestException('link mark attrs.href is required');
    }

    stats.linkCount += 1;
    if (stats.linkCount > MAX_LINK_MARKS) {
      throw new BadRequestException(
        `richContent exceeds max link count ${MAX_LINK_MARKS}`,
      );
    }

    const target =
      attrs?.target === '_blank' || attrs?.target === '_self'
        ? attrs.target
        : undefined;

    return target
      ? {
          type: 'link',
          attrs: {
            href,
            target,
          },
        }
      : {
          type: 'link',
          attrs: {
            href,
          },
        };
  });
}

function sanitizeLinkHref(rawHref: string): string {
  const href = rawHref.trim();
  if (!href) {
    throw new BadRequestException('link href must not be empty');
  }

  const normalized = href.toLowerCase();
  if (normalized.startsWith('javascript:') || normalized.startsWith('data:')) {
    throw new BadRequestException('link href protocol is not allowed');
  }

  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    throw new BadRequestException('link href must be an absolute URL');
  }

  if (!SAFE_LINK_PROTOCOLS.has(parsed.protocol)) {
    throw new BadRequestException('link href protocol is not allowed');
  }

  return parsed.toString();
}

function normalizeNodeType(rawType: unknown): string {
  if (typeof rawType !== 'string') {
    throw new BadRequestException('richContent node type is required');
  }
  const type = rawType.trim();
  if (!type) {
    throw new BadRequestException('richContent node type is required');
  }
  return type;
}

function assertNodePlacement(parentType: string | null, childType: string): void {
  if (!parentType) {
    return;
  }

  if (parentType === 'doc') {
    if (
      childType !== 'paragraph' &&
      childType !== 'bulletList' &&
      childType !== 'orderedList'
    ) {
      throw new BadRequestException(
        `Node type ${childType} is not allowed inside doc`,
      );
    }
    return;
  }

  if (parentType === 'paragraph') {
    if (
      childType !== 'text' &&
      childType !== 'hardBreak' &&
      childType !== 'mention'
    ) {
      throw new BadRequestException(
        `Node type ${childType} is not allowed inside paragraph`,
      );
    }
    return;
  }

  if (parentType === 'bulletList' || parentType === 'orderedList') {
    if (childType !== 'listItem') {
      throw new BadRequestException(
        `Node type ${childType} is not allowed inside ${parentType}`,
      );
    }
    return;
  }

  if (parentType === 'listItem') {
    if (
      childType !== 'paragraph' &&
      childType !== 'bulletList' &&
      childType !== 'orderedList'
    ) {
      throw new BadRequestException(
        `Node type ${childType} is not allowed inside listItem`,
      );
    }
  }
}

function extractTextFromNode(node: Record<string, any>): string {
  const type = typeof node.type === 'string' ? node.type : '';
  const children = Array.isArray(node.content)
    ? (node.content as Record<string, any>[])
    : [];

  if (type === 'text') {
    return typeof node.text === 'string' ? node.text : '';
  }
  if (type === 'hardBreak') {
    return '\n';
  }
  if (type === 'mention') {
    return mentionToText(node);
  }

  if (type === 'paragraph') {
    return joinInline(children.map((child) => extractTextFromNode(child)));
  }
  if (type === 'listItem') {
    return joinBlocks(children.map((child) => extractTextFromNode(child)));
  }
  if (type === 'bulletList' || type === 'orderedList' || type === 'doc') {
    return joinBlocks(children.map((child) => extractTextFromNode(child)));
  }

  return '';
}

function mentionToText(node: Record<string, any>): string {
  const attrs =
    node.attrs && typeof node.attrs === 'object' && !Array.isArray(node.attrs)
      ? (node.attrs as Record<string, any>)
      : undefined;
  const rawLabel = typeof attrs?.label === 'string' ? attrs.label.trim() : '';
  const normalizedLabel = rawLabel.replace(/^@+/, '');
  if (normalizedLabel) {
    return `@${normalizedLabel}`;
  }

  const mentionId = typeof attrs?.id === 'string' ? attrs.id.trim() : '';
  return mentionId ? `@${mentionId}` : '@user';
}

function joinInline(chunks: string[]): string {
  return chunks.filter((chunk) => chunk.length > 0).join('');
}

function joinBlocks(chunks: string[]): string {
  return chunks.filter((chunk) => chunk.length > 0).join('\n');
}

function normalizeCanonicalPlainText(value: string): string {
  if (!value) {
    return '';
  }
  const normalizedLines = value
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n');

  return normalizedLines.trim();
}
