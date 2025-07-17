'use client';

import React, { useState } from "react";
import Template1Carousel from "../components/Template1Carousel";
import Template2Carousel from "../components/Template2Carousel";
import Template3Carousel from "../components/Template3Carousel";

export default function Home() {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8">TikTok Карусель Генератор</h1>
      <div className="flex gap-2 mb-8">
        <button
          className={`px-6 py-2 rounded-t-lg font-semibold border-b-2 transition-all duration-150 ${activeTab === 1 ? 'bg-white border-blue-600 text-blue-700 shadow' : 'bg-gray-100 border-transparent text-gray-500'}`}
          onClick={() => setActiveTab(1)}
        >
          Шаблон 1
        </button>
        <button
          className={`px-6 py-2 rounded-t-lg font-semibold border-b-2 transition-all duration-150 ${activeTab === 2 ? 'bg-white border-blue-600 text-blue-700 shadow' : 'bg-gray-100 border-transparent text-gray-500'}`}
          onClick={() => setActiveTab(2)}
        >
          Шаблон 2
        </button>
        <button
          className={`px-6 py-2 rounded-t-lg font-semibold border-b-2 transition-all duration-150 ${activeTab === 3 ? 'bg-white border-blue-600 text-blue-700 shadow' : 'bg-gray-100 border-transparent text-gray-500'}`}
          onClick={() => setActiveTab(3)}
        >
          Шаблон 3
        </button>
      </div>
      {activeTab === 1 && <Template1Carousel />}
      {activeTab === 2 && <Template2Carousel />}
      {activeTab === 3 && <Template3Carousel />}
    </div>
  );
}
