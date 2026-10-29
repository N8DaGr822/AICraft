import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import init, { generate } from '../AITest/wwwroot/wasm-vector/aicraft_vector.js';
await init({ module_or_path: await readFile(new URL('../AITest/wwwroot/wasm-vector/aicraft_vector_bg.wasm', import.meta.url)) });
const settings = {shape:'rectangle',width:200,height:100,radius:20,sides:5,innerRatio:0.45,rotation:0,fill:'#3366cc',stroke:'#112233',strokeWidth:4,filled:true};
const run = changes => JSON.parse(generate(JSON.stringify({...settings,...changes})));
assert.deepEqual([run().width,run().height,run().perimeter],[208,108,600]);
assert.deepEqual([run({rotation:90}).width,run({rotation:90}).height],[108,208]);
for (const [shape,count] of [['rectangle',4],['rounded',8],['ellipse',4],['polygon',5],['star',10]]) {
    const result = run({shape});
    assert.equal(result.anchorCount,count);
    assert.ok(result.perimeter > 0);
    assert.match(result.svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.match(result.svg, /<path d="[MLC]/);
}
assert.match(run({filled:false}).svg,/fill="none"/);
for (const bad of [{shape:'<script>'},{fill:'" onload="alert(1)'},{width:0},{height:1001},{sides:33},{rotation:181},{innerRatio:0},{strokeWidth:-1},{filled:false,strokeWidth:0}])
    assert.throws(() => run(bad));
assert.throws(() => generate('not json'));
assert.throws(() => generate(' '.repeat(4097)));
console.log('Vector WASM: shapes, dimensions, rotation, stroke bounds, and invalid settings passed.');
