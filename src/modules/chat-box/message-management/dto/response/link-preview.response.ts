import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MessageLinkPreviewMessageResponse,
  MessageLinkPreviewResolveState,
  MessageLinkPreviewRoomResponse,
} from './message-link-preview.response';

export type ChatLinkPreviewType =
  | 'website'
  | 'image'
  | 'video'
  | 'file'
  | 'document';

export type ChatLinkPreviewInternalKind = 'team_chat_message';

export type ChatLinkPreviewStatus =
  | 'pending'
  | 'partial'
  | 'ready'
  | 'failed'
  | 'disabled';

export type ChatLinkPreviewAssetStatus = 'pending' | 'ready' | 'failed';

export type ChatLinkPreviewAssetSource =
  | 'rendered'
  | 'cached'
  | 'proxied'
  | 'external'
  | 'fallback';

export class ChatLinkPreviewInternalReferenceResponse {
  @ApiProperty({
    enum: ['team_chat_message'],
    example: 'team_chat_message',
  })
  kind: ChatLinkPreviewInternalKind;

  @ApiProperty({ example: '47e7a79a-20b7-4a4f-bfe2-122eaa8fee78' })
  roomId: string;

  @ApiProperty({ example: '71f1cf08-e67c-4222-bfed-884848f2b137' })
  messageId: string;

  @ApiProperty({
    example:
      '/team-chat?roomId=47e7a79a-20b7-4a4f-bfe2-122eaa8fee78&messageId=71f1cf08-e67c-4222-bfed-884848f2b137',
  })
  deepLinkUrl: string;

  @ApiPropertyOptional({
    enum: ['ready', 'forbidden', 'message_not_found', 'message_deleted'],
    example: 'ready',
    description:
      'Permission-aware state for inline snapshot of internal team chat message',
  })
  previewState?: MessageLinkPreviewResolveState;

  @ApiPropertyOptional({
    type: MessageLinkPreviewRoomResponse,
    description: 'Safe snapshot of referenced room for internal message link',
  })
  roomSnapshot?: MessageLinkPreviewRoomResponse;

  @ApiPropertyOptional({
    type: MessageLinkPreviewMessageResponse,
    description:
      'Safe lightweight snapshot of referenced message for internal message link',
  })
  messageSnapshot?: MessageLinkPreviewMessageResponse;
}

export class LinkPreviewResponse {
  @ApiProperty({ example: 'https://docs.google.com/document/d/abc123/edit' })
  url: string;

  @ApiPropertyOptional({
    example: 'https://docs.google.com/document/d/abc123/edit',
  })
  canonicalUrl?: string;

  @ApiPropertyOptional({
    example: 'docs.google.com/document/d/abc123/edit',
  })
  displayUrl?: string;

  @ApiPropertyOptional({
    type: ChatLinkPreviewInternalReferenceResponse,
    description:
      'Internal team-chat reference parsed from URL. FE can use this key to resolve secure internal message preview.',
  })
  internalReference?: ChatLinkPreviewInternalReferenceResponse;

  @ApiProperty({
    enum: ['pending', 'partial', 'ready', 'failed', 'disabled'],
    example: 'ready',
  })
  status: ChatLinkPreviewStatus;

  @ApiPropertyOptional({ example: 'google_docs' })
  provider?: string;

  @ApiPropertyOptional({ example: 'Google Docs' })
  providerName?: string;

  @ApiPropertyOptional({
    example: 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=64',
  })
  providerIconUrl?: string;

  @ApiPropertyOptional({ example: 'Google Workspace' })
  siteName?: string;

  @ApiPropertyOptional({ example: 'Product Spec Q2' })
  resourceTitle?: string;

  @ApiPropertyOptional({ example: 'google_doc' })
  resourceType?: string;

  @ApiPropertyOptional({ example: 'Document in Google Docs' })
  resourceTypeLabel?: string;

  @ApiProperty({ example: 'Product Spec - Google Docs' })
  title: string;

  @ApiPropertyOptional({
    example: 'Shared via Google Docs',
  })
  description?: string;

  @ApiPropertyOptional({
    example: 'https://lh3.googleusercontent.com/docs-thumbnail.png',
  })
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 'https://lh3.googleusercontent.com/docs-thumbnail.png',
  })
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    example: 'https://lh3.googleusercontent.com/docs-thumbnail.png',
  })
  previewImageUrl?: string;

  @ApiPropertyOptional({
    example: 'Preview of Product Spec - Google Docs',
  })
  previewImageAlt?: string;

  @ApiPropertyOptional({
    example: '1JEbcfkI9wv0mV7Ukn0wam_wj-7d2wI7anEcXQHSzbRE',
  })
  previewAssetId?: string;

  @ApiPropertyOptional({
    enum: ['pending', 'ready', 'failed'],
    example: 'ready',
  })
  previewAssetStatus?: ChatLinkPreviewAssetStatus;

  @ApiPropertyOptional({
    enum: ['rendered', 'cached', 'proxied', 'external', 'fallback'],
    example: 'proxied',
  })
  previewAssetSource?: ChatLinkPreviewAssetSource;

  @ApiPropertyOptional({
    example: 'google_thumbnail_unavailable',
  })
  previewAssetErrorCode?: string;

  @ApiPropertyOptional({
    example: 'MXxwcm94aWVkfHJlYWR5fDIwMjYtMDMtMjJUMDY6MDA6MDAuMDAwWg',
    description:
      'Version token de FE bo qua stale object URL/blob cache cho link preview asset',
  })
  previewVersion?: string;

  @ApiPropertyOptional({ example: 1200 })
  previewImageWidth?: number;

  @ApiPropertyOptional({ example: 675 })
  previewImageHeight?: number;

  @ApiPropertyOptional({
    example: 'Short snippet extracted from metadata',
  })
  excerpt?: string;

  @ApiProperty({
    enum: ['website', 'image', 'video', 'file', 'document'],
    example: 'document',
  })
  type: ChatLinkPreviewType;

  @ApiPropertyOptional({
    enum: ['website', 'image', 'video', 'file', 'document'],
    example: 'document',
  })
  mediaType?: ChatLinkPreviewType;

  @ApiPropertyOptional({ example: 'application/pdf' })
  mimeType?: string;

  @ApiPropertyOptional({ example: 'text/html; charset=utf-8' })
  contentType?: string;

  @ApiPropertyOptional({
    example: 'https://www.youtube.com/embed/abc123',
  })
  embedUrl?: string;

  @ApiPropertyOptional({ example: 1200 })
  width?: number;

  @ApiPropertyOptional({ example: 675 })
  height?: number;

  @ApiPropertyOptional({ example: 372000 })
  durationMs?: number;

  @ApiProperty({ example: '2026-03-20T11:20:00.000Z' })
  fetchedAt: string;
}
