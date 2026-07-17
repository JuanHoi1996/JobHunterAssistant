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
  assert.equal(result.category, "产品 / 运营");
});
