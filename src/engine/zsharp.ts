export interface ScriptResult { logs: string[]; errors: string[] }
export type ScriptHost = { find(name: string): { transform: { position: { x: number; y: number } } } | undefined };

/** Tiny, intentionally non-evaluating Z# subset. Never executes source as JavaScript. */
export class ZSharpRuntime {
  run(source: string, host: ScriptHost): ScriptResult {
    const result: ScriptResult = { logs: [], errors: [] };
    for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) continue;
      let match = /^print\("((?:[^"\\]|\\.)*)"\)$/.exec(line);
      if (match) { result.logs.push(match[1]!.replace(/\\"/g, '"').replace(/\\n/g, '\n')); continue; }
      match = /^move\("([^"\n]+)",\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)$/.exec(line);
      if (match) {
        const object = host.find(match[1]!);
        if (!object) result.errors.push(`Line ${index + 1}: object '${match[1]}' was not found.`);
        else { object.transform.position.x += Number(match[2]); object.transform.position.y += Number(match[3]); }
        continue;
      }
      match = /^set\("([^"\n]+)\.(x|y)",\s*(-?\d+(?:\.\d+)?)\)$/.exec(line);
      if (match) {
        const object = host.find(match[1]!);
        if (!object) result.errors.push(`Line ${index + 1}: object '${match[1]}' was not found.`);
        else object.transform.position[match[2] as 'x' | 'y'] = Number(match[3]);
        continue;
      }
      result.errors.push(`Line ${index + 1}: unsupported Z# statement.`);
    }
    return result;
  }
}
