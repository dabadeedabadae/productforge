/**
 * Конвертирует JSON структуру документа в Markdown
 */
export function jsonToMarkdown(json: any, level: number = 0): string {
  if (json === null || json === undefined) {
    return '';
  }

  if (typeof json === 'string') {
    return json;
  }

  if (typeof json === 'number' || typeof json === 'boolean') {
    return String(json);
  }

  if (Array.isArray(json)) {
    return json
      .map((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const itemMarkdown = jsonToMarkdown(item, level + 1);
          return `${'  '.repeat(level)}${index + 1}. ${itemMarkdown}`;
        }
        return `${'  '.repeat(level)}- ${jsonToMarkdown(item, level)}`;
      })
      .join('\n');
  }

  if (typeof json === 'object') {
    const lines: string[] = [];
    
    for (const [key, value] of Object.entries(json)) {
      const headingLevel = '#'.repeat(Math.min(level + 1, 6));
      const indent = '  '.repeat(level);
      
      if (value === null || value === undefined) {
        continue;
      }

      // Если значение - объект или массив, делаем заголовок
      if (typeof value === 'object') {
        // Проверяем, есть ли у объекта структура секции документа
        if (value && typeof value === 'object' && 'title' in value && 'content' in value) {
          lines.push(`${indent}${headingLevel} ${key}`);
          if (value.title) {
            lines.push(`${indent}**${value.title}**\n`);
          }
          if (value.content) {
            const contentMd = Array.isArray(value.content)
              ? value.content.map((item: any, idx: number) => 
                  typeof item === 'object' 
                    ? `${indent}  ${idx + 1}. ${jsonToMarkdown(item, level + 1)}`
                    : `${indent}  - ${item}`
                ).join('\n')
              : jsonToMarkdown(value.content, level + 1);
            lines.push(contentMd);
          }
        } else if (Array.isArray(value)) {
          lines.push(`${indent}${headingLevel} ${key}`);
          value.forEach((item, idx) => {
            if (typeof item === 'object') {
              lines.push(`${indent}${idx + 1}. ${jsonToMarkdown(item, level + 1)}`);
            } else {
              lines.push(`${indent}- ${item}`);
            }
          });
        } else {
          lines.push(`${indent}${headingLevel} ${key}`);
          lines.push(jsonToMarkdown(value, level + 1));
        }
      } else {
        // Простые значения
        lines.push(`${indent}**${key}**: ${value}`);
      }
      
      lines.push(''); // Пустая строка между секциями
    }
    
    return lines.join('\n');
  }

  return String(json);
}

/**
 * Специализированная конвертация для SRS документов
 */
export function srsToMarkdown(json: any): string {
  if (!json || typeof json !== 'object') {
    return '';
  }

  const lines: string[] = [];
  
  // Заголовок документа
  if (json.title) {
    lines.push(`# ${json.title}\n`);
  }

  // Секции из schemaJson.sections
  if (json.sections && Array.isArray(json.sections)) {
    json.sections.forEach((section: any, index: number) => {
      if (section.id && json[section.id]) {
        const sectionData = json[section.id];
        lines.push(`## ${section.title || section.id}\n`);
        
        if (section.type === 'list' && Array.isArray(sectionData)) {
          sectionData.forEach((item: any, idx: number) => {
            if (typeof item === 'object') {
              lines.push(`${idx + 1}. **${item.title || item.name || 'Item'}**`);
              if (item.description) {
                lines.push(`   ${item.description}`);
              }
              if (item.details) {
                lines.push(`   ${item.details}`);
              }
            } else {
              lines.push(`${idx + 1}. ${item}`);
            }
            lines.push('');
          });
        } else if (section.type === 'markdown') {
          lines.push(sectionData);
          lines.push('');
        } else {
          lines.push(jsonToMarkdown(sectionData, 2));
          lines.push('');
        }
      }
    });
  } else {
    // Fallback: обычная конвертация
    return jsonToMarkdown(json);
  }

  return lines.join('\n');
}

