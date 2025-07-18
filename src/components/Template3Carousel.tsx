import React, { useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.svg";
const LS_SLIDETEXTS = 'template3_slideTexts';

export default function Template3Carousel() {
  // State for текстов (многострочные)
  const [slideTexts, setSlideTexts] = useState(() => {
    try {
      const val = localStorage.getItem(LS_SLIDETEXTS);
      return val ? JSON.parse(val) : ["", "", "", ""];
    } catch { return ["", "", "", ""]; }
  });

  // State for files
  const [slideBackgrounds, setSlideBackgrounds] = useState<File[]>([]);
  const [demoImages, setDemoImages] = useState<(File | null)[]>([null, null, null]);

  // State for превью
  const [previewSlide, setPreviewSlide] = useState(0); // 0-3 (слайды 1-4)
  // State for загрузки
  const [isGenerating, setIsGenerating] = useState(false);

  // Drag-n-drop refs
  const slideBgInput = useRef<HTMLInputElement>(null);
  const demoInputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Получение нужных файлов для превью
  const getPreviewData = () => {
    // Для MVP: показываем первую карусель (первый фон и демо)
    const slideBg = slideBackgrounds[0] || null;
    const demo = demoImages;
    return { slideBg, demo };
  };

  // Рендер превью на Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const { slideBg, demo } = getPreviewData();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Очистить
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Фон
    const bgFile: File | null = slideBg;
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
      ctx.font = 'bold 48px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#fff';
      const lineHeight = 56;
      function wrapMultiline(text: string, x: number, y: number, maxWidth: number, lineHeight: number, draw = true) {
        if (!ctx) return 0;
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
              lines.push(line);
              line = words[n] + ' ';
            } else {
              line = testLine;
            }
          }
          lines.push(line);
        });
        if (draw) {
          lines.forEach((l, i) => {
            if (!ctx) return;
            ctx.strokeText(l.trim(), x, y + i * lineHeight);
            ctx.fillText(l.trim(), x, y + i * lineHeight);
          });
        }
        return lines.length;
      }
      // Слайды 1-3: демо + текст
      if (previewSlide >= 0 && previewSlide <= 2) {
        ctx.font = 'bold 48px Montserrat, sans-serif';
        ctx.lineWidth = 8;
        const textWidth = 920;
        const lines = wrapMultiline(slideTexts[previewSlide].trim(), 540, 0, textWidth, lineHeight, false);
        const textBlockHeight = lines * lineHeight;
        const textY = 600 - 100 - textBlockHeight + lineHeight;
        wrapMultiline(slideTexts[previewSlide].trim(), 540, textY, textWidth, lineHeight);
        // Демо картинка
        const demoFile = demo[previewSlide];
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
      // Слайд 4: CTA
      if (previewSlide === 3) {
        ctx.font = `bold 48px Montserrat, sans-serif`;
        ctx.lineWidth = 8;
        wrapMultiline(slideTexts[3], 540, 960, 800, lineHeight);
      }
      ctx.restore();
    }
    // eslint-disable-next-line
  }, [previewSlide, slideBackgrounds, demoImages, slideTexts]);

  React.useEffect(() => {
    localStorage.setItem(LS_SLIDETEXTS, JSON.stringify(slideTexts));
  }, [slideTexts]);

  // Добавляем атрибуты webkitdirectory через useEffect
  React.useEffect(() => {
    if (slideBgInput.current) {
      slideBgInput.current.setAttribute('webkitdirectory', '');
      slideBgInput.current.setAttribute('directory', '');
    }
  }, []);

  // Handlers
  const handleSlideText = (idx: number, value: string) => {
    setSlideTexts((prev: string[]) => prev.map((t: string, i: number) => (i === idx ? value : t)));
  };

  const handleFiles = (files: FileList, setter: (files: File[]) => void) => {
    setter(Array.from(files));
  };

  const handleDemoImage = (idx: number, file: File | null) => {
    setDemoImages(prev => prev.map((img, i) => (i === idx ? file : img)));
  };

  // Генерация и экспорт всех каруселей
  const handleExportAll = async () => {
    setIsGenerating(true);
    const count = slideBackgrounds.length;
    if (count === 0) {
      alert("Загрузите фоны для слайдов");
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
      // Для каждого слайда генерируем картинку
      for (let slide = 0; slide < 4; slide++) {
        // Создаём временный canvas
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        // Фон
        const bgFile: File | null = slideBackgrounds[i];
        if (bgFile) {
          const img = await loadImage(bgFile);
          // Cover
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
        // Текст и демо (копируем логику превью)
        ctx.save();
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px Montserrat, sans-serif';
        ctx.lineWidth = 8;
        const lineHeight = 56;
        function wrapMultiline(text: string, x: number, y: number, maxWidth: number, lineHeight: number, draw = true) {
          if (!ctx) return 0;
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
                lines.push(line);
                line = words[n] + ' ';
              } else {
                line = testLine;
              }
            }
            lines.push(line);
          });
          if (draw) {
            lines.forEach((l, i) => {
              if (!ctx) return;
              ctx.strokeText(l.trim(), x, y + i * lineHeight);
              ctx.fillText(l.trim(), x, y + i * lineHeight);
            });
          }
          return lines.length;
        }
        if (slide >= 0 && slide <= 2) {
          ctx.font = 'bold 48px Montserrat, sans-serif';
          ctx.lineWidth = 8;
          const textWidth = 920;
          const lines = wrapMultiline(slideTexts[slide].trim(), 540, 0, textWidth, lineHeight, false);
          const textBlockHeight = lines * lineHeight;
          const textY = 600 - 100 - textBlockHeight + lineHeight;
          wrapMultiline(slideTexts[slide].trim(), 540, textY, textWidth, lineHeight);
          // Демо
          const demoFile = demoImages[slide];
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
        } else if (slide === 3) {
          wrapMultiline(slideTexts[3], 540, 960, 800, lineHeight);
        }
        ctx.restore();
        // Сохраняем PNG
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          folder.file(`${slide + 1}.png`, blob);
        }
      }
    }
    // Сохраняем архив
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "carousels.zip");
    setIsGenerating(false);
  };

  // Вспомогательная функция для загрузки File в Image
  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise(resolve => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(file);
    });
  }

  // Кастомная кнопка для файлов
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
        placeholder="Слайд 1: Текст над демо продуктом"
        value={slideTexts[0]}
        onChange={e => handleSlideText(0, e.target.value)}
      />
      <textarea
        className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
        placeholder="Слайд 2: Текст над демо продуктом"
        value={slideTexts[1]}
        onChange={e => handleSlideText(1, e.target.value)}
      />
      <textarea
        className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
        placeholder="Слайд 3: Текст над демо продуктом"
        value={slideTexts[2]}
        onChange={e => handleSlideText(2, e.target.value)}
      />
      <textarea
        className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
        placeholder="Слайд 4: CTA (текст для последнего слайда)"
        value={slideTexts[3]}
        onChange={e => handleSlideText(3, e.target.value)}
      />
      {/* File Uploads */}
      <div>
        <label className="block font-semibold mb-1">Фоны для слайдов (по одному на каждую карусель):</label>
        <FileButton
          label="Загрузить фоны для слайдов"
          inputRef={slideBgInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.files && handleFiles(e.target.files, setSlideBackgrounds)}
          multiple={true}
          accept={IMAGE_ACCEPT}
        />
        <div className="text-xs text-gray-500">Загружено: {slideBackgrounds.length} файлов</div>
      </div>
      <div className="flex gap-4">
        {[0, 1, 2].map(idx => (
          <div key={idx} className="flex flex-col items-center">
            <label className="block font-semibold mb-1">Демо {idx + 1}</label>
            <FileButton
              label={demoImages[idx] ? "Заменить демо" : "Загрузить демо"}
              inputRef={demoInputs[idx]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDemoImage(idx, e.target.files && e.target.files[0] ? e.target.files[0] : null)}
              multiple={false}
              accept={IMAGE_ACCEPT}
            />
            {demoImages[idx] && <div className="text-xs text-green-600">Загружено</div>}
          </div>
        ))}
      </div>
      {/* Preview */}
      <div className="flex flex-col items-center">
        <div className="flex gap-2 mb-2">
          {[0, 1, 2, 3].map(idx => (
            <button
              key={idx}
              className={`px-3 py-1 rounded ${previewSlide === idx ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
              onClick={() => setPreviewSlide(idx)}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        <canvas ref={canvasRef} width={1080} height={1920} className="border rounded shadow-lg w-[270px] h-[480px] bg-gray-100" />
      </div>
      {/* Export */}
      <button
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold mt-4 hover:bg-blue-700 transition disabled:opacity-50"
        onClick={handleExportAll}
        disabled={isGenerating}
      >
        {isGenerating ? "Генерация..." : "Экспортировать все карусели (zip)"}
      </button>
    </div>
  );
} 