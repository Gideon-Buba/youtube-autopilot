export interface Fact {
  number: number;
  heading: string;
  narration: string;
  imagePrompt: string;
}

export interface Script {
  title: string;
  description: string;
  tags: string[];
  hook: string;
  facts: Fact[];
  outro: string;
}

export interface AudioSegment {
  label: string;
  audioPath: string;
  imagePrompt: string;
}

export interface SegmentWithImage extends AudioSegment {
  imagePath: string;
}

export type ApprovalDecision = "approve" | "reject";
