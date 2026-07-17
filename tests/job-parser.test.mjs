import assert from "node:assert/strict";
import test from "node:test";

import { parseJobText } from "../app/job-parser.js";

const lawFirmJd = `【帮转】招聘单位：北京通商（成都）律师事务所
1、招聘职位：长期实习生1-2名，有留用机会
2、工作地点：成都
3、业务描述：境内外资本市场
4、招聘要求：
（1）知名院校2027年毕业；
（2）持有法律职业资格证书，有较好的法学理论功底；
（3）全职实习，可连续实习3个月以上的时间；
（4）团队协作能力强，有责任心，有志于从事律师行业，对证券法律业务有强烈兴趣；
（5）具有连续三个月以上大型律所实习或非诉实习经验者优先；
（6）男女不限；
（7）有较强的抗压能力，可以接受加班和项目出差；
（8）投递时请一并说明可以入职的时间和实习时长。
5、简历投递方式：luopeishan@tongshang.com`;

const freeformBytedanceJd = `字节跳动Tiktok Shop
推荐产品实习生（诊断Agent方向）
📍Base：北京 八月份可到岗

一、岗位背景
我们是国际化电商推荐产品团队，正在构建一套基于 AI 的商家经营决策系统，通过大模型与数据分析能力，帮助商家回答：为什么生意、流量没有增长？问题出在哪里？有哪些机会点？从“数据现象”生成“可执行策略”
二、岗位职责
1. 参与设计商家经营分析框架（流量 × 内容 × 商品 × 转化等模块），构建经营要素因子体系与归因逻辑
2. 参与大模型在经营场景中的落地应用（如自动生成经营建议、问题解释等）
3. 设计从数据 → 结构化解释 → 策略建议 的产品闭环
4. 参与产品需求设计、实验验证与效果评估
三、我们希望你具备
1. 本科及以上在读，计算机/统计/经济/数学等相关专业优先
2. 对 AI 应用落地有强烈兴趣
3. 有数据分析基础（SQL / Python / 统计思维）
4. 对平台增长、商家经营逻辑有兴趣
5. 逻辑清晰，具备结构化思考能力

四、加分项
- 有Prompt设计经验，参与过AI产品设计或Agent设计
- 有推荐系统、策略分析或增长项目经验
五、你会获得
- 优秀者有转正机会
- 参与真实 AI 落地项目
- 理解平台商家增长逻辑
- 在复杂业务场景中训练结构化拆解能力
- 与算法/数据/业务团队深度协作

简历命名：姓名＋学校＋毕业时间＋可实习时长
简历发送至：wangqingyu.whale@bytedance.com
抄送：zhangzekai.987@bytedance.com`;

test("extracts the supplied law-firm internship JD without demo-data leakage", () => {
  const result = parseJobText(lawFirmJd);

  assert.equal(result.company, "北京通商（成都）律师事务所");
  assert.equal(result.title, "长期实习生");
  assert.equal(result.location, "成都");
  assert.equal(result.employment, "实习");
  assert.equal(result.category, "法务");
  assert.equal(result.business, "境内外资本市场");
  assert.equal(result.email, "luopeishan@tongshang.com");
  assert.equal(result.graduationYear, "2027");
  assert.equal(result.duration, "可连续实习3个月以上");
  assert.match(result.summary, /境内外资本市场/u);
  assert.match(result.summary, /luopeishan@tongshang\.com/u);
  assert.doesNotMatch(JSON.stringify(result), /腾讯|产品运营|深圳/u);
});

test("leaves missing facts empty instead of inventing a company or location", () => {
  const result = parseJobText("招聘岗位：内容运营实习生\n负责公众号内容策划与数据复盘");

  assert.equal(result.company, "");
  assert.equal(result.title, "内容运营实习生");
  assert.equal(result.location, "");
  assert.equal(result.employment, "实习");
  assert.equal(result.category, "运营");
});

test("extracts company, title and Base location from a free-form header", () => {
  const result = parseJobText(freeformBytedanceJd);

  assert.equal(result.company, "字节跳动");
  assert.equal(result.title, "推荐产品实习生（诊断Agent方向）");
  assert.equal(result.location, "北京");
  assert.equal(result.employment, "实习");
  assert.equal(result.category, "产品");
  assert.equal(result.email, "wangqingyu.whale@bytedance.com");
  assert.equal(result.ccEmail, "zhangzekai.987@bytedance.com");
  assert.deepEqual(result.emails, [
    "wangqingyu.whale@bytedance.com",
    "zhangzekai.987@bytedance.com",
  ]);
  assert.equal(result.evidence.company, "字节跳动Tiktok Shop");
  assert.equal(result.evidence.title, "推荐产品实习生（诊断Agent方向）");
  assert.equal(result.evidence.location, "📍Base：北京 八月份可到岗");
  assert.match(result.summary, /字节跳动招聘推荐产品实习生/u);
  assert.match(result.summary, /工作地点为北京/u);
  assert.match(result.summary, /抄送邮箱：zhangzekai\.987@bytedance\.com/u);
});
