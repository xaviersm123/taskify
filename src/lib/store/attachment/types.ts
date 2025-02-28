export interface Attachment {
  id: string;
  ticket_id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  created_at: string;
  created_by: string;
}

export interface AttachmentState {
  attachments: Attachment[];
  loading: boolean;
  error: string | null;
  uploadAttachment: (ticketId: string, file: File) => Promise<Attachment>;
  deleteAttachment: (id: string) => Promise<void>;
  fetchAttachments: (ticketId: string) => Promise<void>;
}