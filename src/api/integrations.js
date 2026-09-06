import { base44 } from './base44Client';




// UploadFile stays client-side (user file uploads are safe to expose).
// Restricted Core integrations (InvokeLLM, SendEmail, GenerateImage, etc.) are
// invoked ONLY from backend functions via base44.asServiceRole.integrations.Core
// to protect integration credits. See base44/functions/*.
export const UploadFile = base44.integrations.Core.UploadFile;