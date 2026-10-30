// Photo Geometry: Crop the original working copy, flip, then rotate clockwise without resampling.
export function transformPixels(pixels, width, height, geometry) {
    const { x, y, cropWidth, cropHeight, rotation, flipHorizontal, flipVertical } = geometry;
    if (![x, y, cropWidth, cropHeight].every(Number.isFinite) || x < 0 || y < 0 ||
        cropWidth <= 0 || cropHeight <= 0 || x + cropWidth > 100 || y + cropHeight > 100 ||
        ![0, 90, 180, 270].includes(rotation) || pixels.length !== width * height * 4)
        throw new Error('Crop must fit inside the image: left + width and top + height cannot exceed 100%.');
    const left = Math.floor(width * x / 100), top = Math.floor(height * y / 100);
    const w = Math.ceil(width * (x + cropWidth) / 100) - left;
    const h = Math.ceil(height * (y + cropHeight) / 100) - top;
    const outputWidth = rotation % 180 ? h : w, outputHeight = rotation % 180 ? w : h;
    const output = new Uint8Array(outputWidth * outputHeight * 4);
    for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
        const fx = flipHorizontal ? w - 1 - cx : cx, fy = flipVertical ? h - 1 - cy : cy;
        const dx = rotation === 90 ? h - 1 - fy : rotation === 180 ? w - 1 - fx : rotation === 270 ? fy : fx;
        const dy = rotation === 90 ? fx : rotation === 180 ? h - 1 - fy : rotation === 270 ? w - 1 - fx : fy;
        const source = ((top + cy) * width + left + cx) * 4, target = (dy * outputWidth + dx) * 4;
        output.set(pixels.subarray(source, source + 4), target);
    }
    return { pixels: output, width: outputWidth, height: outputHeight };
}
