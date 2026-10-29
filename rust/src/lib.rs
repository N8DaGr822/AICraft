use photocraft_color::convert::{hsb_to_rgb, linear_to_srgb, rgb_to_gray, rgb_to_hsb, srgb_to_linear};
use wasm_bindgen::prelude::*;

/// Photo Editing: Always process the original straight-alpha sRGB pixels to avoid cumulative loss.
#[wasm_bindgen]
pub fn adjust(pixels: &[u8], exposure: f32, saturation: f32, hue: f32, grayscale: bool) -> Result<Vec<u8>, JsValue> {
    if pixels.is_empty() || pixels.len() % 4 != 0 || pixels.len() > 16_000_000 {
        return Err(JsValue::from_str("Expected RGBA pixels for an image of at most 4 megapixels."));
    }
    if !exposure.is_finite() || !saturation.is_finite() || !hue.is_finite()
        || !(-3.0..=3.0).contains(&exposure) || !(0.0..=2.0).contains(&saturation)
        || !(-180.0..=180.0).contains(&hue) {
        return Err(JsValue::from_str("Invalid photo adjustment values."));
    }
    let mut output = pixels.to_vec();
    if exposure == 0.0 && saturation == 1.0 && hue == 0.0 && !grayscale {
        return Ok(output);
    }
    let gain = 2.0_f32.powf(exposure);
    for pixel in output.chunks_exact_mut(4) {
        let mut rgb = [pixel[0], pixel[1], pixel[2]].map(|v| v as f32 / 255.0);
        if exposure != 0.0 {
            rgb = rgb.map(|v| linear_to_srgb(srgb_to_linear(v) * gain).clamp(0.0, 1.0));
        }
        if saturation != 1.0 || hue != 0.0 {
            let [h, s, v] = rgb_to_hsb(rgb);
            rgb = hsb_to_rgb([h + hue, (s * saturation).clamp(0.0, 1.0), v]);
        }
        if grayscale { rgb = [rgb_to_gray(rgb); 3]; }
        for (channel, value) in pixel[..3].iter_mut().zip(rgb) {
            *channel = (value.clamp(0.0, 1.0) * 255.0 + 0.5) as u8;
        }
    }
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn neutral_preserves_every_byte() {
        let pixels = [0, 127, 255, 0, 61, 199, 2, 128];
        assert_eq!(adjust(&pixels, 0.0, 1.0, 0.0, false).unwrap(), pixels);
    }

    #[test]
    fn grayscale_uses_photocraft_luma_and_preserves_alpha() {
        assert_eq!(adjust(&[255, 0, 0, 37], 0.0, 1.0, 0.0, true).unwrap(), [76, 76, 76, 37]);
    }

    #[test]
    fn hue_rotates_red_to_green() {
        assert_eq!(adjust(&[255, 0, 0, 255], 0.0, 1.0, 120.0, false).unwrap(), [0, 255, 0, 255]);
    }

    #[test]
    fn exposure_uses_linear_light() {
        let result = adjust(&[128, 128, 128, 19], 1.0, 1.0, 0.0, false).unwrap();
        assert_eq!(result, [176, 176, 176, 19]);
    }
}
