export interface ScriptResult { logs: string[]; errors: string[] }
export type ScriptHost = {
  find(name: string): { transform: { position: { x: number; y: number } } } | undefined;
  add?(name: string, x: number, y: number): void;
  remove?(name: string): void;
};

type Value = number | string;
class ExpressionParser {
  private index = 0;
  private readonly tokens: string[];
  constructor(source: string, private readonly variables: Map<string, number>) {
    this.tokens = source.match(/\d+(?:\.\d+)?|[A-Za-z_]\w*|[()+*/-]/g) ?? [];
    if (this.tokens.join('').replace(/\s/g, '') !== source.replace(/\s/g, '')) throw new Error('Invalid expression token.');
  }
  parse(): number { const value = this.additive(); if (this.index < this.tokens.length) throw new Error('Unexpected token in expression.'); if (!Number.isFinite(value)) throw new Error('Expression must be finite.'); return value; }
  private additive(): number { let value = this.product(); while (this.peek() === '+' || this.peek() === '-') { const op = this.take(); const rhs = this.product(); value = op === '+' ? value + rhs : value - rhs; } return value; }
  private product(): number { let value = this.unary(); while (this.peek() === '*' || this.peek() === '/') { const op = this.take(); const rhs = this.unary(); if (op === '/' && rhs === 0) throw new Error('Division by zero.'); value = op === '*' ? value * rhs : value / rhs; } return value; }
  private unary(): number { if (this.peek() === '-') { this.take(); return -this.unary(); } if (this.peek() === '+') { this.take(); return this.unary(); } if (this.peek() === '(') { this.take(); const value = this.additive(); if (this.take() !== ')') throw new Error('Expected closing parenthesis.'); return value; } const token = this.take(); if (!token) throw new Error('Expected a value.'); if (/^\d/.test(token)) return Number(token); const value = this.variables.get(token); if (value === undefined) throw new Error(`Unknown variable '${token}'.`); return value; }
  private peek(): string | undefined { return this.tokens[this.index]; }
  private take(): string | undefined { return this.tokens[this.index++]; }
}

/** Safe, line-oriented Z# subset; only explicit engine commands are callable. */
export class ZSharpRuntime {
  run(source: string, host: ScriptHost): ScriptResult {
    const result: ScriptResult = { logs: [], errors: [] }; const variables = new Map<string, number>();
    const lines = source.split(/\r?\n/); let skipping = false;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]!.trim(); if (!line || line.startsWith('//')) continue;
      if (line === 'end') { skipping = false; continue; }
      if (line.startsWith('if ')) {
        const condition = /^if\s+(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/.exec(line);
        if (!condition) { result.errors.push(`Line ${index + 1}: expected if <expression> <comparison> <expression>.`); skipping = true; continue; }
        try { const a = this.number(condition[1]!, variables); const b = this.number(condition[3]!, variables); const op = condition[2]; skipping = !(op === '==' ? a === b : op === '!=' ? a !== b : op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b); } catch (error) { result.errors.push(`Line ${index + 1}: ${this.message(error)}`); skipping = true; }
        continue;
      }
      if (skipping) continue;
      try {
        let match = /^let\s+([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(line);
        if (match) { variables.set(match[1]!, this.number(match[2]!, variables)); continue; }
        match = /^print\((.*)\)$/.exec(line);
        if (match) { result.logs.push(this.value(match[1]!, variables)); continue; }
        match = /^move\("([^"\n]+)",\s*(.+),\s*(.+)\)$/.exec(line);
        if (match) { const object = host.find(match[1]!); if (!object) throw new Error(`Object '${match[1]}' was not found.`); object.transform.position.x += this.number(match[2]!, variables); object.transform.position.y += this.number(match[3]!, variables); continue; }
        match = /^set\("([^"\n]+)\.(x|y)",\s*(.+)\)$/.exec(line);
        if (match) { const object = host.find(match[1]!); if (!object) throw new Error(`Object '${match[1]}' was not found.`); object.transform.position[match[2] as 'x' | 'y'] = this.number(match[3]!, variables); continue; }
        match = /^spawn\("([^"\n]+)",\s*(.+),\s*(.+)\)$/.exec(line);
        if (match && host.add) { host.add(match[1]!, this.number(match[2]!, variables), this.number(match[3]!, variables)); continue; }
        match = /^destroy\("([^"\n]+)"\)$/.exec(line);
        if (match && host.remove) { host.remove(match[1]!); continue; }
        result.errors.push(`Line ${index + 1}: unsupported Z# statement.`);
      } catch (error) { result.errors.push(`Line ${index + 1}: ${this.message(error)}`); }
    }
    return result;
  }
  private number(source: string, variables: Map<string, number>): number { return new ExpressionParser(source.trim(), variables).parse(); }
  private value(source: string, variables: Map<string, number>): string {
    const text = /^"((?:[^"\\]|\\.)*)"$/.exec(source.trim());
    return text ? text[1]!.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\') : String(this.number(source, variables));
  }
  private message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
}
