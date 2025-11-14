// Типы для JSON схемы шаблона
export interface TemplateField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  label?: string;
  description?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  enum?: (string | number)[];
  default?: string | number | boolean | any[];
}

export interface TemplateSection {
  id: string;
  title: string;
  fields?: string[];
}

export interface TemplateSchemaJson {
  version?: number;
  category?: string;
  name: string;
  description?: string;
  variables: TemplateField[];
  sections?: TemplateSection[];
}

// Основной тип Template
export interface Template {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  html: string;
  contentHtml?: string; // для обратной совместимости
  isPublished: boolean;
  schemaJson?: TemplateSchemaJson | null;
  documentType?: 'SRS' | 'API' | 'DB' | 'USERFLOWS';
  promptPresetId?: number | null;
  createdById?: number | null;
  createdAt: string;
  updatedAt: string;
}
