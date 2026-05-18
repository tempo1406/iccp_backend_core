/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { SearchGlobalResultsQueryRequest } from '@modules/chat-box/message-management/dto/request/search-global-results-query.request';
import { SearchGlobalSuggestQueryRequest } from '@modules/chat-box/message-management/dto/request/search-global-suggest-query.request';
import {
  ChatGlobalSearchEntityType,
  ChatGlobalSearchSort,
  ChatGlobalSearchTab,
} from '@modules/chat-box/message-management/constants/search-global.constant';
import {
  GlobalSearchSuggestFileItemResponse,
  GlobalSearchSuggestMessageItemResponse,
  GlobalSearchSuggestPersonItemResponse,
  GlobalSearchSuggestRoomItemResponse,
  SearchGlobalSuggestResponse,
} from '@modules/chat-box/message-management/dto/response/search-global-suggest.response';
import {
  GlobalSearchResultItemResponse,
  SearchGlobalResultsResponse,
} from '@modules/chat-box/message-management/dto/response/search-global-results.response';
import { ChatAttachmentType } from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ChatMessage } from '@modules/chat-box/message-management/entities/message.entity';
import {
  ChatPresenceStatus,
  ChatUserPresence,
} from '@modules/chat-box/presence/entities/user-presence.entity';
import { ChatRoomMember } from '@modules/chat-box/room-management/entities/room-member.entity';
import {
  ChatContextScope,
  ChatRoom,
  ChatRoomType,
  ChatRoomVisibility,
} from '@modules/chat-box/room-management/entities/room.entity';
import { OrganizationMember } from '@modules/organization/core/entities/organization-member.entity';
import { ProjectMember } from '@modules/project/core/entities/project-member.entity';
import { Project } from '@modules/project/core/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';
import { BadRequestException } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { ChatBoxServiceDelegateContext } from './message-delegate.types';

type ScopeFilter = {
  contextScope?: ChatContextScope;
  contextId?: string;
};

type SearchSectionResult<T> = {
  count: number;
  hasMore: boolean;
  items: T[];
  nextCursor?: string;
};

type PeopleRawRow = {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  presenceStatus?: ChatPresenceStatus;
};

type RoomRawRow = {
  roomId: string;
  roomType: ChatRoomType;
  visibility: ChatRoomVisibility;
  name?: string;
  roomKey?: string;
  topic?: string;
  lastMessageAt?: Date;
  updatedAt: Date;
};

type MessageRawRow = {
  messageId: string;
  roomId: string;
  roomName?: string;
  roomType: ChatRoomType;
  senderId?: string;
  senderEmail?: string;
  senderFirstName?: string;
  senderLastName?: string;
  senderAvatarUrl?: string;
  content?: string;
  sentAt: Date;
  hasAttachments: boolean | string | number;
};

type FileRawRow = {
  attachmentId: string;
  messageId: string;
  roomId: string;
  roomName?: string;
  fileName: string;
  documentType?: string;
  attachmentType: ChatAttachmentType;
  uploaderId?: string;
  uploaderEmail?: string;
  uploaderFirstName?: string;
  uploaderLastName?: string;
  sentAt: Date;
};

type DateRangeFilter = {
  dateFrom?: Date;
  dateTo?: Date;
};

function normalizeSearchKeyword(raw?: string): string {
  return (raw || '').replace(/\s+/g, ' ').trim();
}

function toBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 'true' ||
    value === 't' ||
    value === 1 ||
    value === '1'
  );
}

function resolveSectionCount(params: {
  totalCount?: number;
  hasMore: boolean;
  pageRowsLength: number;
  fetchedRowsLength: number;
}): number {
  if (typeof params.totalCount === 'number') {
    return params.totalCount;
  }
  if (params.hasMore) {
    return params.fetchedRowsLength;
  }
  return params.pageRowsLength;
}

function applyScopeFilterToRoomAlias(
  qb: SelectQueryBuilder<any>,
  roomAlias: string,
  scopeFilter: ScopeFilter,
): void {
  if (scopeFilter.contextScope) {
    qb.andWhere(`${roomAlias}.context_scope = :filterContextScope`, {
      filterContextScope: scopeFilter.contextScope,
    });
  }

  if (scopeFilter.contextId) {
    qb.andWhere(`${roomAlias}.context_id = :filterContextId`, {
      filterContextId: scopeFilter.contextId,
    });
  }
}

function parseDateRangeFilter(
  query: SearchGlobalResultsQueryRequest,
): DateRangeFilter {
  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
  const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

  if (dateFrom && Number.isNaN(dateFrom.getTime())) {
    throw new BadRequestException('dateFrom must be a valid ISO datetime');
  }
  if (dateTo && Number.isNaN(dateTo.getTime())) {
    throw new BadRequestException('dateTo must be a valid ISO datetime');
  }
  if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
    throw new BadRequestException(
      'dateFrom must be earlier than or equal to dateTo',
    );
  }

  return { dateFrom, dateTo };
}

function applyDateRangeFilterToMessageAlias(
  qb: SelectQueryBuilder<any>,
  messageAlias: string,
  dateRange: DateRangeFilter,
): void {
  if (dateRange.dateFrom) {
    qb.andWhere(`${messageAlias}.sent_at >= :dateFrom`, {
      dateFrom: dateRange.dateFrom,
    });
  }
  if (dateRange.dateTo) {
    qb.andWhere(`${messageAlias}.sent_at <= :dateTo`, {
      dateTo: dateRange.dateTo,
    });
  }
}

function applyProjectScopeFilterToPeopleQuery(
  qb: SelectQueryBuilder<OrganizationMember>,
  params: {
    organizationId: string;
    scopeFilter: ScopeFilter;
  },
): void {
  if (
    params.scopeFilter.contextScope !== ChatContextScope.PROJECT ||
    !params.scopeFilter.contextId
  ) {
    return;
  }

  qb.innerJoin(
    Project,
    'scope_project',
    [
      'scope_project.id = :filterContextId',
      'scope_project.organization_id = :organizationId',
      'scope_project.deleted_at IS NULL',
    ].join(' AND '),
    {
      filterContextId: params.scopeFilter.contextId,
      organizationId: params.organizationId,
    },
  ).leftJoin(
    ProjectMember,
    'scope_project_member',
    [
      'scope_project_member.project_id = scope_project.id',
      'scope_project_member.organization_id = :organizationId',
      'scope_project_member.user_id = om.user_id',
      'scope_project_member.is_active = true',
      'scope_project_member.deleted_at IS NULL',
    ].join(' AND '),
    { organizationId: params.organizationId },
  );

  qb.andWhere(
    [
      '(',
      'om.user_id = scope_project.created_by',
      'OR om.user_id = ANY(COALESCE(scope_project.manager_id, ARRAY[]::uuid[]))',
      'OR scope_project_member.id IS NOT NULL',
      ')',
    ].join(' '),
  );
}

function applyConversationRoomFilterToPeopleQuery(
  qb: SelectQueryBuilder<OrganizationMember>,
  params: {
    organizationId: string;
    userId: string;
    roomId?: string;
  },
): void {
  if (!params.roomId) {
    return;
  }

  qb.andWhere(
    [
      'EXISTS (',
      'SELECT 1',
      'FROM chat.room_members rm_scope_target',
      'WHERE rm_scope_target.organization_id = :organizationId',
      'AND rm_scope_target.room_id = :peopleScopeRoomId',
      'AND rm_scope_target.user_id = om.user_id',
      'AND rm_scope_target.is_active = true',
      ')',
    ].join(' '),
    { peopleScopeRoomId: params.roomId },
  ).andWhere(
    [
      'EXISTS (',
      'SELECT 1',
      'FROM chat.room_members rm_scope_viewer',
      'WHERE rm_scope_viewer.organization_id = :organizationId',
      'AND rm_scope_viewer.room_id = :peopleScopeRoomId',
      'AND rm_scope_viewer.user_id = :userId',
      'AND rm_scope_viewer.is_active = true',
      ')',
    ].join(' '),
    {
      peopleScopeRoomId: params.roomId,
      userId: params.userId,
    },
  );
}

function buildPeopleSearchBaseQuery(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    roomId?: string;
  },
): SelectQueryBuilder<OrganizationMember> {
  const keywordLike = `%${params.keyword}%`;
  const qb = this.organizationMemberRepo
    .createQueryBuilder('om')
    .innerJoin(User, 'u', 'u.id = om.user_id AND u.deleted_at IS NULL')
    .leftJoin(
      ChatUserPresence,
      'presence',
      'presence.organization_id = :organizationId AND presence.user_id = u.id',
      { organizationId: params.organizationId },
    )
    .where('om.organization_id = :organizationId', {
      organizationId: params.organizationId,
    })
    .andWhere('om.is_active = true')
    .andWhere('om.is_deleted = false')
    .andWhere(
      [
        '(',
        'u.email ILIKE :keywordLike',
        'OR u.first_name ILIKE :keywordLike',
        'OR u.last_name ILIKE :keywordLike',
        "OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) ILIKE :keywordLike",
        ')',
      ].join(' '),
      { keywordLike },
    );

  applyProjectScopeFilterToPeopleQuery(qb, {
    organizationId: params.organizationId,
    scopeFilter: params.scopeFilter,
  });
  applyConversationRoomFilterToPeopleQuery(qb, {
    organizationId: params.organizationId,
    userId: params.userId,
    roomId: params.roomId,
  });

  return qb;
}

function buildSelfDmRoomKey(params: {
  userId: string;
  scopeFilter: ScopeFilter;
}): string {
  const scopePrefix =
    params.scopeFilter.contextScope === ChatContextScope.PROJECT &&
    params.scopeFilter.contextId
      ? `project-${params.scopeFilter.contextId}-`
      : '';
  return `${scopePrefix}dm-${params.userId}`;
}

function buildRoomSearchBaseQuery(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    roomId?: string;
    roomType?: ChatRoomType;
  },
): SelectQueryBuilder<ChatRoom> {
  const keywordLike = `%${params.keyword}%`;
  const qb = this.roomRepo
    .createQueryBuilder('r')
    .innerJoin(
      ChatRoomMember,
      'rm',
      [
        'rm.room_id = r.id',
        'rm.organization_id = :organizationId',
        'rm.user_id = :userId',
        'rm.is_active = true',
      ].join(' AND '),
      {
        organizationId: params.organizationId,
        userId: params.userId,
      },
    )
    .where('r.organization_id = :organizationId', {
      organizationId: params.organizationId,
    })
    .andWhere('r.is_archived = false')
    .andWhere(
      [
        '(',
        'r.name ILIKE :keywordLike',
        'OR r.room_key ILIKE :keywordLike',
        "OR COALESCE(r.topic, '') ILIKE :keywordLike",
        ')',
      ].join(' '),
      { keywordLike },
    );

  applyScopeFilterToRoomAlias(qb, 'r', params.scopeFilter);

  if (params.roomId) {
    qb.andWhere('r.id = :roomId', { roomId: params.roomId });
  }
  if (params.roomType) {
    qb.andWhere('r.room_type = :roomType', { roomType: params.roomType });
  }

  return qb;
}

function buildMessageSearchBaseQuery(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    roomId?: string;
    roomType?: ChatRoomType;
    fromUserId?: string;
    hasAttachments?: boolean;
    dateRange?: DateRangeFilter;
  },
): {
  qb: SelectQueryBuilder<ChatMessage>;
  useFullTextSearch: boolean;
} {
  const keywordLike = `%${params.keyword}%`;
  const useFullTextSearch = params.keyword.length >= 3;

  const qb = this.messageRepo
    .createQueryBuilder('m')
    .innerJoin(
      ChatRoom,
      'r',
      [
        'r.id = m.room_id',
        'r.organization_id = :organizationId',
        'r.is_archived = false',
      ].join(' AND '),
      { organizationId: params.organizationId },
    )
    .innerJoin(
      ChatRoomMember,
      'rm',
      [
        'rm.room_id = r.id',
        'rm.organization_id = :organizationId',
        'rm.user_id = :userId',
        'rm.is_active = true',
      ].join(' AND '),
      {
        organizationId: params.organizationId,
        userId: params.userId,
      },
    )
    .leftJoin(User, 'u', 'u.id = m.sender_id')
    .where('m.organization_id = :organizationId', {
      organizationId: params.organizationId,
    })
    .andWhere('m.is_deleted = false')
    .andWhere('m.content IS NOT NULL');

  applyScopeFilterToRoomAlias(qb, 'r', params.scopeFilter);

  if (useFullTextSearch) {
    qb.andWhere(
      "to_tsvector('simple', COALESCE(m.content, '')) @@ plainto_tsquery('simple', :keywordTs)",
      { keywordTs: params.keyword },
    );
  } else {
    qb.andWhere('m.content ILIKE :keywordLike', { keywordLike });
  }

  if (params.roomId) {
    qb.andWhere('r.id = :roomId', { roomId: params.roomId });
  }

  if (params.roomType) {
    qb.andWhere('r.room_type = :roomType', { roomType: params.roomType });
  }

  if (params.fromUserId) {
    qb.andWhere('m.sender_id = :fromUserId', { fromUserId: params.fromUserId });
  }

  if (typeof params.hasAttachments === 'boolean') {
    const attachmentPredicate =
      'EXISTS (SELECT 1 FROM chat.message_attachments ma WHERE ma.organization_id = m.organization_id AND ma.message_id = m.id)';
    if (params.hasAttachments) {
      qb.andWhere(attachmentPredicate);
    } else {
      qb.andWhere(`NOT (${attachmentPredicate})`);
    }
  }

  if (params.dateRange) {
    applyDateRangeFilterToMessageAlias(qb, 'm', params.dateRange);
  }

  return {
    qb,
    useFullTextSearch,
  };
}

function buildFileSearchBaseQuery(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    roomId?: string;
    roomType?: ChatRoomType;
    fromUserId?: string;
    fileType?: string;
    dateRange?: DateRangeFilter;
  },
): SelectQueryBuilder<any> {
  const keywordLike = `%${params.keyword}%`;
  const qb = this.attachmentRepo
    .createQueryBuilder('a')
    .innerJoin(
      ChatMessage,
      'm',
      [
        'm.id = a.message_id',
        'm.organization_id = :organizationId',
        'm.is_deleted = false',
      ].join(' AND '),
      { organizationId: params.organizationId },
    )
    .innerJoin(
      ChatRoom,
      'r',
      [
        'r.id = m.room_id',
        'r.organization_id = :organizationId',
        'r.is_archived = false',
      ].join(' AND '),
      { organizationId: params.organizationId },
    )
    .innerJoin(
      ChatRoomMember,
      'rm',
      [
        'rm.room_id = r.id',
        'rm.organization_id = :organizationId',
        'rm.user_id = :userId',
        'rm.is_active = true',
      ].join(' AND '),
      {
        organizationId: params.organizationId,
        userId: params.userId,
      },
    )
    .leftJoin(User, 'u', 'u.id = m.sender_id')
    .where('a.organization_id = :organizationId', {
      organizationId: params.organizationId,
    })
    .andWhere(
      [
        '(',
        'a.file_name ILIKE :keywordLike',
        "OR COALESCE(a.document_type, '') ILIKE :keywordLike",
        "OR COALESCE(u.email, '') ILIKE :keywordLike",
        "OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) ILIKE :keywordLike",
        ')',
      ].join(' '),
      { keywordLike },
    );

  applyScopeFilterToRoomAlias(qb, 'r', params.scopeFilter);

  if (params.roomId) {
    qb.andWhere('r.id = :roomId', { roomId: params.roomId });
  }

  if (params.roomType) {
    qb.andWhere('r.room_type = :roomType', { roomType: params.roomType });
  }

  if (params.fromUserId) {
    qb.andWhere('m.sender_id = :fromUserId', { fromUserId: params.fromUserId });
  }

  if (params.fileType?.trim()) {
    const normalizedFileType = params.fileType.trim().toLowerCase();
    qb.andWhere(
      [
        '(',
        "LOWER(COALESCE(a.document_type, '')) = :fileType",
        "OR LOWER(COALESCE(a.file_name, '')) LIKE :fileTypeSuffix",
        ')',
      ].join(' '),
      {
        fileType: normalizedFileType,
        fileTypeSuffix: `%.${normalizedFileType}`,
      },
    );
  }

  if (params.dateRange) {
    applyDateRangeFilterToMessageAlias(qb, 'm', params.dateRange);
  }

  return qb;
}

async function loadDmRoomIdsForUsers(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    candidateUserIds: string[];
    scopeFilter: ScopeFilter;
  },
): Promise<Map<string, string>> {
  if (params.candidateUserIds.length === 0) {
    return new Map();
  }

  const targetUserIds = Array.from(new Set(params.candidateUserIds));
  const otherCandidateUserIds = targetUserIds.filter(
    (candidateUserId) => candidateUserId !== params.userId,
  );
  const dmRoomMap = new Map<string, string>();

  if (otherCandidateUserIds.length > 0) {
    const dmQb = this.roomRepo
      .createQueryBuilder('r')
      .innerJoin(
        ChatRoomMember,
        'rmSelf',
        [
          'rmSelf.room_id = r.id',
          'rmSelf.organization_id = :organizationId',
          'rmSelf.user_id = :userId',
          'rmSelf.is_active = true',
        ].join(' AND '),
        {
          organizationId: params.organizationId,
          userId: params.userId,
        },
      )
      .innerJoin(
        ChatRoomMember,
        'rmOther',
        [
          'rmOther.room_id = r.id',
          'rmOther.organization_id = :organizationId',
          'rmOther.user_id IN (:...candidateUserIds)',
          'rmOther.is_active = true',
        ].join(' AND '),
        {
          organizationId: params.organizationId,
          candidateUserIds: otherCandidateUserIds,
        },
      )
      .where('r.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('r.room_type = :roomType', { roomType: ChatRoomType.DM })
      .andWhere('r.is_archived = false')
      .andWhere('rmOther.user_id <> :userId', { userId: params.userId });

    applyScopeFilterToRoomAlias(dmQb, 'r', params.scopeFilter);

    const rows = (await dmQb
      .distinctOn(['rmOther.user_id'])
      .select('rmOther.user_id', 'targetUserId')
      .addSelect('r.id', 'roomId')
      .orderBy('rmOther.user_id', 'ASC')
      .addOrderBy('r.last_message_at', 'DESC', 'NULLS LAST')
      .addOrderBy('r.created_at', 'DESC')
      .getRawMany()) as { targetUserId: string; roomId: string }[];

    for (const row of rows) {
      dmRoomMap.set(row.targetUserId, row.roomId);
    }
  }

  if (targetUserIds.includes(params.userId)) {
    const selfDmRoom = await this.roomRepo.findOne({
      where: {
        organizationId: params.organizationId,
        roomType: ChatRoomType.DM,
        roomKey: buildSelfDmRoomKey({
          userId: params.userId,
          scopeFilter: params.scopeFilter,
        }),
        isArchived: false,
      },
      select: ['id'],
    });

    if (selfDmRoom) {
      dmRoomMap.set(params.userId, selfDmRoom.id);
    }
  }

  return dmRoomMap;
}

async function queryPeopleSection(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    limit: number;
    sort: ChatGlobalSearchSort;
    includeTotalCount?: boolean;
    roomId?: string;
  },
): Promise<SearchSectionResult<GlobalSearchSuggestPersonItemResponse>> {
  const keywordLower = params.keyword.toLowerCase();
  const keywordPrefix = `${keywordLower}%`;
  const baseQb = buildPeopleSearchBaseQuery.call(this, {
    organizationId: params.organizationId,
    userId: params.userId,
    keyword: params.keyword,
    scopeFilter: params.scopeFilter,
    roomId: params.roomId,
  });

  const totalCountPromise = params.includeTotalCount
    ? baseQb.clone().getCount()
    : Promise.resolve(undefined);

  const fetchQb = baseQb
    .select([
      'u.id AS "userId"',
      'u.email AS "email"',
      'u.first_name AS "firstName"',
      'u.last_name AS "lastName"',
      'u.avatar_url AS "avatarUrl"',
      'presence.presence_status AS "presenceStatus"',
      'presence.last_activity_at AS "lastActivityAt"',
    ])
    .addSelect(
      [
        'CASE',
        "WHEN LOWER(COALESCE(u.email, '')) = :keywordLower THEN 0",
        "WHEN LOWER(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))) = :keywordLower THEN 0",
        "WHEN LOWER(COALESCE(u.email, '')) LIKE :keywordPrefix THEN 1",
        "WHEN LOWER(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))) LIKE :keywordPrefix THEN 1",
        'ELSE 2',
        'END',
      ].join(' '),
      'rankBucket',
    )
    .setParameters({
      keywordLower,
      keywordPrefix,
    });

  if (params.sort === ChatGlobalSearchSort.RECENT) {
    fetchQb
      .orderBy(
        'COALESCE(presence.last_activity_at, presence.updated_at, om.updated_at)',
        'DESC',
      )
      .addOrderBy('u.id', 'ASC');
  } else {
    fetchQb
      .orderBy('"rankBucket"', 'ASC')
      .addOrderBy(
        'COALESCE(presence.last_activity_at, presence.updated_at, om.updated_at)',
        'DESC',
      )
      .addOrderBy('u.id', 'ASC');
  }

  const rows = (await fetchQb.limit(params.limit + 1).getRawMany()) as PeopleRawRow[];
  const hasMore = rows.length > params.limit;
  const pageRows = hasMore ? rows.slice(0, params.limit) : rows;

  const dmRoomMap = await loadDmRoomIdsForUsers.call(this, {
    organizationId: params.organizationId,
    userId: params.userId,
    candidateUserIds: pageRows.map((row) => row.userId),
    scopeFilter: params.scopeFilter,
  });

  const items: GlobalSearchSuggestPersonItemResponse[] = pageRows.map((row) => ({
    entityType: ChatGlobalSearchEntityType.PERSON,
    userId: row.userId,
    displayName: this.buildUserDisplayName({
      userId: row.userId,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
    }),
    email: row.email,
    avatarUrl: row.avatarUrl,
    presenceStatus: row.presenceStatus || ChatPresenceStatus.OFFLINE,
    isSelf: row.userId === params.userId,
    dmRoomId: dmRoomMap.get(row.userId),
  }));

  const totalCount = await totalCountPromise;
  return {
    count: resolveSectionCount({
      totalCount,
      hasMore,
      pageRowsLength: pageRows.length,
      fetchedRowsLength: rows.length,
    }),
    hasMore,
    items,
  };
}

async function queryRoomsSection(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    limit: number;
    sort: ChatGlobalSearchSort;
    includeTotalCount?: boolean;
    roomId?: string;
    roomType?: ChatRoomType;
    currentRoomId?: string;
  },
): Promise<SearchSectionResult<GlobalSearchSuggestRoomItemResponse>> {
  const keywordLower = params.keyword.toLowerCase();
  const keywordPrefix = `${keywordLower}%`;

  const baseQb = buildRoomSearchBaseQuery.call(this, {
    organizationId: params.organizationId,
    userId: params.userId,
    keyword: params.keyword,
    scopeFilter: params.scopeFilter,
    roomId: params.roomId,
    roomType: params.roomType,
  });

  const totalCountPromise = params.includeTotalCount
    ? baseQb.clone().getCount()
    : Promise.resolve(undefined);

  const fetchQb = baseQb
    .select([
      'r.id AS "roomId"',
      'r.room_type AS "roomType"',
      'r.visibility AS "visibility"',
      'r.name AS "name"',
      'r.room_key AS "roomKey"',
      'r.topic AS "topic"',
      'r.last_message_at AS "lastMessageAt"',
      'r.updated_at AS "updatedAt"',
      'rm.is_starred AS "isStarred"',
    ])
    .addSelect(
      [
        'CASE',
        "WHEN LOWER(COALESCE(r.name, r.room_key, '')) = :keywordLower THEN 0",
        "WHEN LOWER(COALESCE(r.name, r.room_key, '')) LIKE :keywordPrefix THEN 1",
        'ELSE 2',
        'END',
      ].join(' '),
      'rankBucket',
    )
    .setParameters({
      keywordLower,
      keywordPrefix,
    });

  if (params.currentRoomId) {
    fetchQb
      .addSelect('CASE WHEN r.id = :currentRoomId THEN 0 ELSE 1 END', 'contextBoost')
      .setParameter('currentRoomId', params.currentRoomId);
  } else {
    fetchQb.addSelect('1', 'contextBoost');
  }

  if (params.sort === ChatGlobalSearchSort.RECENT) {
    fetchQb
      .orderBy('"contextBoost"', 'ASC')
      .addOrderBy('r.last_message_at', 'DESC', 'NULLS LAST')
      .addOrderBy('r.updated_at', 'DESC')
      .addOrderBy('r.id', 'ASC');
  } else {
    fetchQb
      .orderBy('"rankBucket"', 'ASC')
      .addOrderBy('"contextBoost"', 'ASC')
      .addOrderBy('rm.is_starred', 'DESC')
      .addOrderBy('r.last_message_at', 'DESC', 'NULLS LAST')
      .addOrderBy('r.updated_at', 'DESC')
      .addOrderBy('r.id', 'ASC');
  }

  const rows = (await fetchQb.limit(params.limit + 1).getRawMany()) as RoomRawRow[];
  const hasMore = rows.length > params.limit;
  const pageRows = hasMore ? rows.slice(0, params.limit) : rows;

  const memberCountMap = await this.getActiveMemberCountMap(
    pageRows.map((row) => row.roomId),
  );

  const items: GlobalSearchSuggestRoomItemResponse[] = pageRows.map((row) => ({
    entityType: ChatGlobalSearchEntityType.ROOM,
    roomId: row.roomId,
    roomType: row.roomType,
    visibility: row.visibility,
    name: row.name,
    roomKey: row.roomKey,
    topic: row.topic,
    memberCount: memberCountMap.get(row.roomId) || 0,
    lastMessageAt: row.lastMessageAt,
  }));

  const totalCount = await totalCountPromise;
  return {
    count: resolveSectionCount({
      totalCount,
      hasMore,
      pageRowsLength: pageRows.length,
      fetchedRowsLength: rows.length,
    }),
    hasMore,
    items,
  };
}

async function queryMessagesSection(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    limit: number;
    sort: ChatGlobalSearchSort;
    includeTotalCount?: boolean;
    roomId?: string;
    roomType?: ChatRoomType;
    fromUserId?: string;
    hasAttachments?: boolean;
    dateRange?: DateRangeFilter;
    currentRoomId?: string;
    cursor?: string;
  },
): Promise<SearchSectionResult<GlobalSearchSuggestMessageItemResponse>> {
  const keywordLower = params.keyword.toLowerCase();
  const keywordPrefix = `${keywordLower}%`;

  const { qb: baseQb, useFullTextSearch } = buildMessageSearchBaseQuery.call(this, {
    organizationId: params.organizationId,
    userId: params.userId,
    keyword: params.keyword,
    scopeFilter: params.scopeFilter,
    roomId: params.roomId,
    roomType: params.roomType,
    fromUserId: params.fromUserId,
    hasAttachments: params.hasAttachments,
    dateRange: params.dateRange,
  });

  const totalCountPromise = params.includeTotalCount
    ? baseQb.clone().getCount()
    : Promise.resolve(undefined);

  const fetchQb = baseQb
    .select([
      'm.id AS "messageId"',
      'r.id AS "roomId"',
      'COALESCE(r.name, r.room_key) AS "roomName"',
      'r.room_type AS "roomType"',
      'm.sender_id AS "senderId"',
      'u.email AS "senderEmail"',
      'u.first_name AS "senderFirstName"',
      'u.last_name AS "senderLastName"',
      'u.avatar_url AS "senderAvatarUrl"',
      'm.content AS "content"',
      'm.sent_at AS "sentAt"',
    ])
    .addSelect(
      'EXISTS (SELECT 1 FROM chat.message_attachments ma WHERE ma.organization_id = m.organization_id AND ma.message_id = m.id)',
      'hasAttachments',
    )
    .addSelect(
      [
        'CASE',
        "WHEN LOWER(COALESCE(m.content, '')) = :keywordLower THEN 0",
        "WHEN LOWER(COALESCE(m.content, '')) LIKE :keywordPrefix THEN 1",
        'ELSE 2',
        'END',
      ].join(' '),
      'rankBucket',
    )
    .setParameters({
      keywordLower,
      keywordPrefix,
    });

  if (useFullTextSearch) {
    fetchQb.addSelect(
      "ts_rank_cd(to_tsvector('simple', COALESCE(m.content, '')), plainto_tsquery('simple', :keywordTs))",
      'searchRank',
    );
  }

  if (params.currentRoomId) {
    fetchQb
      .addSelect('CASE WHEN r.id = :currentRoomId THEN 0 ELSE 1 END', 'contextBoost')
      .setParameter('currentRoomId', params.currentRoomId);
  } else {
    fetchQb.addSelect('1', 'contextBoost');
  }

  if (params.cursor) {
    const decodedCursor = this.decodeRoomMessageCursor(params.cursor);
    if (!decodedCursor) {
      throw new BadRequestException('Invalid cursor');
    }
    fetchQb.andWhere(
      '(m.sent_at < :cursorSentAt OR (m.sent_at = :cursorSentAt AND m.id < :cursorId))',
      {
        cursorSentAt: decodedCursor.sentAt,
        cursorId: decodedCursor.id,
      },
    );
  }

  if (params.sort === ChatGlobalSearchSort.RECENT) {
    fetchQb
      .orderBy('"contextBoost"', 'ASC')
      .addOrderBy('m.sent_at', 'DESC')
      .addOrderBy('m.id', 'DESC');
  } else {
    fetchQb.orderBy('"rankBucket"', 'ASC').addOrderBy('"contextBoost"', 'ASC');
    if (useFullTextSearch) {
      fetchQb.addOrderBy('"searchRank"', 'DESC');
    }
    fetchQb.addOrderBy('m.sent_at', 'DESC').addOrderBy('m.id', 'DESC');
  }

  const rows = (await fetchQb
    .limit(params.limit + 1)
    .getRawMany()) as MessageRawRow[];
  const hasMore = rows.length > params.limit;
  const pageRows = hasMore ? rows.slice(0, params.limit) : rows;

  const items: GlobalSearchSuggestMessageItemResponse[] = pageRows.map((row) => ({
    entityType: ChatGlobalSearchEntityType.MESSAGE,
    messageId: row.messageId,
    roomId: row.roomId,
    roomName: row.roomName,
    roomType: row.roomType,
    senderId: row.senderId,
    senderDisplayName: row.senderId
      ? this.buildUserDisplayName({
          userId: row.senderId,
          email: row.senderEmail,
          firstName: row.senderFirstName,
          lastName: row.senderLastName,
        })
      : undefined,
    senderAvatarUrl: row.senderAvatarUrl,
    snippet: this.buildSearchSnippet(row.content, params.keyword),
    sentAt: row.sentAt,
    hasAttachments: toBoolean(row.hasAttachments),
  }));

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && lastRow
      ? this.encodeRoomMessageCursor({
          sentAt: lastRow.sentAt,
          id: lastRow.messageId,
        })
      : undefined;

  const totalCount = await totalCountPromise;
  return {
    count: resolveSectionCount({
      totalCount,
      hasMore,
      pageRowsLength: pageRows.length,
      fetchedRowsLength: rows.length,
    }),
    hasMore,
    nextCursor,
    items,
  };
}

async function queryFilesSection(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    limit: number;
    sort: ChatGlobalSearchSort;
    includeTotalCount?: boolean;
    roomId?: string;
    roomType?: ChatRoomType;
    fromUserId?: string;
    fileType?: string;
    dateRange?: DateRangeFilter;
    currentRoomId?: string;
    cursor?: string;
  },
): Promise<SearchSectionResult<GlobalSearchSuggestFileItemResponse>> {
  const keywordLower = params.keyword.toLowerCase();
  const keywordPrefix = `${keywordLower}%`;
  const keywordLikeLower = `%${keywordLower}%`;
  const baseQb = buildFileSearchBaseQuery.call(this, {
    organizationId: params.organizationId,
    userId: params.userId,
    keyword: params.keyword,
    scopeFilter: params.scopeFilter,
    roomId: params.roomId,
    roomType: params.roomType,
    fromUserId: params.fromUserId,
    fileType: params.fileType,
    dateRange: params.dateRange,
  });

  const totalCountPromise = params.includeTotalCount
    ? baseQb.clone().getCount()
    : Promise.resolve(undefined);

  const fetchQb = baseQb
    .select([
      'a.id AS "attachmentId"',
      'a.message_id AS "messageId"',
      'r.id AS "roomId"',
      'COALESCE(r.name, r.room_key) AS "roomName"',
      'a.file_name AS "fileName"',
      'a.document_type AS "documentType"',
      'a.attachment_type AS "attachmentType"',
      'm.sender_id AS "uploaderId"',
      'u.email AS "uploaderEmail"',
      'u.first_name AS "uploaderFirstName"',
      'u.last_name AS "uploaderLastName"',
      'm.sent_at AS "sentAt"',
    ])
    .addSelect(
      [
        'CASE',
        "WHEN LOWER(COALESCE(a.file_name, '')) = :keywordLower THEN 0",
        "WHEN LOWER(COALESCE(a.file_name, '')) LIKE :keywordPrefix THEN 1",
        "WHEN LOWER(COALESCE(a.file_name, '')) LIKE :keywordLikeLower THEN 2",
        "WHEN LOWER(COALESCE(a.document_type, '')) = :keywordLower THEN 3",
        "WHEN LOWER(COALESCE(a.document_type, '')) LIKE :keywordPrefix THEN 4",
        "WHEN LOWER(COALESCE(u.email, '')) = :keywordLower THEN 5",
        "WHEN LOWER(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))) = :keywordLower THEN 5",
        "WHEN LOWER(COALESCE(u.email, '')) LIKE :keywordPrefix THEN 6",
        "WHEN LOWER(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))) LIKE :keywordPrefix THEN 6",
        'ELSE 7',
        'END',
      ].join(' '),
      'rankBucket',
    )
    .setParameters({
      keywordLower,
      keywordPrefix,
      keywordLikeLower,
    });

  if (params.currentRoomId) {
    fetchQb
      .addSelect('CASE WHEN r.id = :currentRoomId THEN 0 ELSE 1 END', 'contextBoost')
      .setParameter('currentRoomId', params.currentRoomId);
  } else {
    fetchQb.addSelect('1', 'contextBoost');
  }

  if (params.cursor) {
    const decodedCursor = this.decodeRoomMessageCursor(params.cursor);
    if (!decodedCursor) {
      throw new BadRequestException('Invalid cursor');
    }
    fetchQb.andWhere(
      '(m.sent_at < :cursorSentAt OR (m.sent_at = :cursorSentAt AND a.id < :cursorId))',
      {
        cursorSentAt: decodedCursor.sentAt,
        cursorId: decodedCursor.id,
      },
    );
  }

  if (params.sort === ChatGlobalSearchSort.RECENT) {
    fetchQb
      .orderBy('"contextBoost"', 'ASC')
      .addOrderBy('m.sent_at', 'DESC')
      .addOrderBy('a.id', 'DESC');
  } else {
    fetchQb
      .orderBy('"rankBucket"', 'ASC')
      .addOrderBy('"contextBoost"', 'ASC')
      .addOrderBy('m.sent_at', 'DESC')
      .addOrderBy('a.id', 'DESC');
  }

  const rows = (await fetchQb.limit(params.limit + 1).getRawMany()) as FileRawRow[];
  const hasMore = rows.length > params.limit;
  const pageRows = hasMore ? rows.slice(0, params.limit) : rows;

  const items: GlobalSearchSuggestFileItemResponse[] = pageRows.map((row) => ({
    entityType: ChatGlobalSearchEntityType.FILE,
    attachmentId: row.attachmentId,
    messageId: row.messageId,
    roomId: row.roomId,
    roomName: row.roomName,
    fileName: row.fileName,
    documentType: row.documentType,
    attachmentType: row.attachmentType,
    uploaderDisplayName: row.uploaderId
      ? this.buildUserDisplayName({
          userId: row.uploaderId,
          email: row.uploaderEmail,
          firstName: row.uploaderFirstName,
          lastName: row.uploaderLastName,
        })
      : undefined,
    sentAt: row.sentAt,
  }));

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && lastRow
      ? this.encodeRoomMessageCursor({
          sentAt: lastRow.sentAt,
          id: lastRow.attachmentId,
        })
      : undefined;

  const totalCount = await totalCountPromise;
  return {
    count: resolveSectionCount({
      totalCount,
      hasMore,
      pageRowsLength: pageRows.length,
      fetchedRowsLength: rows.length,
    }),
    hasMore,
    nextCursor,
    items,
  };
}

async function countPeopleMatches(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    roomId?: string;
  },
): Promise<number> {
  const qb = buildPeopleSearchBaseQuery.call(this, params);
  return qb.getCount();
}

async function countRoomsMatches(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    roomId?: string;
    roomType?: ChatRoomType;
  },
): Promise<number> {
  const qb = buildRoomSearchBaseQuery.call(this, params);
  return qb.getCount();
}

async function countMessagesMatches(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    roomId?: string;
    roomType?: ChatRoomType;
    fromUserId?: string;
    hasAttachments?: boolean;
    dateRange?: DateRangeFilter;
  },
): Promise<number> {
  const { qb } = buildMessageSearchBaseQuery.call(this, params);
  return qb.getCount();
}

async function countFilesMatches(
  this: ChatBoxServiceDelegateContext,
  params: {
    organizationId: string;
    userId: string;
    keyword: string;
    scopeFilter: ScopeFilter;
    roomId?: string;
    roomType?: ChatRoomType;
    fromUserId?: string;
    fileType?: string;
    dateRange?: DateRangeFilter;
  },
): Promise<number> {
  const qb = buildFileSearchBaseQuery.call(this, params);
  return qb.getCount();
}

export async function searchGlobalSuggest(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  query: SearchGlobalSuggestQueryRequest,
): Promise<SearchGlobalSuggestResponse> {
  const startedAt = Date.now();
  await this.assertActiveOrgMember(organizationId, userId);

  const keyword = normalizeSearchKeyword(query.q);
  if (keyword.length < 2) {
    throw new BadRequestException('q must contain at least 2 characters');
  }

  const scopeFilter =
    await this.chatScopeAccessPolicyService.validateRoomScopeFilter(
      organizationId,
      userId,
      {
        contextScope: query.contextScope,
        contextId: query.contextId,
      },
    );

  const limitPerSection = query.limitPerSection ?? 5;

  const [people, rooms, messages, files] = await Promise.all([
    queryPeopleSection.call(this, {
      organizationId,
      userId,
      keyword,
      scopeFilter,
      limit: limitPerSection,
      sort: ChatGlobalSearchSort.BEST_MATCH,
    }),
    queryRoomsSection.call(this, {
      organizationId,
      userId,
      keyword,
      scopeFilter,
      limit: limitPerSection,
      sort: ChatGlobalSearchSort.BEST_MATCH,
      currentRoomId: query.currentRoomId,
    }),
    queryMessagesSection.call(this, {
      organizationId,
      userId,
      keyword,
      scopeFilter,
      limit: limitPerSection,
      sort: ChatGlobalSearchSort.BEST_MATCH,
      currentRoomId: query.currentRoomId,
    }),
    queryFilesSection.call(this, {
      organizationId,
      userId,
      keyword,
      scopeFilter,
      limit: limitPerSection,
      sort: ChatGlobalSearchSort.BEST_MATCH,
      currentRoomId: query.currentRoomId,
    }),
  ]);

  return {
    query: keyword,
    tookMs: Date.now() - startedAt,
    sections: {
      people,
      rooms,
      messages,
      files,
    },
  };
}

export async function searchGlobalResults(
  this: ChatBoxServiceDelegateContext,
  organizationId: string,
  userId: string,
  query: SearchGlobalResultsQueryRequest,
): Promise<SearchGlobalResultsResponse> {
  const startedAt = Date.now();
  await this.assertActiveOrgMember(organizationId, userId);

  const keyword = normalizeSearchKeyword(query.q);
  if (!keyword) {
    throw new BadRequestException('q is required');
  }

  const scopeFilter =
    await this.chatScopeAccessPolicyService.validateRoomScopeFilter(
      organizationId,
      userId,
      {
        contextScope: query.contextScope,
        contextId: query.contextId,
      },
    );

  const selectedTab = query.tab ?? ChatGlobalSearchTab.ALL;
  const sort = query.sort ?? ChatGlobalSearchSort.BEST_MATCH;
  const limit = query.limit ?? 20;
  const dateRange = parseDateRangeFilter(query);

  const countsPromise = Promise.all([
    countPeopleMatches.call(this, {
      organizationId,
      userId,
      keyword,
      scopeFilter,
      roomId: query.roomId,
    }),
    countRoomsMatches.call(this, {
      organizationId,
      userId,
      keyword,
      scopeFilter,
      roomId: query.roomId,
      roomType: query.roomType,
    }),
    countMessagesMatches.call(this, {
      organizationId,
      userId,
      keyword,
      scopeFilter,
      roomId: query.roomId,
      roomType: query.roomType,
      fromUserId: query.fromUserId,
      hasAttachments: query.hasAttachments,
      dateRange,
    }),
    countFilesMatches.call(this, {
      organizationId,
      userId,
      keyword,
      scopeFilter,
      roomId: query.roomId,
      roomType: query.roomType,
      fromUserId: query.fromUserId,
      fileType: query.fileType,
      dateRange,
    }),
  ]).then(([people, rooms, messages, files]) => ({
    people,
    rooms,
    messages,
    files,
  }));

  if (selectedTab === ChatGlobalSearchTab.ALL) {
    const sectionLimit = Math.min(10, Math.max(1, limit));
    const [counts, people, rooms, messages, files] = await Promise.all([
      countsPromise,
      queryPeopleSection.call(this, {
        organizationId,
        userId,
        keyword,
        scopeFilter,
        limit: sectionLimit,
        sort,
        roomId: query.roomId,
      }),
      queryRoomsSection.call(this, {
        organizationId,
        userId,
        keyword,
        scopeFilter,
        limit: sectionLimit,
        sort,
        roomId: query.roomId,
        roomType: query.roomType,
      }),
      queryMessagesSection.call(this, {
        organizationId,
        userId,
        keyword,
        scopeFilter,
        limit: sectionLimit,
        sort,
        roomId: query.roomId,
        roomType: query.roomType,
        fromUserId: query.fromUserId,
        hasAttachments: query.hasAttachments,
        dateRange,
      }),
      queryFilesSection.call(this, {
        organizationId,
        userId,
        keyword,
        scopeFilter,
        limit: sectionLimit,
        sort,
        roomId: query.roomId,
        roomType: query.roomType,
        fromUserId: query.fromUserId,
        fileType: query.fileType,
        dateRange,
      }),
    ]);

    const peopleSection: SearchSectionResult<GlobalSearchSuggestPersonItemResponse> = {
      ...people,
      count: counts.people,
      hasMore: counts.people > people.items.length,
    };
    const roomsSection: SearchSectionResult<GlobalSearchSuggestRoomItemResponse> = {
      ...rooms,
      count: counts.rooms,
      hasMore: counts.rooms > rooms.items.length,
    };
    const messagesSection: SearchSectionResult<GlobalSearchSuggestMessageItemResponse> = {
      ...messages,
      count: counts.messages,
      hasMore: counts.messages > messages.items.length,
    };
    const filesSection: SearchSectionResult<GlobalSearchSuggestFileItemResponse> = {
      ...files,
      count: counts.files,
      hasMore: counts.files > files.items.length,
    };

    return {
      query: keyword,
      selectedTab,
      sort,
      tookMs: Date.now() - startedAt,
      counts,
      items: [],
      sections: {
        people: peopleSection,
        rooms: roomsSection,
        messages: messagesSection,
        files: filesSection,
      },
      hasMore:
        peopleSection.hasMore ||
        roomsSection.hasMore ||
        messagesSection.hasMore ||
        filesSection.hasMore,
      nextCursor: undefined,
    };
  }

  let selectedItems: GlobalSearchResultItemResponse[] = [];
  let hasMore = false;
  let nextCursor: string | undefined;

  switch (selectedTab) {
    case ChatGlobalSearchTab.PEOPLE: {
      const people = await queryPeopleSection.call(this, {
        organizationId,
        userId,
        keyword,
        scopeFilter,
        limit,
        sort,
        roomId: query.roomId,
      });
      selectedItems = people.items;
      hasMore = people.hasMore;
      break;
    }
    case ChatGlobalSearchTab.ROOMS: {
      const rooms = await queryRoomsSection.call(this, {
        organizationId,
        userId,
        keyword,
        scopeFilter,
        limit,
        sort,
        roomId: query.roomId,
        roomType: query.roomType,
      });
      selectedItems = rooms.items;
      hasMore = rooms.hasMore;
      break;
    }
    case ChatGlobalSearchTab.MESSAGES: {
      const messages = await queryMessagesSection.call(this, {
        organizationId,
        userId,
        keyword,
        scopeFilter,
        limit,
        sort,
        roomId: query.roomId,
        roomType: query.roomType,
        fromUserId: query.fromUserId,
        hasAttachments: query.hasAttachments,
        dateRange,
        cursor: query.cursor,
      });
      selectedItems = messages.items;
      hasMore = messages.hasMore;
      nextCursor = messages.nextCursor;
      break;
    }
    case ChatGlobalSearchTab.FILES: {
      const files = await queryFilesSection.call(this, {
        organizationId,
        userId,
        keyword,
        scopeFilter,
        limit,
        sort,
        roomId: query.roomId,
        roomType: query.roomType,
        fromUserId: query.fromUserId,
        fileType: query.fileType,
        dateRange,
        cursor: query.cursor,
      });
      selectedItems = files.items;
      hasMore = files.hasMore;
      nextCursor = files.nextCursor;
      break;
    }
    default:
      break;
  }

  return {
    query: keyword,
    selectedTab,
    sort,
    tookMs: Date.now() - startedAt,
    counts: await countsPromise,
    items: selectedItems,
    hasMore,
    nextCursor,
  };
}

