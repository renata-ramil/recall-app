#joins the design PNG and the app screenshot side by side with a difference strip on the right
import sys
from PIL import Image, ImageChops
a = Image.open(sys.argv[1]).convert("RGB")
b = Image.open(sys.argv[2]).convert("RGB").resize(a.size)
diff = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 40 else 0)
gap = 16
out = Image.new("RGB", (a.width * 3 + gap * 2, a.height), (255, 255, 255))
out.paste(a, (0, 0)); out.paste(b, (a.width + gap, 0)); out.paste(diff.convert("RGB"), (a.width * 2 + gap * 2, 0))
out.save(sys.argv[3])
bbox = diff.getbbox()
print("diff pixels", sum(1 for p in diff.get_flattened_data() if p), "bbox", bbox)
