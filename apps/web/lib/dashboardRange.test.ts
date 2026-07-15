import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDashboardRange } from "./dashboardRange.ts";
import { projectIdentityKey } from "./projectIdentity.ts";
import { extractSummaryTimelineEntries } from "./summaryTimeline.ts";

test("normalizeDashboardRange defaults to the latest 30-day window ending today", () => {
  assert.deepEqual(normalizeDashboardRange({}, "2026-07-15"), {
    startDate: "2026-06-16",
    endDate: "2026-07-15"
  });
});

test("normalizeDashboardRange limits a requested range to 31 inclusive days", () => {
  assert.deepEqual(
    normalizeDashboardRange({ start: "2026-05-01", end: "2026-07-14" }, "2026-07-15"),
    { startDate: "2026-06-14", endDate: "2026-07-14" }
  );
});

test("normalizeDashboardRange always uses today when no range is selected", () => {
  assert.deepEqual(normalizeDashboardRange({ date: "2026-07-13" }, "2026-07-15"), {
    startDate: "2026-06-16",
    endDate: "2026-07-15"
  });
});

test("extractSummaryTimelineEntries creates project timeline items from imported daily memory", () => {
  const markdown = `项目记忆总览
当天完成两个项目的关键更新。

项目：每日复盘
功能变化：周复盘固定为四张卡片，过滤多余标题和前言。
问题处理：解决第五张卡片问题。
当前状态：修复已上线。

项目：视频生成
功能变化：识别阶段正确显示处理中。
当前状态：待本地回归。`;

  assert.deepEqual(extractSummaryTimelineEntries(markdown, "2026-07-14"), [
    {
      date: "2026-07-14",
      projectName: "每日复盘",
      text: "周复盘固定为四张卡片，过滤多余标题和前言。"
    },
    {
      date: "2026-07-14",
      projectName: "视频生成",
      text: "识别阶段正确显示处理中。"
    }
  ]);
});

test("daily-memory project names merge into their existing dashboard projects", () => {
  assert.equal(projectIdentityKey("每日复盘"), projectIdentityKey("Review"));
  assert.equal(projectIdentityKey("视频生成"), projectIdentityKey("VideoGen"));
});
