import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const cliPath = path.resolve(process.cwd(), '../rettangoli-cli/cli.js');
const packageJsonPath = path.resolve(process.cwd(), 'package.json');

describe('public rtgl be cli surface', () => {
  it('exposes backend init, app, compat, scaffold, db, resume, and build plan options', () => {
    const source = readFileSync(cliPath, 'utf8');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    expect(source).toContain('app: appBe');
    expect(source).toContain('compat: compatBe');
    expect(source).toContain('init: initBe');
    expect(source).toContain('scaffold: scaffoldBe');
    expect(source).toContain('db: dbBe');
    expect(source).toContain('resume: resumeBe');
    expect(source).toContain('.command("init")');
    expect(source).toContain('beCommand.command("app")');
    expect(source).toContain('.command("compat")');
    expect(source).toContain('.command("scaffold [methodId]")');
    expect(source).toContain('beCommand.command("db")');
    expect(source).toContain('.command("resume <taskId>")');
    expect(source).toContain('.option("--dry-run"');
    expect(source).toContain('.option("--check"');
    expect(source).toContain('.option("--migrations-dir <path>"');
    expect(source).toContain('.option("--fail-on-warnings"');
    expect(source).toContain('function requireBeConfig(command, options)');
    expect(source).toContain('artifactSchemaVersion: "rettangoli.cliError/v1"');
    expect(source).toContain('command: "be compat"');
    expect(source).toContain('ruleId: "RTGL-BE-CLI-002"');
    expect(source).toContain('ruleId: "RTGL-BE-CLI-003"');
    expect(source).toContain('ruleId: "RTGL-BE-CLI-004"');
    expect(source).toContain('loadBeProjectConfig: loadBeRuntimeConfig');
    expect(source).toContain('globalMiddleware: runtimeConfig.globalMiddleware');
    expect(source).toContain('const config = requireBeConfig("be app check", options);');
    expect(source).toContain('options.globalMiddlewareBefore = bePaths.globalMiddleware.before;');
    expect(source).toContain('options.globalMiddlewareAfter = bePaths.globalMiddleware.after;');
    expect(source).not.toContain('.requiredOption("--from <path>"');
    expect(packageJson.exports).toHaveProperty(
      './runtime/loadBeProjectConfig',
      './src/runtime/loadBeProjectConfig.js',
    );
  });
});
