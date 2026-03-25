import { supabase } from '../lib/supabase';

export interface Document {
  id: string;
  name: string;
  code: string;
  version: string;
  type: string;
  status: 'draft' | 'under_review' | 'approved' | 'archived' | 'expired';
  file_url: string | null;
  approval_date: string | null;
  expiry_date: string | null;
  reviewer_name: string | null;
  approver_name: string | null;
  revision_notes: string | null;
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: string;
  status: string;
  file_url: string | null;
  revision_notes: string | null;
  changed_by: string;
  created_at: string;
}

export interface DocumentApproval {
  id: string;
  document_id: string;
  step: 'review' | 'approval';
  assigned_to: string;
  status: 'pending' | 'approved' | 'rejected';
  comments: string | null;
  action_date: string | null;
  created_at: string;
}

export const documentService = {
  async getDocuments() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('code', { ascending: true });
    
    if (error) throw error;
    return data as Document[];
  },

  async createDocument(doc: Partial<Document>) {
    const { data, error } = await supabase
      .from('documents')
      .insert([doc])
      .select()
      .single();
    
    if (error) throw error;
    return data as Document;
  },

  async updateDocument(id: string, updates: Partial<Document>) {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Document;
  },

  async deleteDocument(id: string) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getVersionHistory(documentId: string) {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as DocumentVersion[];
  },

  async createVersionSnapshot(doc: Document) {
    const { error } = await supabase
      .from('document_versions')
      .insert([{
        document_id: doc.id,
        version: doc.version,
        status: doc.status,
        file_url: doc.file_url,
        revision_notes: doc.revision_notes,
        changed_by: doc.approver_name || 'System'
      }]);
    
    if (error) throw error;
  },

  async getApprovals(documentId: string) {
    const { data, error } = await supabase
      .from('document_approvals')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data as DocumentApproval[];
  },

  async requestApproval(documentId: string, assignedTo: string, step: 'review' | 'approval') {
    const { error } = await supabase
      .from('document_approvals')
      .insert([{
        document_id: documentId,
        step,
        assigned_to: assignedTo,
        status: 'pending'
      }]);
    
    if (error) throw error;

    await this.updateDocument(documentId, { 
       status: step === 'review' ? 'under_review' : 'under_review',
       [step === 'review' ? 'reviewer_name' : 'approver_name']: assignedTo
    });
  },

  async approveDocument(doc: Document, role: 'reviewer' | 'approver', comments: string) {
    const isFinal = role === 'approver';
    const nextStatus = isFinal ? 'approved' : 'under_review'; // Simple flow: review -> approval -> approved
    
    // Update document
    const updatedDoc = await this.updateDocument(doc.id, {
      status: nextStatus as Document['status'],
      approval_date: isFinal ? new Date().toISOString() : doc.approval_date,
      revision_notes: comments
    });

    // Create history snapshot if final
    if (isFinal) {
      await this.createVersionSnapshot(updatedDoc);
    }

    // Record approval step (simple logic for now)
    const { data: currentApps } = await supabase.from('document_approvals').select('id').eq('document_id', doc.id).eq('status', 'pending').limit(1);
    if (currentApps?.[0]) {
      await supabase.from('document_approvals').update({
        status: 'approved',
        comments,
        action_date: new Date().toISOString()
      }).eq('id', currentApps[0].id);
    }

    if (!isFinal && role === 'reviewer') {
       // Request next step (Aprobación Calidad)
       await this.requestApproval(doc.id, 'Gerente de Calidad', 'approval');
    }
  },

  async rejectDocument(documentId: string, comments: string) {
    await this.updateDocument(documentId, { status: 'draft' });
    
    const { data: currentApps } = await supabase.from('document_approvals').select('id').eq('document_id', documentId).eq('status', 'pending').limit(1);
    if (currentApps?.[0]) {
      await supabase.from('document_approvals').update({
        status: 'rejected',
        comments,
        action_date: new Date().toISOString()
      }).eq('id', currentApps[0].id);
    }
  },

  async uploadFile(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('managemet_assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('managemet_assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
