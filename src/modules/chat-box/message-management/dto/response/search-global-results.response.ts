import {
  ChatGlobalSearchSort,
  ChatGlobalSearchTab,
} from '@modules/chat-box/message-management/constants/search-global.constant';
import {
  GlobalSearchSuggestFileItemResponse,
  GlobalSearchSuggestMessageItemResponse,
  GlobalSearchSuggestPersonItemResponse,
  GlobalSearchSuggestRoomItemResponse,
  SearchGlobalSuggestSectionsResponse,
} from '@modules/chat-box/message-management/dto/response/search-global-suggest.response';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type GlobalSearchResultItemResponse =
  | GlobalSearchSuggestPersonItemResponse
  | GlobalSearchSuggestRoomItemResponse
  | GlobalSearchSuggestMessageItemResponse
  | GlobalSearchSuggestFileItemResponse;

export class SearchGlobalResultsCountsResponse {
  @ApiProperty({ example: 12 })
  people: number;

  @ApiProperty({ example: 8 })
  rooms: number;

  @ApiProperty({ example: 32 })
  messages: number;

  @ApiProperty({ example: 6 })
  files: number;
}

export class SearchGlobalResultsResponse {
  @ApiProperty({ example: 'deploy' })
  query: string;

  @ApiProperty({ enum: ChatGlobalSearchTab, example: ChatGlobalSearchTab.MESSAGES })
  selectedTab: ChatGlobalSearchTab;

  @ApiProperty({ enum: ChatGlobalSearchSort, example: ChatGlobalSearchSort.BEST_MATCH })
  sort: ChatGlobalSearchSort;

  @ApiProperty({ example: 118 })
  tookMs: number;

  @ApiProperty({ type: SearchGlobalResultsCountsResponse })
  counts: SearchGlobalResultsCountsResponse;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    description:
      'Selected tab items. For tab=all this list is empty and grouped sections are returned in `sections`.',
  })
  items: GlobalSearchResultItemResponse[];

  @ApiPropertyOptional({
    type: SearchGlobalSuggestSectionsResponse,
    description:
      'Grouped sections for tab=all. Each section includes count/hasMore/items for lightweight overview.',
  })
  sections?: SearchGlobalSuggestSectionsResponse;

  @ApiPropertyOptional({
    description:
      'Cursor for next page. Returned for paged tabs (messages/files).',
  })
  nextCursor?: string;

  @ApiProperty({ example: true })
  hasMore: boolean;
}
