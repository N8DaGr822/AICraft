// Scene Bounds: Include every generated shape's padded bounds, including negative positions.
export function composeScene(layers) {
    if (!layers.length || layers.length > 50) throw new Error('Use between 1 and 50 shapes.');
    for (const layer of layers) {
        if (![layer.x, layer.y].every(v => Number.isFinite(v) && Math.abs(v) <= 1000))
            throw new Error('Shape positions must be between -1000 and 1000.');
    }
    const left = Math.min(...layers.map(l => l.x)), top = Math.min(...layers.map(l => l.y));
    const width = Math.ceil(Math.max(...layers.map(l => l.x + l.result.width)) - left);
    const height = Math.ceil(Math.max(...layers.map(l => l.y + l.result.height)) - top);
    // Only our Rust-generated SVG enters this composition; user SVG markup is never accepted.
    const contents = layers.map(l => l.result.svg.replace('<svg ', `<svg x="${l.x - left}" y="${l.y - top}" `)).join('\n');
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>AICraft artwork</title>${contents}</svg>`,
        width, height, anchorCount: layers.reduce((sum,l) => sum + l.result.anchorCount,0),
        perimeter: layers.reduce((sum,l) => sum + l.result.perimeter,0) };
}
