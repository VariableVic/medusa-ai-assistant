export type PromptTypes =
  | "fix_writing"
  | "make_longer"
  | "make_shorter"
  | "improve_seo"
  | "fix_and_update";

export type Prompts = {
  [key in PromptTypes]: string;
};
