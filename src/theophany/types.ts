export interface ExplainerSegment {
  id: string;
  label: string;
  narration: string;
  imagePrompt: string;
}

export interface TheologyScript {
  title: string;
  description: string;
  tags: string[];
  passage: string;
  hookQuestion: string;
  segments: ExplainerSegment[];
  outro: string;
}

export interface AudioSegment {
  id: string;
  label: string;
  audioPath: string;
  imagePrompt: string;
}

export interface RenderedSegment extends AudioSegment {
  imagePath: string;
}

export type ApprovalDecision = "approve" | "reject";
