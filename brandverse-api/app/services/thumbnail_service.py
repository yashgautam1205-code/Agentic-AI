import uuid
from pathlib import Path
from typing import Tuple, Dict, Any
from PIL import Image, ImageDraw, ImageFont

from app.config import settings
from app.services.file_storage import resolve_storage_path


class ThumbnailService:
    def __init__(self):
        self.output_dir = resolve_storage_path("thumbnails")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_thumbnail(
        self,
        headline: str,
        badge: str = "MUST WATCH",
        template_style: str = "bold_blue",
        aspect_ratio: str = "16:9",
        creator_name: str = "Aryan Sharma",
        include_creator_badge: bool = True
    ) -> Dict[str, Any]:
        """
        Renders a high-resolution 16:9 (1280x720) or 9:16 (1080x1920) thumbnail image
        using Pillow, and saves it as a real downloadable PNG file.
        """
        # Determine canvas size
        if aspect_ratio == "9:16":
            width, height = 1080, 1920
        else:
            width, height = 1280, 720

        # Create gradient background
        colors = self._get_gradient_colors(template_style)
        img = self._create_gradient_image(width, height, colors[0], colors[1])
        draw = ImageDraw.Draw(img)

        # Load fonts or fallback
        font_headline = self._get_font(int(height * 0.08))
        font_badge = self._get_font(int(height * 0.035), bold=True)
        font_sub = self._get_font(int(height * 0.025))

        padding_x = int(width * 0.08)
        padding_y = int(height * 0.12)

        # 1. Draw Eyecatcher Badge
        if badge:
            badge_text = badge.upper()
            bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            
            badge_bg = (245, 158, 11)  # Amber
            rect_x1 = padding_x
            rect_y1 = padding_y
            rect_x2 = padding_x + text_w + 30
            rect_y2 = padding_y + text_h + 16
            
            draw.rounded_rectangle([rect_x1, rect_y1, rect_x2, rect_y2], radius=10, fill=badge_bg)
            draw.text((rect_x1 + 15, rect_y1 + 8), badge_text, font=font_badge, fill=(0, 0, 0))

        # 2. Draw Multi-line Word-Wrapped Headline
        headline_upper = headline.upper()
        lines = self._wrap_text(headline_upper, font_headline, width - (padding_x * 2), draw)
        
        current_y = padding_y + int(height * 0.12)
        line_height = int(height * 0.09)
        
        for line in lines[:4]:
            # Subtle drop shadow
            draw.text((padding_x + 3, current_y + 3), line, font=font_headline, fill=(0, 0, 0, 180))
            draw.text((padding_x, current_y), line, font=font_headline, fill=(255, 255, 255))
            current_y += line_height

        # 3. Creator Badge / Cutout
        if include_creator_badge:
            footer_y = height - int(height * 0.14)
            # Creator avatar circle
            avatar_r = int(height * 0.04)
            circle_box = [padding_x, footer_y, padding_x + avatar_r * 2, footer_y + avatar_r * 2]
            draw.ellipse(circle_box, fill=(91, 127, 255), outline=(255, 255, 255), width=2)
            
            # Creator initial
            initial = (creator_name or "C")[0]
            draw.text((padding_x + int(avatar_r * 0.65), footer_y + int(avatar_r * 0.4)), initial, font=font_badge, fill=(255, 255, 255))
            
            # Creator name
            draw.text((padding_x + avatar_r * 2 + 16, footer_y + int(avatar_r * 0.3)), creator_name, font=font_sub, fill=(240, 244, 255))
            draw.text((padding_x + avatar_r * 2 + 16, footer_y + int(avatar_r * 1.0)), "BRANDVERSE AI STUDIO", font=font_sub, fill=(139, 159, 194))

        # Save actual PNG file
        file_id = f"thumb_{uuid.uuid4().hex}.png"
        file_path = resolve_storage_path(Path("thumbnails") / file_id)
        if file_path.parent != self.output_dir:
            raise ValueError("Thumbnail output is outside its storage directory.")
        with open(file_path, "xb") as output_file:
            img.save(output_file, format="PNG")

        return {
            "file_name": file_id,
            "file_path": str(file_path),
            "download_url": f"/api/editor/thumbnails/{file_id}",
            "width": width,
            "height": height,
            "aspect_ratio": aspect_ratio
        }

    def _get_gradient_colors(self, style: str) -> Tuple[Tuple[int, int, int], Tuple[int, int, int]]:
        styles = {
            "bold_blue": ((24, 42, 85), (9, 11, 16)),
            "violet_glow": ((88, 28, 135), (10, 10, 25)),
            "amber_flare": ((120, 53, 15), (15, 12, 10)),
            "emerald_minimal": ((6, 78, 59), (8, 18, 15)),
        }
        return styles.get(style, styles["bold_blue"])

    def _create_gradient_image(self, width: int, height: int, c1: Tuple[int, int, int], c2: Tuple[int, int, int]) -> Image.Image:
        base = Image.new("RGB", (width, height), c1)
        draw = ImageDraw.Draw(base)
        for y in range(height):
            ratio = y / float(height)
            r = int(c1[0] * (1 - ratio) + c2[0] * ratio)
            g = int(c1[1] * (1 - ratio) + c2[1] * ratio)
            b = int(c1[2] * (1 - ratio) + c2[2] * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
        return base

    def _get_font(self, size: int, bold: bool = False):
        try:
            font_path = "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf"
            if Path(font_path).exists():
                return ImageFont.truetype(font_path, size)
        except Exception:
            pass
        return ImageFont.load_default()

    def _wrap_text(self, text: str, font, max_width: int, draw: ImageDraw.ImageDraw) -> list[str]:
        words = text.split()
        lines = []
        current = []
        for word in words:
            test_line = " ".join(current + [word])
            bbox = draw.textbbox((0, 0), test_line, font=font)
            if bbox[2] - bbox[0] <= max_width:
                current.append(word)
            else:
                if current:
                    lines.append(" ".join(current))
                current = [word]
        if current:
            lines.append(" ".join(current))
        return lines


thumbnail_service = ThumbnailService()
