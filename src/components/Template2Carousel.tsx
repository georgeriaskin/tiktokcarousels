import React, { useRef, useState } from "react";
import { useEffect } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.svg";

// --- localStorage keys ---
const LS_SLIDE1 = 'template2_slide1Titles';
const LS_SLIDETEXTS = 'template2_slideTexts';

export default function Template2Carousel() {
  // --- INIT STATE WITH LOCALSTORAGE ---
  const [slide1Titles, setSlide1Titles] = useState<string[]>(() => {
    try {
      const val = localStorage.getItem(LS_SLIDE1);
      return val ? JSON.parse(val) : ["", "", ""];
    } catch { return ["", "", ""]; }
  });
  const [slideTexts, setSlideTexts] = useState<{ title: string; desc: string }[]>(() => {
    try {
      const val = localStorage.getItem(LS_SLIDETEXTS);
      return val ? JSON.parse(val) : [
        { title: "", desc: "" },
        { title: "", desc: "" },
        { title: "", desc: "" },
        { title: "", desc: "" },
        { title: "", desc: "" },
      ];
    } catch {
      return [
        { title: "", desc: "" },
        { title: "", desc: "" },
        { title: "", desc: "" },
        { title: "", desc: "" },
        { title: "", desc: "" },
      ];
    }
  });
  // Демо-изображения для слайдов 2-6
  const [demoImages, setDemoImages] = useState<(File | null)[]>([null, null, null, null, null]);
  // Фоны
  const [backgrounds, setBackgrounds] = useState<File[]>([]);
  const [previewSlide, setPreviewSlide] = useState(0); // 0-5 (слайды 1-6)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Логика распределения фонов по каруселям
  function getCarouselsFromBackgrounds(bgFiles: File[]): File[][] {
    if (bgFiles.length < 6) return [];
    const carousels: File[][] = [];
    const total = Math.ceil(bgFiles.length / 6);
    for (let i = 0; i < total; i++) {
      const start = i * 6;
      let group = bgFiles.slice(start, start + 6);
      if (group.length < 6) {
        // Добиваем рандомными из всех загруженных
        while (group.length < 6) {
          const randIdx = Math.floor(Math.random() * bgFiles.length);
          group.push(bgFiles[randIdx]);
        }
      }
      carousels.push(group);
    }
    return carousels;
  }
  const carousels = getCarouselsFromBackgrounds(backgrounds);

  // --- SAVE TO LOCALSTORAGE ON CHANGE ---
  useEffect(() => {
    localStorage.setItem(LS_SLIDE1, JSON.stringify(slide1Titles));
  }, [slide1Titles]);
  useEffect(() => {
    localStorage.setItem(LS_SLIDETEXTS, JSON.stringify(slideTexts));
  }, [slideTexts]);

  // Handlers
  const handleTitleChange = (idx: number, value: string) => {
    setSlide1Titles(prev => prev.map((t, i) => (i === idx ? value : t)));
  };
  const handleSlideTextChange = (idx: number, field: 'title' | 'desc', value: string) => {
    setSlideTexts(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };
  const handleDemoImage = (idx: number, file: File | null) => {
    setDemoImages(prev => prev.map((img, i) => (i === idx ? file : img)));
  };
  const handleBackgrounds = (files: FileList) => {
    setBackgrounds(Array.from(files));
  };

  // File input refs
  const bgInput = useRef<HTMLInputElement>(null);
  const demoInputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

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

  // Добавляем webkitdirectory
  React.useEffect(() => {
    if (bgInput.current) {
      bgInput.current.setAttribute('webkitdirectory', '');
      bgInput.current.setAttribute('directory', '');
    }
  }, []);

  // --- TEXT WRAP FUNCTION ---
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    if (!text) return y;
    const words = text.split(' ');
    let line = '';
    let currY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currY);
        line = words[n] + ' ';
        currY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currY);
    return currY + lineHeight;
  }

  // Рендер предпросмотра на canvas
  useEffect(() => {
    if (!carousels[0]) return;
    const bgFile = carousels[0][previewSlide];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Фон
    if (bgFile) {
      const img = new window.Image();
      img.onload = () => {
        if (!ctx) return;
        // Cover 1080x1350
        const ratio = Math.max(1080 / img.width, 1350 / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (1080 - w) / 2;
        const y = (1350 - h) / 2;
        ctx.clearRect(0, 0, 1080, 1350);
        ctx.drawImage(img, x, y, w, h);
        drawContent();
      };
      img.src = URL.createObjectURL(bgFile);
    } else {
      ctx.fillStyle = '#eee';
      ctx.fillRect(0, 0, 1080, 1350);
      drawContent();
    }
    function drawContent() {
      if (!ctx) return;
      ctx.save();
      ctx.font = 'bold 48px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      // Slide 1: три заголовка по центру с подложками (верх/низ красные, центр белая)
      if (previewSlide === 0) {
        const titles = slide1Titles;
        const padY = 24;
        const padX = 32;
        const boxH = 70;
        // Считаем высоту блока
        const totalBlockHeight = boxH * 3 + padY * 2;
        const yBase = Math.round((1350 - totalBlockHeight) / 2);
        ctx.font = 'bold 48px Inter, sans-serif';
        // Верхний (красный)
        ctx.save();
        ctx.font = 'bold 48px Inter, sans-serif';
        const w1 = ctx.measureText(titles[0]).width + padX*2;
        ctx.fillStyle = '#E53935';
        roundRect(ctx, 540 - w1/2, yBase, w1, boxH, 32);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(titles[0], 540, yBase + boxH/2 + 16);
        ctx.restore();
        // Средний (белый)
        ctx.save();
        ctx.font = 'bold 48px Inter, sans-serif';
        const w2 = ctx.measureText(titles[1]).width + padX*2;
        ctx.fillStyle = '#fff';
        roundRect(ctx, 540 - w2/2, yBase + boxH + padY, w2, boxH, 32);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.fillText(titles[1], 540, yBase + boxH + padY + boxH/2 + 16);
        ctx.restore();
        // Нижний (красный)
        ctx.save();
        ctx.font = 'bold 48px Inter, sans-serif';
        const w3 = ctx.measureText(titles[2]).width + padX*2;
        ctx.fillStyle = '#E53935';
        roundRect(ctx, 540 - w3/2, yBase + 2*(boxH + padY), w3, boxH, 32);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(titles[2], 540, yBase + 2*(boxH + padY) + boxH/2 + 16);
        ctx.restore();
      }
      // Слайды 2-6: заголовок с красной подложкой, описание с чёрной прозрачной подложкой, демо
      if (previewSlide >= 1 && previewSlide <= 5) {
        const slide = slideTexts[previewSlide-1];
        const yShift = 250;
        // Заголовок (красная подложка)
        ctx.save();
        ctx.font = 'bold 48px Inter, sans-serif';
        const padX = 32;
        const titleW = ctx.measureText(slide.title).width + padX*2;
        ctx.fillStyle = '#E53935';
        roundRect(ctx, 540 - titleW/2, 120 + yShift, titleW, 70, 32);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(slide.title, 540, 120 + yShift + 70/2 + 16);
        ctx.restore();
        // Описание (чёрная прозрачная подложка)
        ctx.save();
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.7;
        const descPadX = 24;
        const descMaxW = 900;
        // --- вычисляем переносы и размеры ---
        const lines: string[] = [];
        if (slide.desc) {
          const words = slide.desc.split(' ');
          let line = '';
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > descMaxW - descPadX*2 && n > 0) {
              lines.push(line.trim());
              line = words[n] + ' ';
            } else {
              line = testLine;
            }
          }
          lines.push(line.trim());
        }
        const textW = Math.min(
          Math.max(...lines.map(l => ctx.measureText(l).width)),
          descMaxW - descPadX*2
        ) + descPadX*2;
        const lineHeight = 40;
        const textH = lines.length * lineHeight;
        const padY = 32;
        const boxH = textH + padY * 2;
        const descX = 540 - textW/2;
        const descY = 220 + yShift;
        roundRect(ctx, descX, descY, textW, boxH, 32);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        // --- рисуем строки по центру подложки ---
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.textAlign = 'center';
        let currY = descY + (boxH - textH) / 2 + lineHeight / 2;
        for (const l of lines) {
          ctx.fillText(l, 540, currY);
          currY += lineHeight;
        }
        ctx.restore();
        // Демо-изображение
        const demoFile = demoImages[previewSlide-1];
        if (demoFile) {
          const demoImg = new window.Image();
          demoImg.onload = () => {
            if (!ctx) return;
            const fixedW = 864;
            const ratio = fixedW / demoImg.width;
            const w = fixedW;
            const h = demoImg.height * ratio;
            const x = 540 - w/2;
            const y = descY + boxH + 30; // под описанием
            ctx.drawImage(demoImg, x, y, w, h);
          };
          demoImg.src = URL.createObjectURL(demoFile);
        }
      }
      ctx.restore();
    }
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
  // eslint-disable-next-line
  }, [carousels, previewSlide, slide1Titles, slideTexts, demoImages]);

  // Экспорт всех каруселей
  async function handleExportAll() {
    if (!carousels.length) return;
    setIsGenerating(true);
    const zip = new JSZip();
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
    for (let i = 0; i < carousels.length; i++) {
      const folder = zip.folder(`${i + 1}`);
      if (!folder) continue;
      for (let slide = 0; slide < 6; slide++) {
        // Создаём временный canvas
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1350;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        // Фон
        const bgFile = carousels[i][slide];
        if (bgFile) {
          const img = await loadImage(bgFile);
          const ratio = Math.max(1080 / img.width, 1350 / img.height);
          const w = img.width * ratio;
          const h = img.height * ratio;
          const x = (1080 - w) / 2;
          const y = (1350 - h) / 2;
          ctx.drawImage(img, x, y, w, h);
        } else {
          ctx.fillStyle = '#eee';
          ctx.fillRect(0, 0, 1080, 1350);
        }
        ctx.save();
        ctx.font = 'bold 48px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 6;
        // Slide 1: три заголовка
        if (slide === 0) {
          const titles = slide1Titles;
          const yBase = 400 + 250; // сдвиг вниз
          const padY = 24;
          const padX = 32; // паддинг по ширине
          const boxW = 900;
          const boxH = 70;
          // Верхний (красный)
          ctx.save();
          ctx.font = 'bold 48px Inter, sans-serif';
          const w1 = ctx.measureText(titles[0]).width + padX*2;
          ctx.fillStyle = '#E53935';
          roundRect(ctx, 540 - w1/2, yBase, w1, boxH, 32);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(titles[0], 540, yBase + boxH/2 + 16);
          ctx.restore();
          // Средний (белый)
          ctx.save();
          ctx.font = 'bold 48px Inter, sans-serif';
          const w2 = ctx.measureText(titles[1]).width + padX*2;
          ctx.fillStyle = '#fff';
          roundRect(ctx, 540 - w2/2, yBase + boxH + padY, w2, boxH, 32);
          ctx.fill();
          ctx.fillStyle = '#111'; // ЧЁРНЫЙ ТЕКСТ!
          ctx.fillText(titles[1], 540, yBase + boxH + padY + boxH/2 + 16);
          ctx.restore();
          // Нижний (красный)
          ctx.save();
          ctx.font = 'bold 48px Inter, sans-serif';
          const w3 = ctx.measureText(titles[2]).width + padX*2;
          ctx.fillStyle = '#E53935';
          roundRect(ctx, 540 - w3/2, yBase + 2*(boxH + padY), w3, boxH, 32);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(titles[2], 540, yBase + 2*(boxH + padY) + boxH/2 + 16);
          ctx.restore();
        }
        // Слайды 2-6
        if (slide >= 1 && slide <= 5) {
          const s = slideTexts[slide-1];
          // Сдвиг вниз
          const yShift = 250;
          // Заголовок (красная подложка)
          ctx.save();
          ctx.font = 'bold 48px Inter, sans-serif';
          const padX = 32;
          const titleW = ctx.measureText(s.title).width + padX*2;
          ctx.fillStyle = '#E53935';
          roundRect(ctx, 540 - titleW/2, 120 + yShift, titleW, 70, 32);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillText(s.title, 540, 120 + yShift + 70/2 + 16);
          ctx.restore();
          // Описание (чёрная прозрачная подложка)
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.font = 'bold 36px Inter, sans-serif'; // ЖИРНЫЙ!
          const descMaxW = 900;
          const descPadX = 24;
          const descLines = 3;
          const descY = 220 + yShift;
          const descTextW = Math.min(ctx.measureText(s.desc).width + descPadX*2, descMaxW);
          roundRect(ctx, 540 - descMaxW/2, descY, descMaxW, 90, 32);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff';
          // Переносим текст
          ctx.textAlign = 'center';
          wrapText(ctx, s.desc, 540, descY + 90/2 + 12 - 36, descMaxW - descPadX*2, 40);
          ctx.restore();
          // Демо-изображение
          const demoFile = demoImages[slide-1];
          if (demoFile) {
            const demoImg = await loadImage(demoFile);
            const fixedW = 864;
            const ratio = fixedW / demoImg.width;
            const w = fixedW;
            const h = demoImg.height * ratio;
            const x = 540 - w/2;
            const y = 370 + yShift;
            ctx.drawImage(demoImg, x, y, w, h);
          }
        }
        ctx.restore();
        // Сохраняем PNG
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          folder.file(`${slide + 1}.png`, blob);
        }
      }
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "carousels-template2.zip");
    setIsGenerating(false);
  }
  // Вспомогательная функция для загрузки File в Image
  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise(resolve => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(file);
    });
  }

  return (
    <div className="w-full max-w-xl flex flex-col gap-6 bg-white p-6 rounded-xl shadow">
      <div className="mb-4">
        <div className="font-semibold mb-2">Слайд 1: Три заголовка</div>
        {[0,1,2].map(idx => (
          <input
            key={idx}
            className="border rounded px-3 py-2 mb-2 w-full"
            placeholder={`Заголовок ${idx+1}`}
            value={slide1Titles[idx]}
            onChange={e => handleTitleChange(idx, e.target.value)}
          />
        ))}
      </div>
      <div className="mb-4">
        <div className="font-semibold mb-2">Слайды 2–6: Заголовок, описание, демо</div>
        {slideTexts.map((slide, idx) => (
          <div key={idx} className="mb-3 p-2 border rounded">
            <div className="mb-1 font-medium">Слайд {idx+2}</div>
            <input
              className="border rounded px-3 py-2 mb-1 w-full"
              placeholder="Заголовок"
              value={slide.title}
              onChange={e => handleSlideTextChange(idx, 'title', e.target.value)}
            />
            <input
              className="border rounded px-3 py-2 mb-1 w-full"
              placeholder="Описание"
              value={slide.desc}
              onChange={e => handleSlideTextChange(idx, 'desc', e.target.value)}
            />
            <FileButton
              label={`Загрузить демо для слайда ${idx+2}`}
              inputRef={demoInputs[idx]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDemoImage(idx, e.target.files && e.target.files[0] ? e.target.files[0] : null)}
              multiple={false}
              accept={IMAGE_ACCEPT}
            />
            <span className="text-xs text-gray-500">{demoImages[idx] ? demoImages[idx]!.name : "Файл не выбран"}</span>
          </div>
        ))}
      </div>
      <div className="mb-4">
        <div className="font-semibold mb-2">Фоны для всех слайдов (папка):</div>
        <FileButton
          label="Загрузить папку с фонами"
          inputRef={bgInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.files && handleBackgrounds(e.target.files)}
          multiple={true}
          accept={IMAGE_ACCEPT}
        />
        <div className="text-xs text-gray-500">Загружено: {backgrounds.length} файлов</div>
        {backgrounds.length > 0 && (
          <div className="text-xs text-gray-700 mt-1">
            Каруселей будет: <b>{carousels.length}</b> (по 6 слайдов в каждой)
          </div>
        )}
      </div>
      <div className="mb-4">
        <div className="font-semibold mb-2">Превью слайда</div>
        <div className="w-full flex flex-col items-center">
          <div className="border rounded-lg bg-white shadow flex items-center justify-center" style={{ width: 216, height: 270 }}>
            <canvas
              ref={canvasRef}
              width={1080}
              height={1350}
              style={{ width: 216, height: 270, background: '#eee', borderRadius: 12 }}
            />
          </div>
          <div className="flex gap-2 mt-4">
            {[0,1,2,3,4,5].map(idx => (
              <button
                key={idx}
                className={`px-3 py-1 rounded ${previewSlide===idx ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setPreviewSlide(idx)}
              >
                {idx+1}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center"
        onClick={handleExportAll}
        disabled={isGenerating || !carousels.length}
      >
        {isGenerating ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Генерируется...
          </div>
        ) : (
          "Экспортировать карусели"
        )}
      </button>
    </div>
  );
} 