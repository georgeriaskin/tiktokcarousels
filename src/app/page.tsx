'use client';

import React, { useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.svg";

export default function Home() {
  // State for текстов (многострочные)
  const [slideTexts, setSlideTexts] = useState([
    "", // Slide 1 (hook)
    "", // Slide 2
    "", // Slide 3
    "", // Slide 4
    "", // Slide 5 (CTA)
  ]);

  // State for files
  const [hookBackgrounds, setHookBackgrounds] = useState<File[]>([]);
  const [slideBackgrounds, setSlideBackgrounds] = useState<File[]>([]);
  const [demoImages, setDemoImages] = useState<(File | null)[]>([null, null, null]);

  // State for превью
  const [previewSlide, setPreviewSlide] = useState(0); // 0-4 (слайды 1-5)
  // State for загрузки
  const [isGenerating, setIsGenerating] = useState(false);

  // Drag-n-drop refs
  const hookBgInput = useRef<HTMLInputElement>(null);
  const slideBgInput = useRef<HTMLInputElement>(null);
  const demoInputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Получение нужных файлов для превью
  const getPreviewData = () => {
    // Для MVP: показываем первую карусель (первые фоны и демо)
    const hookBg = hookBackgrounds[0] || null;
    const slideBg = slideBackgrounds[0] || null;
    const demo = demoImages;
    return { hookBg, slideBg, demo };
  };

  // Рендер превью на Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const { hookBg, slideBg, demo } = getPreviewData();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Очистить
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
      // Текст и демо
      ctx.save();
      ctx.font = 'bold 80px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000';
      ctx.fillStyle = '#fff';
      // Safe area и размеры
      const fontSize = 48;
      const lineHeight = 56;
      const strokeWidth = 8;
      const maxTextWidth = 800;
      // Функция для переноса текста по ширине и \n
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
      // Слайд 1: хук
      if (previewSlide === 0) {
        ctx.font = `bold ${fontSize}px Montserrat, sans-serif`;
        ctx.lineWidth = strokeWidth;
        // Текст с отступом 200px от верхнего края
        wrapMultiline(slideTexts[0], 540, 300, maxTextWidth, lineHeight);
      }
      // Слайды 2-4: демо + текст
      if (previewSlide >= 1 && previewSlide <= 3) {
        ctx.font = 'bold 48px Montserrat, sans-serif';
        ctx.lineWidth = 8;
        const textWidth = 920;
        const lineHeight = 56;
        const lines = wrapMultiline(slideTexts[previewSlide].trim(), 540, 0, textWidth, lineHeight, false);
        const textBlockHeight = lines * lineHeight;
        const textY = 600 - 100 - textBlockHeight + lineHeight;
        wrapMultiline(slideTexts[previewSlide].trim(), 540, textY, textWidth, lineHeight);
        // Демо картинка
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
      // Слайд 5: CTA
      if (previewSlide === 4) {
        ctx.font = `bold ${fontSize}px Montserrat, sans-serif`;
        ctx.lineWidth = strokeWidth;
        wrapMultiline(slideTexts[4], 540, 960, 800, lineHeight);
      }
      ctx.restore();
    }
    // eslint-disable-next-line
  }, [previewSlide, hookBackgrounds, slideBackgrounds, demoImages, slideTexts]);

  // Добавляем атрибуты webkitdirectory через useEffect
  React.useEffect(() => {
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

  // Генерация и экспорт всех каруселей
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
      // Для каждого слайда генерируем картинку
      for (let slide = 0; slide < 5; slide++) {
        // Создаём временный canvas
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
        const maxTextWidth = 920;
        const lineHeight = 56;
        // Функция переноса
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
        if (slide === 0) {
          wrapMultiline(slideTexts[0], 540, 300, maxTextWidth, lineHeight);
        } else if (slide >= 1 && slide <= 3) {
          ctx.font = 'bold 48px Montserrat, sans-serif';
          ctx.lineWidth = 8;
          const textWidth = 920;
          const lineHeight = 56;
          const lines = wrapMultiline(slideTexts[slide].trim(), 540, 0, textWidth, lineHeight, false);
          const textBlockHeight = lines * lineHeight;
          const textY = 600 - 100 - textBlockHeight + lineHeight;
          wrapMultiline(slideTexts[slide].trim(), 540, textY, textWidth, lineHeight);
          // Демо
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
        } else if (slide === 4) {
          wrapMultiline(slideTexts[4], 540, 960, 800, lineHeight);
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8">TikTok Карусель Генератор</h1>
      <div className="w-full max-w-xl flex flex-col gap-6 bg-white p-6 rounded-xl shadow">
        {/* Text Inputs */}
        <textarea
          className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
          placeholder="Слайд 1: Хук (текст для первого слайда)"
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
          placeholder="Слайд 4: Текст над демо продуктом"
          value={slideTexts[3]}
          onChange={e => handleSlideText(3, e.target.value)}
        />
        <textarea
          className="border rounded px-3 py-2 resize-vertical min-h-[80px]"
          placeholder="Слайд 5: CTA (текст для последнего слайда)"
          value={slideTexts[4]}
          onChange={e => handleSlideText(4, e.target.value)}
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
          <label className="block font-semibold mb-1">Картинки демо продукта:</label>
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map(idx => (
              <div key={idx} className="flex items-center gap-2">
                <FileButton
                  label={`Загрузить демо ${idx + 1}`}
                  inputRef={demoInputs[idx]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDemoImage(idx, e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                  multiple={false}
                  accept={IMAGE_ACCEPT}
                />
                <span className="text-xs text-gray-500">
                  {demoImages[idx] ? demoImages[idx]!.name : "Файл не выбран"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Preview (canvas) */}
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
          {[0,1,2,3,4].map(idx => (
            <button
              key={idx}
              className={`px-3 py-1 rounded ${previewSlide===idx ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setPreviewSlide(idx)}
            >
              {idx+1}
            </button>
          ))}
        </div>
        <button
          className="mt-8 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
          onClick={handleExportAll}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Генерируется...
            </div>
          ) : (
            "Сгенерировать и скачать все карусели"
          )}
        </button>
      </div>
    </div>
  );
}
