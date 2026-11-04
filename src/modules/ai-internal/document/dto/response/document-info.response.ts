export class AiInternalDocumentInfoResponse {
  id: string;
  organizationId?: string;
  title: string;
  filePath: string;
  fileName?: string;
  mimeType?: string;
  fileType?: string;
  accessScope: string;
  folderId?: string;
  folderPathIds?: string[];
  projectId?: string;
  categoryId?: string;
  uploadedBy?: string;
  isActive: boolean;
  status: string;
  version: number;
}
