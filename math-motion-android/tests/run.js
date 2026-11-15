const assert=require('node:assert/strict');
const {parse,makeSteps,visualType}=require('../../math-motion/app.js');
for(const [expr,expect] of [['9+9',18],['24÷6',4],['6×4',24],['(12+8)×2',40],['9-14',-5],['1÷3',0.333333333333],['2^3',8],['2+3×4',14],['(2+3)×4',20],['−2+9',7],['0.2+0.1',0.3]]){
 const p=parse(expr);assert.equal(p.result,expect,expr);assert.ok(makeSteps(p).length>=4);
 console.log('PASS',expr,'=',p.result);
}
for(const expr of ['1/0','2+','(','foo','9//3'])assert.throws(()=>parse(expr));
assert.equal(visualType(makeSteps(parse('9+9'))[0]),'add');
assert.equal(visualType(makeSteps(parse('24÷6'))[0]),'divide');
console.log('All MathMotion checks passed');