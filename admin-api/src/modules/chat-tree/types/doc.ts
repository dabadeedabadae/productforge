export type Section = {
  key: string;
  title: string;
  markdown: string;
  [k: string]: any;
};

export type DocJson = {
  version: string;
  meta: Record<string, any>;
  sections: Section[];
};
