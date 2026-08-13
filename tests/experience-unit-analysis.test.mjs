import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureHighlightKeepSuggestions,
  splitExperienceBlocks,
  validateExperienceUnitAnalysis,
} from "../app/spike/experience-unit-analysis.js";

const resume = `姓名
许博桓

实习与项目经历：

广东粤电电力销售有限公司\u00a0|\u00a0资源调度部 | 量化开发实习生 广州 | 2025年12月 – 2026年2月

江苏电力期现套利量化系统：独立开发期现套利策略。

中金财富证券有限公司 | 固定收益部 | 实习生 北京 | 2024年11月 – 2025年1月

REITs现金流建模：独立构建临港创新、东久新经济等多个REITs项目的现金流预测模型。

杠杆策略研究：深入研究银行间市场与交易所市场的债券回购融资（Repo）机制。

金域医学集团总部 | 品牌管理与社会责任部 | 实习生 广州 | 2024年7月

企业品牌传播：参与宣传。

专业技能与技术栈

精通 Python。`;

const jd = `【固定收益方向-投资交易】
具备良好的市场分析能力，以及债券和衍生品定价能力，熟悉金融市场。
具备良好的数据处理和编程能力，具备策略研发能力优先。`;

test("keeps unchanged experience blocks and validates omit separately", () => {
  const cicc = `中金财富证券有限公司 | 固定收益部 | 实习生 北京 | 2024年11月 – 2025年1月

REITs现金流建模：独立构建临港创新、东久新经济等多个REITs项目的现金流预测模型。

杠杆策略研究：深入研究银行间市场与交易所市场的债券回购融资（Repo）机制。`;
  const brand = `金域医学集团总部 | 品牌管理与社会责任部 | 实习生 广州 | 2024年7月

企业品牌传播：参与宣传。`;

  const result = validateExperienceUnitAnalysis(resume, jd, {
    summary: "保留固收，拿下品牌。",
    matches: [],
    gaps: [],
    questions: [],
    suggestions: [{
      title: "中金固收",
      rewriteType: "原文保留",
      placement: "前置",
      jdFit: "核心",
      original: cicc,
      sourceEvidence: [cicc],
      revised: cicc,
      jdEvidence: "固定收益方向-投资交易",
      reason: "最贴 JD",
      qualityCheck: "ok",
    }, {
      title: "应被丢掉的拿下卡",
      rewriteType: "取舍压缩",
      placement: "建议拿下",
      jdFit: "加分",
      original: brand,
      sourceEvidence: [brand],
      revised: "短",
      jdEvidence: "固定收益方向-投资交易",
      reason: "legacy",
      qualityCheck: "ok",
    }],
    omit: [{
      title: "金域品牌",
      original: brand,
      reason: "与交易岗无关",
    }],
  }, { jdPriorities: [], highlights: [], gaps: [] });

  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].title, "中金固收");
  assert.equal(result.suggestions[0].rewriteType, "原文保留");
  assert.equal(result.omit.length, 1);
  assert.equal(result.omit[0].title, "金域品牌");
});

test("injects missing highlight experience blocks into suggestions", () => {
  const blocks = splitExperienceBlocks(resume);
  assert.ok(blocks.some((block) => block.includes("中金财富")));

  const injected = ensureHighlightKeepSuggestions(
    resume,
    jd,
    [],
    [],
    {
      jdPriorities: [{
        title: "固收",
        priority: "核心",
        jdEvidence: "固定收益方向-投资交易",
        interpretation: "主责",
      }],
      highlights: [{
        title: "固定收益领域实习经验",
        sourceEvidence: [
          "独立构建临港创新、东久新经济等多个REITs项目的现金流预测模型",
        ],
        value: "中金财富固定收益部",
        transferableSkills: ["现金流建模"],
      }],
      gaps: [],
    },
  );

  assert.equal(injected.length, 1);
  assert.match(injected[0].original, /中金财富/u);
  assert.equal(injected[0].rewriteType, "原文保留");
  assert.equal(injected[0].placement, "前置");
});

test("validateExperienceUnitAnalysis auto-keeps highlight blocks the model forgot", () => {
  const result = validateExperienceUnitAnalysis(resume, jd, {
    summary: "口头说保留中金，但 suggestions 里没有。",
    matches: [],
    gaps: [],
    questions: [],
    suggestions: [],
    omit: [{ title: "金域医学", reason: "无关" }],
  }, {
    jdPriorities: [{
      title: "固收",
      priority: "核心",
      jdEvidence: "固定收益方向-投资交易",
      interpretation: "主责",
    }],
    highlights: [{
      title: "固定收益领域实习经验",
      sourceEvidence: [
        "独立构建临港创新、东久新经济等多个REITs项目的现金流预测模型",
      ],
      value: "中金",
      transferableSkills: [],
    }],
    gaps: [],
  });

  assert.ok(result.suggestions.some((item) => item.original.includes("中金财富")));
});

test("accepts experience original despite NBSP differences", () => {
  const withNbsp = `广东粤电电力销售有限公司\u00a0|\u00a0资源调度部 | 量化开发实习生 广州 | 2025年12月 – 2026年2月

江苏电力期现套利量化系统：独立开发期现套利策略。`;
  const withSpaces = withNbsp.replace(/\u00a0/gu, " ");

  const result = validateExperienceUnitAnalysis(resume, jd, {
    summary: "保留粤电",
    matches: [],
    gaps: [],
    questions: [],
    suggestions: [{
      title: "粤电",
      rewriteType: "原文保留",
      placement: "前置",
      jdFit: "核心",
      original: withSpaces,
      sourceEvidence: [withSpaces],
      revised: withSpaces,
      jdEvidence: "具备策略研发能力优先",
      reason: "量化",
      qualityCheck: "ok",
    }],
    omit: [],
  }, { jdPriorities: [], highlights: [], gaps: [] });

  assert.equal(result.suggestions.length, 1);
  assert.match(result.suggestions[0].original, /粤电/u);
});
