use std::{collections::HashSet, sync::Arc};
use pdfcraft_cos::{Document, SaveOptions, write_full};
use pdfcraft_organize::{extract_pages, info, page_boxes, page_count, page_rotation, pages, rotate_pages};
use serde_json::json;
use wasm_bindgen::prelude::*;

const MAX_BYTES: usize = 15 * 1024 * 1024;
const MAX_PAGES: usize = 200;

#[wasm_bindgen]
pub struct PdfSession {
    original: Document,
    count: usize,
}

fn open_document(bytes: Vec<u8>) -> Result<PdfSession, String> {
    if bytes.is_empty() || bytes.len() > MAX_BYTES {
        return Err("Choose a PDF between 1 byte and 15 MB.".into());
    }
    let original = Document::open(Arc::new(bytes)).map_err(|e| e.to_string())?;
    if original.security().is_some() {
        return Err("Encrypted PDFs are not supported in this lab. Use an unencrypted copy.".into());
    }
    if original.object_numbers().len() > 20_000 {
        return Err("This PDF is too complex for the browser lab (over 20,000 objects).".into());
    }
    // PDF Integrity: A rewritten copy cannot preserve signatures. Refuse signature fields.
    for (_, object) in original.scan_objects_checked() {
        let object = object.map_err(|e| e.to_string())?;
        if object.as_dict().is_some_and(|d| d.name(b"FT") == Some(b"Sig") || d.name(b"Type") == Some(b"Sig") || d.contains(b"ByteRange")) {
            return Err("PDFs with signatures or signature fields are not supported in this lab.".into());
        }
    }
    let count = page_count(&original).map_err(|e| e.to_string())?;
    if !(1..=MAX_PAGES).contains(&count) {
        return Err("Choose a PDF with 1 to 200 pages.".into());
    }
    Ok(PdfSession { original, count })
}

// Page Selection: Preserve explicit order; reject repeats rather than silently dropping them.
fn selection(text: &str, count: usize) -> Result<Vec<usize>, String> {
    if text.trim().is_empty() || text.len() > 2000 {
        return Err("Enter pages such as 1-3, 5. Use at most 2000 characters.".into());
    }
    let mut result = Vec::new();
    let mut seen = HashSet::new();
    for part in text.split(',') {
        let numbers = part.trim().split('-').map(|v| v.trim().parse::<usize>()).collect::<Result<Vec<_>, _>>()
            .map_err(|_| "Use page numbers and ascending ranges, such as 1-3, 5.".to_string())?;
        let (first, last) = match numbers.as_slice() {
            [one] => (*one, *one),
            [first, last] => (*first, *last),
            _ => return Err("Use page numbers and ascending ranges, such as 1-3, 5.".into()),
        };
        if first == 0 || first > last || last > count {
            return Err(format!("Pages must be between 1 and {count}; ranges must run forward."));
        }
        for page in first..=last {
            if !seen.insert(page) { return Err(format!("Page {page} is selected more than once.")); }
            result.push(page - 1);
        }
    }
    Ok(result)
}

impl PdfSession {
    fn merged_bytes(&self, bytes: Vec<u8>) -> Result<Vec<u8>, String> {
        let incoming = open_document(bytes)?;
        if self.count + incoming.count > MAX_PAGES {
            return Err("The combined document must have at most 200 pages.".into());
        }
        let merged = pdfcraft_organize::combine(&[("Current document", &self.original), ("Appended document", &incoming.original)])
            .map_err(|e| e.to_string())?;
        let output = write_full(&merged, &SaveOptions { object_streams: false, ..Default::default() }).map_err(|e| e.to_string())?;
        // Merge Budget: Keep the combined working document within the normal input limits.
        let checked = open_document(output.clone())?;
        checked.inspect_json()?;
        Ok(output)
    }
    fn inspect_json(&self) -> Result<String, String> {
        let boxes = page_boxes(&self.original).map_err(|e| e.to_string())?;
        let refs = pages(&self.original).map_err(|e| e.to_string())?;
        let mut details = Vec::with_capacity(self.count);
        for (index, page) in refs.iter().enumerate() {
            let object = self.original.get(page.obj);
            let unit = object.as_dict().and_then(|d| d.get(b"UserUnit")).map(|v| self.original.resolve(v))
                .and_then(|v| v.as_f64()).unwrap_or(1.0);
            let [x1, y1, x2, y2] = boxes[index][1];
            let width = (x2 - x1) * unit;
            let height = (y2 - y1) * unit;
            if !width.is_finite() || !height.is_finite() || unit <= 0.0 || width <= 0.0 || height <= 0.0 {
                return Err(format!("Page {} has invalid dimensions.", index + 1));
            }
            details.push(json!({"number": index + 1, "width": width, "height": height,
                "rotation": page_rotation(&self.original, index).map_err(|e| e.to_string())?}));
        }
        Ok(json!({"count": self.count, "version": self.original.version(), "title": info(&self.original, "Title"),
            "repaired": !self.original.repair_log().is_empty(), "pages": details}).to_string())
    }

    fn export_document(&self, text: &str, rotation: i32) -> Result<Vec<u8>, String> {
        if ![0, 90, 180, 270].contains(&rotation) { return Err("Choose a rotation of 0, 90, 180, or 270 degrees.".into()); }
        let chosen = selection(text, self.count)?;
        // Document Ownership: Export from the immutable original; failed exports never change it.
        let mut result = extract_pages(&self.original, &chosen).map_err(|e| e.to_string())?;
        if rotation != 0 {
            rotate_pages(&mut result, &(0..chosen.len()).collect::<Vec<_>>(), rotation as i64).map_err(|e| e.to_string())?;
        }
        let bytes = write_full(&result, &SaveOptions { object_streams: false, ..Default::default() }).map_err(|e| e.to_string())?;
        if bytes.len() > 30 * 1024 * 1024 { return Err("The exported PDF exceeds this lab's 30 MB output limit.".into()); }
        Ok(bytes)
    }
}

#[wasm_bindgen]
impl PdfSession {
    #[wasm_bindgen(constructor)]
    pub fn new(bytes: Vec<u8>) -> Result<PdfSession, JsValue> {
        open_document(bytes).map_err(|e| JsValue::from_str(&e))
    }
    pub fn inspect(&self) -> Result<String, JsValue> {
        self.inspect_json().map_err(|e| JsValue::from_str(&e))
    }
    pub fn export(&self, text: &str, rotation: i32) -> Result<Vec<u8>, JsValue> {
        self.export_document(text, rotation).map_err(|e| JsValue::from_str(&e))
    }
    pub fn merge(&self, bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        self.merged_bytes(bytes).map_err(|e| JsValue::from_str(&e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const SAMPLE: &[u8] = include_bytes!("../../AITest/wwwroot/sample-data/pdf-lab-sample.pdf");

    #[test]
    fn merge_appends_pages_without_mutating_source() {
        let source = open_document(SAMPLE.to_vec()).unwrap();
        let merged = open_document(source.merged_bytes(SAMPLE.to_vec()).unwrap()).unwrap();
        assert_eq!(merged.count, 6);
        assert_eq!(source.count, 3);
        assert_eq!(page_boxes(&merged.original).unwrap()[3], page_boxes(&source.original).unwrap()[0]);
        assert!(source.merged_bytes(b"invalid".to_vec()).is_err());
        assert_eq!(source.count, 3);
    }
    #[test]
    fn ranges_preserve_order_and_reject_invalid_input() {
        assert_eq!(selection("3, 1-2", 3).unwrap(), [2, 0, 1]);
        for value in ["", "0", "4", "3-1", "1,1", "1-2,2", "1,", "one", "1-2-3"] {
            assert!(selection(value, 3).is_err(), "{value}");
        }
    }
    #[test]
    fn extract_reorders_rotates_and_preserves_original() {
        let source = open_document(SAMPLE.to_vec()).unwrap();
        assert_eq!(source.count, 3);
        let output = source.export_document("3,1", 90).unwrap();
        let result = open_document(output).unwrap();
        assert_eq!(result.count, 2);
        assert_eq!(page_rotation(&result.original, 0).unwrap(), 90);
        assert_eq!(page_boxes(&result.original).unwrap()[0][0], [0.0, 0.0, 500.0, 500.0]);
        assert_eq!(page_boxes(&result.original).unwrap()[1][0], [0.0, 0.0, 612.0, 792.0]);
        assert_eq!(page_rotation(&source.original, 0).unwrap(), 0);
        assert_eq!(source.count, 3);
        assert!(source.export_document("1", 45).is_err());
        assert!(open_document(b"not a pdf".to_vec()).is_err());
    }
    #[test]
    fn refuses_signature_fields_before_export() {
        use pdfcraft_cos::{Dict, Object};
        let mut source = open_document(SAMPLE.to_vec()).unwrap();
        let mut field = Dict::new();
        field.set(b"FT".to_vec(), Object::name("Sig"));
        let field = source.original.add(field);
        let mut form = Dict::new();
        form.set(b"Fields".to_vec(), Object::Array(vec![Object::Ref(field)]));
        let root = source.original.root().unwrap();
        source.original.update_dict(root, |d| d.set(b"AcroForm".to_vec(), Object::Dict(form))).unwrap();
        let bytes = write_full(&source.original, &SaveOptions::default()).unwrap();
        assert!(matches!(open_document(bytes), Err(message) if message.contains("signature")));
    }
}

