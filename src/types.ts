export type ResourceType = 'PDF' | 'PPT' | 'Question Paper';

export interface Resource {
  id: string;
  title: string;
  subject: string;
  topic: string;
  type: ResourceType;
  file_url: string;
  description?: string;
  rating?: number;
  uploaded_by: string;
  createdAt: any;
  isExamMode?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
