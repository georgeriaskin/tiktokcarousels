import React, { useRef, useState, useEffect } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.svg";

// --- localStorage keys ---
const LS_TITLE = 'template5_title';
const LS_SUBTITLE = 'template5_subtitle';
const LS_PRODUCT = 'template5_product';
const LS_SLIDETEXTS = 'template5_slideTexts';

export default function Template5Carousel() {
  // --- INIT STATE WITH LOCALSTORAGE ---
  const [title, setTitle] = useState(() => {
    try {
      const val = localStorage.getItem(LS_TITLE);
      return val ? JSON.parse(val) : "";
    } catch { return ""; }
  });
  const [subtitle, setSubtitle] = useState(() => {
    try {
      const val = localStorage.getItem(LS_SUBTITLE);
      return val ? JSON.parse(val) : "";
    } catch { return ""; }
  });
  const [product, setProduct] = useState(() => {
    try {
      const val = localStorage.getItem(LS_PRODUCT);
      return val ? JSON.parse(val) : "";
    } catch { return ""; }
  });
  const [slideTexts, setSlideTexts] = useState([
    "", // Slide 2
    "", // Slide 3
    "", // Slide 4
    "", // Slide 5 (CTA)
  ]);
  // --- localStorage for slideTexts ---
  useEffect(() => {
    const val = localStorage.getItem(LS_SLIDETEXTS);
    if (val) {
      try {
        const arr = JSON.parse(val);
        if (Array.isArray(arr) && arr.length === 4) setSlideTexts(arr);
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(LS_TITLE, JSON.stringify(title));
  }, [title]);
  useEffect(() => {
    localStorage.setItem(LS_SUBTITLE, JSON.stringify(subtitle));
  }, [subtitle]);
  useEffect(() => {
    localStorage.setItem(LS_PRODUCT, JSON.stringify(product));
  }, [product]);
  useEffect(() => {
    localStorage.setItem(LS_SLIDETEXTS, JSON.stringify(slideTexts));
  }, [slideTexts]);

  // State for files
  const [hookBackgrounds, setHookBackgrounds] = useState<File[]>([]);
  const [slideBackgrounds, setSlideBackgrounds] = useState<File[]>([]);
  const [demoImages, setDemoImages] = useState<(File | null)[]>([null, null, null]);
  const [previewSlide, setPreviewSlide] = useState(0); // 0-4 (slides 1-5)
  const [isGenerating, setIsGenerating] = useState(false);

  // Drag-n-drop refs
  const hookBgInput = useRef<HTMLInputElement>(null);
  const slideBgInput = useRef<HTMLInputElement>(null);
  const demoInputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Получение нужных файлов для превью
  const getPreviewData = () => {
    const hookBg = hookBackgrounds[0] || null;
    const slideBg = slideBackgrounds[0] || null;
    const demo = demoImages;
    return { hookBg, slideBg, demo };
  };

  // Добавляем атрибуты webkitdirectory через useEffect
  useEffect(() => {
    if (hookBgInput.current) {
      hookBgInput.current.setAttribute('webkitdirectory', '');
      hookBgInput.current.setAttribute('directory', '');
    }
    if (slideBgInput.current) {
      slideBgInput.current.setAttribute('webkitdirectory', '');
      slideBgInput.current.setAttribute('directory', '');
    }
  }, []);

  // Handlers
  const handleSlideText = (idx: number, value: string) => {
    setSlideTexts(prev => prev.map((t, i) => (i === idx ? value : t)));
  };
  const handleFiles = (files: FileList, setter: (files: File[]) => void) => {
    setter(Array.from(files));
  };
  const handleDemoImage = (idx: number, file: File | null) => {
    setDemoImages(prev => prev.map((img, i) => (i === idx ? file : img)));
  };

  // Вспомогательная функция для скруглённых прямоугольников
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

  // Рендер предпросмотра на Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const { hookBg, slideBg, demo } = getPreviewData();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Фон
    let bgFile: File | null = null;
    if (previewSlide === 0) bgFile = hookBg;
    else if (previewSlide >= 1 && previewSlide <= 3) bgFile = slideBg;
    else if (previewSlide === 4) bgFile = slideBg;
    if (bgFile) {
      const img = new window.Image();
      img.onload = () => {
        if (!ctx) return;
        // Cover 1080x1920
        const ratio = Math.max(1080 / img.width, 1920 / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (1080 - w) / 2;
        const y = (1920 - h) / 2;
        ctx.clearRect(0, 0, 1080, 1920);
        ctx.drawImage(img, x, y, w, h);
        drawContent();
      };
      img.src = URL.createObjectURL(bgFile);
    } else {
      ctx.fillStyle = '#eee';
      ctx.fillRect(0, 0, 1080, 1920);
      drawContent();
    }
    function drawContent() {
      if (!ctx) return;
      ctx.save();
      // Slide 1: Заголовок с подложкой и подзаголовок
      if (previewSlide === 0) {
        // === Заголовок ===
        ctx.font = 'bold 72px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const maxTextWidth = 920;
        const lineHeight = 80;
        const padX = 48;
        const padY = 32;
        const lines = wrapMultiline(title, 540, 0, maxTextWidth, lineHeight, false);
        let maxLineWidth = 0;
        lines.forEach((l: string) => {
          const w = ctx.measureText(l.trim()).width;
          if (w > maxLineWidth) maxLineWidth = w;
        });
        const textBlockHeight = lines.length * lineHeight;
        const boxH = textBlockHeight + padY * 2;
        const y = Math.round((1920 - boxH - 120) / 2);
        ctx.save();
        ctx.fillStyle = '#fff';
        roundRect(ctx, 540 - (maxLineWidth/2 + padX), y, maxLineWidth + padX*2, boxH, 40);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#111';
        ctx.font = 'bold 72px Montserrat, sans-serif';
        ctx.textBaseline = 'middle';
        let currY = y + boxH / 2 - textBlockHeight / 2 + lineHeight / 2;
        lines.forEach((l: string) => {
          ctx.fillText(l.trim(), 540, currY);
          currY += lineHeight;
        });
        // === Подзаголовок ===
        if (subtitle.trim()) {
          ctx.font = 'bold 56px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          const subMaxTextWidth = 800;
          const subLineHeight = 64;
          const subPadX = 32;
          const subPadY = 24;
          const subLines = wrapMultiline(subtitle, 540, 0, subMaxTextWidth, subLineHeight, false);
          let subMaxLineWidth = 0;
          subLines.forEach((l: string) => {
            const w = ctx.measureText(l.trim()).width;
            if (w > subMaxLineWidth) subMaxLineWidth = w;
          });
          const subBlockHeight = subLines.length * subLineHeight;
          const subBoxH = subBlockHeight + subPadY * 2;
          const subY = y + boxH + 80; // 80px отступ вниз
          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = '#111';
          roundRect(ctx, 540 - (subMaxLineWidth/2 + subPadX), subY, subMaxLineWidth + subPadX*2, subBoxH, 28);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
          ctx.font = 'bold 56px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          let subCurrY = subY + subBoxH / 2 - subBlockHeight / 2 + subLineHeight / 2;
          subLines.forEach((l: string) => {
            ctx.fillText(l.trim(), 540, subCurrY);
            subCurrY += subLineHeight;
          });
        }
      }
      // Slide 2: Заголовок продукта с подложкой, текст, demo
      if (previewSlide === 1) {
        // === Заголовок продукта ===
        ctx.font = 'bold 48px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const maxTextWidth = 800;
        const lineHeight = 56;
        const padX = 32;
        const padY = 20;
        const lines = wrapMultiline(product, 540, 0, maxTextWidth, lineHeight, false);
        let maxLineWidth = 0;
        lines.forEach((l: string) => {
          const w = ctx.measureText(l.trim()).width;
          if (w > maxLineWidth) maxLineWidth = w;
        });
        const textBlockHeight = lines.length * lineHeight;
        const boxH = textBlockHeight + padY * 2;
        const y = 250;
        ctx.save();
        ctx.fillStyle = '#fff';
        roundRect(ctx, 540 - (maxLineWidth/2 + padX), y, maxLineWidth + padX*2, boxH, 28);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#111';
        ctx.font = 'bold 48px Montserrat, sans-serif';
        ctx.textBaseline = 'middle';
        let currY = y + boxH / 2 - textBlockHeight / 2 + lineHeight / 2;
        lines.forEach((l: string) => {
          ctx.fillText(l.trim(), 540, currY);
          currY += lineHeight;
        });
        // === Текст и demo ===
        ctx.font = 'bold 48px Montserrat, sans-serif';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const textWidth = 920;
        const textLineHeight = 56;
        const textLines = wrapMultiline(slideTexts[0].trim(), 540, 0, textWidth, textLineHeight, false);
        const textBlockHeight2 = textLines.length * textLineHeight;
        const textY = 600 - 100 - textBlockHeight2 + textLineHeight;
        textLines.forEach((l: string, i: number) => {
          ctx.strokeText(l.trim(), 540, textY + i * textLineHeight);
          ctx.fillText(l.trim(), 540, textY + i * textLineHeight);
        });
        // Demo картинка
        const demoFile = demo[0];
        if (demoFile) {
          const demoImg = new window.Image();
          demoImg.onload = () => {
            if (!ctx) return;
            const fixedWidth = 680;
            const ratio = fixedWidth / demoImg.width;
            const w = fixedWidth;
            const h = demoImg.height * ratio;
            const x = 540 - w / 2;
            const y = 600;
            ctx.drawImage(demoImg, x, y, w, h);
          };
          demoImg.src = URL.createObjectURL(demoFile);
        }
      }
      // Slides 3-4: текст + demo (как в Template1)
      if (previewSlide >= 2 && previewSlide <= 3) {
        ctx.font = 'bold 48px Montserrat, sans-serif';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        const textWidth = 920;
        const lineHeight = 56;
        const lines = wrapMultiline(slideTexts[previewSlide - 1].trim(), 540, 0, textWidth, lineHeight, false);
        const textBlockHeight = lines.length * lineHeight;
        const textY = 600 - 100 - textBlockHeight + lineHeight;
        lines.forEach((l: string, i: number) => {
          ctx.strokeText(l.trim(), 540, textY + i * lineHeight);
          ctx.fillText(l.trim(), 540, textY + i * lineHeight);
        });
        // Demo картинка
        const demoFile = demo[previewSlide - 1];
        if (demoFile) {
          const demoImg = new window.Image();
          demoImg.onload = () => {
            if (!ctx) return;
            const fixedWidth = 680;
            const ratio = fixedWidth / demoImg.width;
            const w = fixedWidth;
            const h = demoImg.height * ratio;
            const x = 540 - w / 2;
            const y = 600;
            ctx.drawImage(demoImg, x, y, w, h);
          };
          demoImg.src = URL.createObjectURL(demoFile);
        }
      }
      // Slide 5: CTA
      if (previewSlide === 4) {
        ctx.font = `bold 48px Montserrat, sans-serif`;
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        const textWidth = 800;
        const lineHeight = 56;
        const lines = wrapMultiline(slideTexts[3], 540, 960, textWidth, lineHeight, false);
        lines.forEach((l: string, i: number) => {
          ctx.strokeText(l.trim(), 540, 960 + i * lineHeight);
          ctx.fillText(l.trim(), 540, 960 + i * lineHeight);
        });
      }
      ctx.restore();
    }
    // eslint-disable-next-line
  }, [previewSlide, hookBackgrounds, slideBackgrounds, demoImages, slideTexts, title, subtitle, product]);

  // Исправить функцию wrapMultiline так, чтобы она возвращала массив строк:
  function wrapMultiline(text: string, x: number, y: number, maxWidth: number, lineHeight: number, draw = true): string[] {
    const canvas = canvasRef.current;
    if (!canvas) return [];
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    const paragraphs = text.split(/\n/);
    const lines: string[] = [];
    paragraphs.forEach(paragraph => {
      const words = paragraph.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());
    });
    if (draw) {
      lines.forEach((l: string, i: number) => {
        ctx.strokeText(l.trim(), x, y + i * lineHeight);
        ctx.fillText(l.trim(), x, y + i * lineHeight);
      });
    }
    return lines;
  }

  // Генерация и экспорт всех каруселей (аналогично Template1)
  const handleExportAll = async () => {
    setIsGenerating(true);
    const count = Math.min(hookBackgrounds.length, slideBackgrounds.length);
    if (count === 0) {
      alert("Загрузите фоны для хука и остальных слайдов");
      setIsGenerating(false);
      return;
    }
    if (demoImages.some(img => !img)) {
      alert("Загрузите все 3 демо-картинки");
      setIsGenerating(false);
      return;
    }
    const zip = new JSZip();
    for (let i = 0; i < count; i++) {
      const folder = zip.folder(`${i + 1}`);
      if (!folder) continue;
      for (let slide = 0; slide < 5; slide++) {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        // Фон
        let bgFile: File | null = null;
        if (slide === 0) bgFile = hookBackgrounds[i];
        else bgFile = slideBackgrounds[i];
        if (bgFile) {
          const img = await loadImage(bgFile);
          const ratio = Math.max(1080 / img.width, 1920 / img.height);
          const w = img.width * ratio;
          const h = img.height * ratio;
          const x = (1080 - w) / 2;
          const y = (1920 - h) / 2;
          ctx.drawImage(img, x, y, w, h);
        } else {
          ctx.fillStyle = "#eee";
          ctx.fillRect(0, 0, 1080, 1920);
        }
        ctx.save();
        // Slide 1: Заголовок с подложкой и подзаголовок
        if (slide === 0) {
          ctx.font = 'bold 72px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 12;
          ctx.lineJoin = 'round';
          ctx.textBaseline = 'top';
          const padX = 48;
          const padY = 32;
          const yTitle = 300;
          const titleW = ctx.measureText(title).width + padX * 2;
          const titleH = 100;
          ctx.save();
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#000';
          roundRect(ctx, 540 - titleW / 2, yTitle, titleW, titleH, 40);
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = '#111';
          ctx.font = 'bold 72px Montserrat, sans-serif';
          ctx.fillText(title, 540, yTitle + titleH / 2 - 24);
          ctx.font = 'bold 48px Montserrat, sans-serif';
          ctx.lineWidth = 8;
          ctx.strokeStyle = '#000';
          ctx.fillStyle = '#fff';
          ctx.textBaseline = 'top';
          ctx.strokeText(subtitle, 540, yTitle + titleH + 200);
          ctx.fillText(subtitle, 540, yTitle + titleH + 200);
        }
        // Slide 2: Заголовок продукта с подложкой, текст, demo
        if (slide === 1) {
          ctx.font = 'bold 48px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 8;
          ctx.lineJoin = 'round';
          ctx.textBaseline = 'top';
          const padX = 32;
          const padY = 20;
          const yProduct = 120;
          const productW = ctx.measureText(product).width + padX * 2;
          const productH = 70;
          ctx.save();
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#000';
          roundRect(ctx, 540 - productW / 2, yProduct, productW, productH, 28);
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = '#111';
          ctx.font = 'bold 48px Montserrat, sans-serif';
          ctx.fillText(product, 540, yProduct + productH / 2 - 12);
          ctx.font = 'bold 48px Montserrat, sans-serif';
          ctx.lineWidth = 8;
          ctx.strokeStyle = '#000';
          ctx.fillStyle = '#fff';
          const textWidth = 920;
          const lineHeight = 56;
          const lines = wrapMultiline(slideTexts[0].trim(), 540, 0, textWidth, lineHeight, false);
          const textBlockHeight = lines.length * lineHeight;
          const textY = 600 - 100 - textBlockHeight + lineHeight;
          lines.forEach((l: string, i: number) => {
            ctx.strokeText(l.trim(), 540, textY + i * lineHeight);
            ctx.fillText(l.trim(), 540, textY + i * lineHeight);
          });
          const demoFile = demoImages[0];
          if (demoFile) {
            const demoImg = await loadImage(demoFile);
            const fixedWidth = 680;
            const ratio = fixedWidth / demoImg.width;
            const w = fixedWidth;
            const h = demoImg.height * ratio;
            const x = 540 - w / 2;
            const y = 600;
            ctx.drawImage(demoImg, x, y, w, h);
          }
        }
        // Slides 3-4: текст + demo
        if (slide >= 2 && slide <= 3) {
          ctx.font = 'bold 48px Montserrat, sans-serif';
          ctx.lineWidth = 8;
          ctx.strokeStyle = '#000';
          ctx.fillStyle = '#fff';
          const textWidth = 920;
          const lineHeight = 56;
          const lines = wrapMultiline(slideTexts[slide - 1].trim(), 540, 0, textWidth, lineHeight, false);
          const textBlockHeight = lines.length * lineHeight;
          const textY = 600 - 100 - textBlockHeight + lineHeight;
          lines.forEach((l: string, i: number) => {
            ctx.strokeText(l.trim(), 540, textY + i * lineHeight);
            ctx.fillText(l.trim(), 540, textY + i * lineHeight);
          });
          const demoFile = demoImages[slide - 1];
          if (demoFile) {
            const demoImg = await loadImage(demoFile);
            const fixedWidth = 680;
            const ratio = fixedWidth / demoImg.width;
            const w = fixedWidth;
            const h = demoImg.height * ratio;
            const x = 540 - w / 2;
            const y = 600;
            ctx.drawImage(demoImg, x, y, w, h);
          }
        }
        // Slide 5: CTA
        if (slide === 4) {
          ctx.font = `bold 48px Montserrat, sans-serif`;
          ctx.lineWidth = 8;
          ctx.strokeStyle = '#000';
          ctx.fillStyle = '#fff';
          const textWidth = 800;
          const lineHeight = 56;
          const lines = wrapMultiline(slideTexts[3], 540, 960, textWidth, lineHeight, false);
          lines.forEach((l: string, i: number) => {
            ctx.strokeText(l.trim(), 540, 960 + i * lineHeight);
            ctx.fillText(l.trim(), 540, 960 + i * lineHeight);
          });
        }
        ctx.restore();
        const blob = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
        folder.file(`${slide + 1}.png`, blob);
      }
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "carousels.zip");
    setIsGenerating(false);
  };

  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise(resolve => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(file);
    });
  }

  // FileButton
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

  return (
    <div className="w-full max-w-xl flex flex-col gap-6 bg-white p-6 rounded-xl shadow">
      {/* Text Inputs */}
      <textarea
        className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
        placeholder="Слайд 1: Заголовок (по центру, крупный)"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <textarea
        className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
        placeholder="Слайд 1: Подзаголовок (под заголовком, Montserrat, белый с подложкой)"
        value={subtitle}
        onChange={e => setSubtitle(e.target.value)}
      />
      <textarea
        className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
        placeholder="Слайд 2: Заголовок продукта (на втором слайде, с подложкой)"
        value={product}
        onChange={e => setProduct(e.target.value)}
      />
      <textarea
        className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
        placeholder="Слайд 2: Текст для второго слайда"
        value={slideTexts[0]}
        onChange={e => handleSlideText(0, e.target.value)}
      />
      <textarea
        className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
        placeholder="Слайд 3: Текст для третьего слайда"
        value={slideTexts[1]}
        onChange={e => handleSlideText(1, e.target.value)}
      />
      <textarea
        className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
        placeholder="Слайд 4: Текст для четвертого слайда"
        value={slideTexts[2]}
        onChange={e => handleSlideText(2, e.target.value)}
      />
      <textarea
        className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
        placeholder="Слайд 5: CTA (текст для последнего слайда)"
        value={slideTexts[3]}
        onChange={e => handleSlideText(3, e.target.value)}
      />
      {/* File Uploads */}
      <div>
        <label className="block font-semibold mb-1">Фоны для первого слайда (хук):</label>
        <FileButton
          label="Загрузить фоны для первого слайда"
          inputRef={hookBgInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.files && handleFiles(e.target.files, setHookBackgrounds)}
          multiple={true}
          accept={IMAGE_ACCEPT}
        />
        <div className="text-xs text-gray-500">Загружено: {hookBackgrounds.length} файлов</div>
      </div>
      <div>
        <label className="block font-semibold mb-1">Фоны для остальных слайдов:</label>
        <FileButton
          label="Загрузить фоны для остальных слайдов"
          inputRef={slideBgInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.files && handleFiles(e.target.files, setSlideBackgrounds)}
          multiple={true}
          accept={IMAGE_ACCEPT}
        />
        <div className="text-xs text-gray-500">Загружено: {slideBackgrounds.length} файлов</div>
      </div>
      <div>
        <label className="block font-semibold mb-1">Демо-изображения (3 шт):</label>
        {[0,1,2].map(i => (
          <FileButton
            key={i}
            label={`Демо-изображение ${i+1}`}
            inputRef={demoInputs[i]}
            onChange={e => handleDemoImage(i, e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            multiple={false}
            accept={IMAGE_ACCEPT}
          />
        ))}
        <div className="text-xs text-gray-500">Загружено: {demoImages.filter(Boolean).length} из 3</div>
      </div>
      {/* Slide preview buttons + canvas */}
      <div className="mt-10 flex flex-col items-center">
        <h2 className="text-xl font-semibold mb-2">Превью слайда</h2>
        <div className="border rounded-lg bg-white shadow flex items-center justify-center" style={{ width: 270, height: 480 }}>
          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
            style={{ width: 270, height: 480, background: '#eee', borderRadius: 12 }}
          />
        </div>
        <div className="flex gap-2 mt-4">
          {[0,1,2,3,4].map(i => (
            <button
              key={i}
              className={`px-3 py-1 rounded ${previewSlide === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setPreviewSlide(i)}
            >
              {i+1}
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