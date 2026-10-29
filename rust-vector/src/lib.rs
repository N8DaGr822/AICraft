use serde::Deserialize;
use serde_json::json;
use vectorcraft_geom::{Affine, Point, Rect, shapes, rotate_deg};
use wasm_bindgen::prelude::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Settings {
    shape: String,
    width: f64,
    height: f64,
    radius: f64,
    sides: u32,
    inner_ratio: f64,
    rotation: f64,
    fill: String,
    stroke: String,
    stroke_width: f64,
    filled: bool,
}

fn color(value: &str) -> bool {
    value.len() == 7 && value.starts_with('#') && value.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit)
}

fn build(settings: &str) -> Result<String, String> {
    if settings.len() > 4096 { return Err("Shape settings are too large.".into()); }
    let s: Settings = serde_json::from_str(settings).map_err(|_| "Invalid shape settings.".to_string())?;
    for (name, value, min, max) in [("Width",s.width,10.0,1000.0),("Height",s.height,10.0,1000.0),
        ("Corner radius",s.radius,0.0,500.0),("Inner radius ratio",s.inner_ratio,0.1,0.9),
        ("Rotation",s.rotation,-180.0,180.0),("Stroke width",s.stroke_width,0.0,40.0)] {
        if !value.is_finite() || !(min..=max).contains(&value) { return Err(format!("{name} must be between {min} and {max}.")); }
    }
    if !(3..=32).contains(&s.sides) { return Err("Use 3 to 32 sides or star points.".into()); }
    if !color(&s.fill) || !color(&s.stroke) { return Err("Colors must use six-digit hex values such as #3366cc.".into()); }
    if !s.filled && s.stroke_width == 0.0 { return Err("Enable a fill or use a stroke wider than zero.".into()); }
    let rect = Rect::new(0.0,0.0,s.width,s.height);
    let mut path = match s.shape.as_str() {
        "rectangle" => shapes::rectangle(rect),
        "rounded" => shapes::rounded_rectangle(rect,s.radius),
        "ellipse" => shapes::ellipse(rect),
        "polygon" => shapes::polygon(Point::ZERO,1.0,s.sides,0.0),
        "star" => shapes::star(Point::ZERO,1.0,s.inner_ratio,s.sides,0.0),
        _ => return Err("Choose rectangle, rounded rectangle, ellipse, polygon, or star.".into()),
    };
    // Shape Sizing: Normalize polygon/star bounds so width and height describe their actual unrotated bounds.
    if matches!(s.shape.as_str(), "polygon" | "star") {
        let b = path.bounds().ok_or("The shape has no bounds.")?;
        path.transform(Affine::scale_non_uniform(s.width/b.width(),s.height/b.height()) * Affine::translate((-b.x0,-b.y0)));
    }
    path.transform(Affine::translate((s.width/2.0,s.height/2.0)) * rotate_deg(s.rotation)
        * Affine::translate((-s.width/2.0,-s.height/2.0)));
    let b = path.bounds().ok_or("The shape has no bounds.")?;
    // SVG Export: Round joins and half-stroke padding keep rotated tips inside the viewBox.
    let padding = s.stroke_width/2.0 + 2.0;
    path.transform(Affine::translate((padding-b.x0,padding-b.y0)));
    let width = (b.width()+2.0*padding).ceil();
    let height = (b.height()+2.0*padding).ceil();
    let data = path.to_bezpath().to_svg();
    let fill = if s.filled { s.fill.as_str() } else { "none" };
    // SVG Content: Only generated path data, fixed labels, validated colors, and finite numbers enter markup.
    let svg = format!(r#"<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <title>AICraft {} shape</title>
  <path d="{data}" fill="{fill}" stroke="{}" stroke-width="{}" stroke-linejoin="round" />
</svg>"#,s.shape,s.stroke,s.stroke_width);
    Ok(json!({"svg":svg,"width":width,"height":height,"anchorCount":path.anchor_count(),"perimeter":path.length()}).to_string())
}

#[wasm_bindgen]
pub fn generate(settings: &str) -> Result<String, JsValue> {
    build(settings).map_err(|e| JsValue::from_str(&e))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn settings() -> serde_json::Value {
        json!({"shape":"rectangle","width":200,"height":100,"radius":20,"sides":5,"innerRatio":0.45,
            "rotation":0,"fill":"#3366cc","stroke":"#112233","strokeWidth":4,"filled":true})
    }
    #[test]
    fn rectangle_rotation_and_stroke_bounds() {
        let mut s = settings();
        let first: serde_json::Value = serde_json::from_str(&build(&s.to_string()).unwrap()).unwrap();
        assert_eq!(first["width"],208.0);
        assert_eq!(first["height"],108.0);
        assert_eq!(first["anchorCount"],4);
        assert!((first["perimeter"].as_f64().unwrap()-600.0).abs()<0.001);
        s["rotation"] = json!(90);
        let rotated: serde_json::Value = serde_json::from_str(&build(&s.to_string()).unwrap()).unwrap();
        assert_eq!(rotated["width"],108.0);
        assert_eq!(rotated["height"],208.0);
    }
    #[test]
    fn shape_families_and_validation() {
        let mut s = settings();
        for (shape,anchors) in [("ellipse",4),("rounded",8),("polygon",5),("star",10)] {
            s["shape"] = json!(shape);
            let result: serde_json::Value = serde_json::from_str(&build(&s.to_string()).unwrap()).unwrap();
            assert_eq!(result["anchorCount"],anchors);
            assert!(result["svg"].as_str().unwrap().contains("<path"));
        }
        for (key,value) in [("fill",json!("\" onload=\"alert(1)")),("sides",json!(100000)),("width",json!(0)),("rotation",json!(181))] {
            let mut bad = settings(); bad[key] = value;
            assert!(build(&bad.to_string()).is_err());
        }
        s["filled"] = json!(false); s["strokeWidth"] = json!(0);
        assert!(build(&s.to_string()).is_err());
    }
}
