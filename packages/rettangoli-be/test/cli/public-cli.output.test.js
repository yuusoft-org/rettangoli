import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const cliPath = path.resolve(process.cwd(), '../rettangoli-cli/cli.js');

describe('public rtgl be cli surface', () => {
  it('exposes backend scaffold, db, resume, and build plan options', () => {
    const source = readFileSync(cliPath, 'utf8');

    expect(source).toContain('scaffold: scaffoldBe');
    expect(source).toContain('db: dbBe');
    expect(source).toContain('resume: resumeBe');
    expect(source).toContain('.command("scaffold [methodId]")');
    expect(source).toContain('beCommand.command("db")');
    expect(source).toContain('.command("resume <taskId>")');
    expect(source).toContain('.option("--dry-run"');
    expect(source).toContain('.option("--check"');
    expect(source).toContain('.option("--migrations-dir <path>"');
    expect(source).toContain('.option("--fail-on-warnings"');
  });
});
