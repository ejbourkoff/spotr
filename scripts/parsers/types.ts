export interface ParsedCoach {
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  bioUrl: string | null;
}

export type Parser = (html: string, baseUrl: string) => ParsedCoach[];

export type CmsType = "sidearm" | "presto" | "generic" | "unknown";
