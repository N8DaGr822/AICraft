"""Generate a deterministic, non-personal PDF fixture for the lab and integration tests."""
from pathlib import Path
objects = []
def add(data):
    objects.append(data.encode('ascii'))
    return len(objects)
add('<< /Type /Catalog /Pages 2 0 R >>')
add('<< /Type /Pages /Count 3 /Kids [4 0 R 6 0 R 8 0 R] >>')
add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
for number, (width, height, color) in enumerate([(612,792,'0.12 0.35 0.65'), (792,612,'0.12 0.55 0.35'), (500,500,'0.65 0.25 0.15')], 1):
    stream_number = len(objects) + 2
    add(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] /Resources << /Font << /F1 3 0 R >> >> /Contents {stream_number} 0 R >>')
    text = f'q {color} rg 36 36 {width-72} {height-72} re f Q\nBT /F1 28 Tf 1 1 1 rg 60 {height-100} Td (AICraft - Page {number}) Tj 0 -48 Td /F1 14 Tf (Synthetic PDF test document) Tj ET\n'
    add(f'<< /Length {len(text)} >>\nstream\n{text}endstream')
add('<< /Title (AICraft sample PDF) /Author (AICraft) >>')
output = bytearray(b'%PDF-1.4\n')
offsets = [0]
for number, obj in enumerate(objects,1):
    offsets.append(len(output))
    output.extend(f'{number} 0 obj\n'.encode()+obj+b'\nendobj\n')
xref = len(output)
output.extend(f'xref\n0 {len(objects)+1}\n0000000000 65535 f \n'.encode())
for offset in offsets[1:]:
    output.extend(f'{offset:010} 00000 n \n'.encode())
output.extend(f'trailer\n<< /Size {len(objects)+1} /Root 1 0 R /Info 10 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
Path('AITest/wwwroot/sample-data/pdf-lab-sample.pdf').write_bytes(output)
