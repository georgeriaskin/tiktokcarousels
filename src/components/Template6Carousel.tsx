import React, { useRef, useState, useEffect } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.svg";
const SLIDES_COUNT = 7;
const LS_SLIDETEXTS = 'template6_slideTexts';

export default function Template6Carousel() {
  const [slideTexts, setSlideTexts] = useState<string[]>(() => {
    if (typeof window === 'undefined') return Array(SLIDES_COUNT).fill("");
    try {
      const val = localStorage.getItem(LS_SLIDETEXTS);
      const arr = val ? JSON.parse(val) : null;
      if (Array.isArray(arr) && arr.length === SLIDES_COUNT) return arr;
    } catch {}
    return Array(SLIDES_COUNT).fill("");
  });

  useEffect(() => {
    localStorage.setItem(LS_SLIDETEXTS, JSON.stringify(slideTexts));
  }, [slideTexts]);

  const [images, setImages] = useState<File[]>([]);
  const [previewSlide, setPreviewSlide] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSlideText = (idx: number, value: string) => {
    setSlideTexts(prev => prev.map((t, i) => (i === idx ? value : t)));
  };

  function wrapMultiline(ctx: CanvasRenderingContext2D, text: string, _x: number, _y: number, maxWidth: number, lineHeight: number, draw = true): string[] {
    const paragraphs = text.split(/\n/);
    const lines: string[] = [];
    paragraphs.forEach(paragraph => {
      const words = paragraph.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());
    });
    if (draw) {
      lines.forEach((l, i) => {
        ctx.fillText(l.trim(), _x, _y + i * lineHeight);
      });
    }
    return lines;
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function renderTextBlock(ctx: CanvasRenderingContext2D, text: string) {
    if (!text.trim()) return;
    ctx.font = 'bold 72px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxTextWidth = 920;
    const lineHeight = 84;
    const padX = 48;
    const padY = 36;
    const lines = wrapMultiline(ctx, text, 540, 0, maxTextWidth, lineHeight, false);
    let maxLineWidth = 0;
    lines.forEach(l => {
      const w = ctx.measureText(l.trim()).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });
    const textBlockHeight = lines.length * lineHeight;
    const boxH = textBlockHeight + padY * 2;
    const boxY = 120;
    ctx.save();
    ctx.fillStyle = '#fff';
    roundRect(ctx, 540 - (maxLineWidth / 2 + padX), boxY, maxLineWidth + padX * 2, boxH, 40);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 72px Montserrat, sans-serif';
    ctx.textBaseline = 'middle';
    let currY = boxY + padY + lineHeight / 2;
    lines.forEach(l => {
      ctx.fillText(l.trim(), 540, currY);
      currY += lineHeight;
    });
  }

  // Distribute images into carousels of SLIDES_COUNT
  // < 7: cycle to fill one carousel
  // >= 7: full groups of 7; if remainder > 0, fill missing slots randomly
  function distributeImages(files: File[]): File[][] {
    const n = files.length;
    if (n === 0) return [];
    if (n < SLIDES_COUNT) {
      const carousel: File[] = [];
      for (let i = 0; i < SLIDES_COUNT; i++) {
        carousel.push(files[i % n]);
      }
      return [carousel];
    }
    const numFull = Math.floor(n / SLIDES_COUNT);
    const remainder = n % SLIDES_COUNT;
    const carousels: File[][] = [];
    for (let c = 0; c < numFull; c++) {
      carousels.push(files.slice(c * SLIDES_COUNT, (c + 1) * SLIDES_COUNT));
    }
    if (remainder > 0) {
      const partial = [...files.slice(numFull * SLIDES_COUNT)];
      const missing = SLIDES_COUNT - partial.length;
      for (let i = 0; i < missing; i++) {
        partial.push(files[Math.floor(Math.random() * n)]);
      }
      carousels.push(partial);
    }
    return carousels;
  }

  // Get preview image: always from the first (deterministic) carousel
  function getPreviewImage(): File | null {
    if (images.length === 0) return null;
    if (images.length < SLIDES_COUNT) {
      return images[previewSlide % images.length];
    }
    return images[previewSlide] || null;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 1080, 1920);
    const bgFile = getPreviewImage();

    function drawContent() {
      if (!ctx) return;
      ctx.save();
      renderTextBlock(ctx, slideTexts[previewSlide]);
      ctx.restore();
    }

    if (bgFile) {
      const img = new window.Image();
      img.onload = () => {
        if (!ctx) return;
        const ratio = Math.max(1080 / img.width, 1920 / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.clearRect(0, 0, 1080, 1920);
        ctx.drawImage(img, (1080 - w) / 2, (1920 - h) / 2, w, h);
        drawContent();
      };
      img.src = URL.createObjectURL(bgFile);
    } else {
      ctx.fillStyle = '#eee';
      ctx.fillRect(0, 0, 1080, 1920);
      drawContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSlide, images, slideTexts]);

  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise(resolve => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(file);
    });
  }

  const handleExportAll = async () => {
    if (images.length === 0) {
      alert("Загрузите изображения");
      return;
    }
    setIsGenerating(true);
    const carousels = distributeImages(images);
    const zip = new JSZip();
    for (let c = 0; c < carousels.length; c++) {
      const folder = zip.folder(`${c + 1}`);
      if (!folder) continue;
      for (let slide = 0; slide < SLIDES_COUNT; slide++) {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        const bgFile = carousels[c][slide];
        if (bgFile) {
          const img = await loadImage(bgFile);
          const ratio = Math.max(1080 / img.width, 1920 / img.height);
          const w = img.width * ratio;
          const h = img.height * ratio;
          ctx.drawImage(img, (1080 - w) / 2, (1920 - h) / 2, w, h);
        } else {
          ctx.fillStyle = "#eee";
          ctx.fillRect(0, 0, 1080, 1920);
        }
        ctx.save();
        renderTextBlock(ctx, slideTexts[slide]);
        ctx.restore();
        const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
        folder.file(`${slide + 1}.png`, blob);
      }
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "carousels-template6.zip");
    setIsGenerating(false);
  };

  type FileButtonProps = {
    label: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    accept?: string;
  };
  const FileButton = ({ label, inputRef, onChange, multiple = false, accept }: FileButtonProps) => (
    <div className="mb-2">
      <button
        type="button"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        onClick={() => inputRef.current && inputRef.current.click()}
      >
        {label}
      </button>
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        ref={inputRef}
        style={{ display: 'none' }}
        onChange={onChange}
      />
    </div>
  );

  const carouselCount = images.length === 0 ? 0 : Math.ceil(images.length / SLIDES_COUNT);

  return (
    <div className="w-full max-w-xl flex flex-col gap-6 bg-white p-6 rounded-xl shadow">
      <div>
        <h2 className="text-xl font-semibold mb-1">Шаблон 6 — 7 слайдов</h2>
        <p className="text-sm text-gray-500">
          7 изображений = 1 карусель · 14 = 2 карусели · меньше 7 — зацикливаются · между кратными — недостающие заполняются случайно
        </p>
      </div>

      {/* Text inputs for 7 slides */}
      {Array.from({ length: SLIDES_COUNT }, (_, i) => (
        <textarea
          key={i}
          className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
          placeholder={`Слайд ${i + 1}: Текст (сверху, с белой подложкой)`}
          value={slideTexts[i]}
          onChange={e => handleSlideText(i, e.target.value)}
        />
      ))}

      {/* Batch image upload */}
      <div>
        <label className="block font-semibold mb-1">Изображения (по 7 на карусель):</label>
        <FileButton
          label="Загрузить изображения"
          inputRef={imageInputRef}
          onChange={e => e.target.files && setImages(Array.from(e.target.files))}
          multiple={true}
          accept={IMAGE_ACCEPT}
        />
        <div className="text-xs text-gray-500">
          Загружено: {images.length} {images.length === 1 ? 'файл' : images.length >= 2 && images.length <= 4 ? 'файла' : 'файлов'} → {carouselCount} {carouselCount === 1 ? 'карусель' : carouselCount >= 2 && carouselCount <= 4 ? 'карусели' : 'каруселей'}
          {images.length > 0 && images.length % SLIDES_COUNT !== 0 && (
            <span className="text-yellow-600 ml-2">
              (последняя карусель дополняется случайными изображениями)
            </span>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 flex flex-col items-center">
        <h2 className="text-xl font-semibold mb-2">Превью слайда</h2>
        <div className="border rounded-lg bg-white shadow flex items-center justify-center" style={{ width: 270, height: 480 }}>
          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
            style={{ width: 270, height: 480, background: '#eee', borderRadius: 12 }}
          />
        </div>
        <div className="flex gap-2 mt-4 flex-wrap justify-center">
          {Array.from({ length: SLIDES_COUNT }, (_, i) => (
            <button
              key={i}
              className={`px-3 py-1 rounded ${previewSlide === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setPreviewSlide(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <button
        className="mt-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition w-full"
        onClick={handleExportAll}
        disabled={isGenerating}
      >
        {isGenerating ? 'Генерация...' : 'Скачать все карусели'}
      </button>
    </div>
  );
}
