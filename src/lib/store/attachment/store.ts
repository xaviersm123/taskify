// attachment/store.ts
import { create } from 'zustand';
import { supabase } from '../../supabase/client';
import { AttachmentState, Attachment } from './types';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export const useAttachmentStore = create<AttachmentState>((set, get) => ({
  attachments: [],
  loading: false,
  error: null,

  uploadAttachment: async (ticketId: string, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File ${file.name} exceeds 15MB limit`);
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${ticketId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      const attachment: Partial<Attachment> = {
        ticket_id: ticketId,
        name: file.name,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type,
      };

      const { data, error } = await supabase
        .from('attachments')
        .insert([attachment])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        attachments: [...state.attachments, data],
        error: null,
      }));

      return data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteAttachment: async (id: string) => {
    try {
      const { data: attachment } = await supabase
        .from('attachments')
        .select('url')
        .eq('id', id)
        .single();

      if (attachment) {
        const filePath = new URL(attachment.url).pathname.split('/').pop();
        await supabase.storage
          .from('attachments')
          .remove([`${filePath}`]);
      }

      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        attachments: state.attachments.filter((a) => a.id !== id),
        error: null,
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  fetchAttachments: async (ticketId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ attachments: data || [], loading: false, error: null });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Optional: Add a batch upload method if needed
  uploadMultipleAttachments: async (ticketId: string, files: File[]) => {
    const uploadPromises = files.map((file) => get().uploadAttachment(ticketId, file));
    try {
      await Promise.all(uploadPromises);
      await get().fetchAttachments(ticketId);
    } catch (error: any) {
      set({ error: error.message || 'Failed to upload one or more files' });
      throw error;
    }
  },
}));