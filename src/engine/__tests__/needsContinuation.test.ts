import { describe, it, expect } from "vitest";
import { needsContinuation } from "../needsContinuation";

describe("needsContinuation", () => {
  it("returns true for trailing pipe", () => {
    expect(needsContinuation("Get-ChildItem |")).toBe(true);
  });

  it("returns true for trailing backtick", () => {
    expect(needsContinuation("Get-ChildItem `")).toBe(true);
  });

  it("returns true for unclosed brace", () => {
    expect(needsContinuation("@{")).toBe(true);
    expect(needsContinuation("if ($true) {")).toBe(true);
  });

  it("returns true for unclosed double quote", () => {
    expect(needsContinuation('"hello')).toBe(true);
  });

  it("returns true for unclosed single quote", () => {
    expect(needsContinuation("'hello")).toBe(true);
  });

  it("returns false for complete command", () => {
    expect(needsContinuation("Get-ChildItem")).toBe(false);
    expect(needsContinuation("Get-Item -Path /")).toBe(false);
  });

  it("returns false for balanced braces", () => {
    expect(needsContinuation("@{ Name = 'test' }")).toBe(false);
    expect(needsContinuation("if ($true) { 1 }")).toBe(false);
  });

  it("returns false when quotes are inside opposite quotes", () => {
    expect(needsContinuation("\"it's fine\"")).toBe(false);
    expect(needsContinuation("'he said \"hi\"'")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(needsContinuation("")).toBe(false);
    expect(needsContinuation("   ")).toBe(false);
  });

  it("handles multi-line accumulated buffer with trailing pipe", () => {
    expect(needsContinuation("Get-ChildItem |\nFormat-Table |")).toBe(true);
  });

  it("handles multi-line buffer that is complete", () => {
    expect(needsContinuation("Get-ChildItem |\nFormat-Table")).toBe(false);
  });

  it("returns true for trailing comma (array continuation)", () => {
    expect(needsContinuation('@{Filter = "Equals"; Field = "_templatename"; Value = "Contributor"},')).toBe(true);
    expect(needsContinuation("1, 2,")).toBe(true);
  });

  it("handles multi-line buffer with unclosed brace across lines", () => {
    expect(needsContinuation("@{\nName = 'test'")).toBe(true);
    expect(needsContinuation("@{\nName = 'test'\n}")).toBe(false);
  });
});
