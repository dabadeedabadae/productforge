import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

export class JsonSchemaService {
  private readonly ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  validateSchema(schema: Record<string, any>): { valid: boolean; errors: string[] } {
    try {
      this.ajv.compile(schema);
      return { valid: true, errors: [] };
    } catch (e: any) {
      return { valid: false, errors: [String(e?.message ?? e)] };
    }
  }

  validateData(schema: Record<string, any>, data: unknown): { valid: boolean; errors: ErrorObject[] } {
    const validate = this.ajv.compile(schema);
    const ok = validate(data);
    return { valid: Boolean(ok), errors: validate.errors ?? [] };
  }
}
