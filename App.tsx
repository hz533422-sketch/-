import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ICONS, TRANSLATIONS } from './constants';
import { Language, Page, ScanPoint, DesignFile, AnalysisMetrics, ReportData } from './types';
import { analyzeSlabData } from './services/geminiService';
import { Heatmap } from './components/Heatmap';

const App = () => {
  // --- State ---
  const [lang, setLang] = useState<Language>(Language.ZH); // Default to Chinese
  const [page, setPage] = useState<Page>('dashboard');
  
  // Data State
  const [designFiles, setDesignFiles] = useState<DesignFile[]>([]);
  const [scanData, setScanData] = useState<ScanPoint[]>([]);
  const [analysisMetrics, setAnalysisMetrics] = useState<AnalysisMetrics | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
  // Loading States
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Refs for Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const t = (key: keyof typeof TRANSLATIONS.EN) => TRANSLATIONS[lang][key];

  // --- Actions ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      const newFile: DesignFile = {
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: (ext === 'ifc' || ext === 'rvt') ? 'ifc' : 'dwg',
        uploadDate: new Date().toLocaleDateString()
      };
      
      setDesignFiles(prev => [newFile, ...prev]);
      // Mock "Loading"
      setTimeout(() => alert(lang === Language.ZH ? "文件解析成功" : "File parsed successfully"), 500);
    }
  };

  const startScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please ensure permissions are granted.");
    }
  };

  const captureScan = () => {
    setIsScanning(true);
    // Simulate LiDAR Scanning Process
    setTimeout(() => {
      // Generate Mock Point Cloud Data (20x20 grid)
      const points: ScanPoint[] = [];
      const gridSize = 20;
      let totalDev = 0;
      let maxDev = -Infinity;
      let minDev = Infinity;
      
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          // Generate semi-random terrain: Perlin-ish noise simulation
          const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 5; 
          const randomVar = (Math.random() - 0.5) * 4;
          const z = noise + randomVar; // Deviation in mm

          points.push({ x, y, z, intensity: Math.random() });
          
          totalDev += Math.abs(z);
          if (z > maxDev) maxDev = z;
          if (z < minDev) minDev = z;
        }
      }

      setScanData(points);
      
      const avgDev = totalDev / points.length;
      setAnalysisMetrics({
        averageDeviation: avgDev,
        maxDeviation: maxDev,
        minDeviation: minDev,
        flatnessScore: Math.max(0, 100 - (avgDev * 5)), // Simple scoring algo
        timestamp: new Date().toLocaleString()
      });

      // Stop camera
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }

      setIsScanning(false);
      setPage('analysis');
    }, 2500);
  };

  const triggerGeminiAnalysis = async () => {
    if (!analysisMetrics) return;
    setIsAnalyzing(true);
    
    const result = await analyzeSlabData(analysisMetrics, lang);
    
    setReportData({
      metrics: analysisMetrics,
      aiAnalysis: result.analysis,
      recommendations: result.recommendations
    });
    
    setIsAnalyzing(false);
    setPage('report');
  };

  const exportPDF = () => {
    window.print();
  };

  // --- Views ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">{t('status')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full text-green-600"><ICONS.Check /></div>
            <div>
              <p className="text-sm text-green-800 font-semibold">{t('ready')}</p>
              <p className="text-xs text-green-600">LiDAR Module Online</p>
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-3">
             <div className="bg-blue-100 p-2 rounded-full text-blue-600"><ICONS.File /></div>
             <div>
               <p className="text-sm text-blue-800 font-semibold">{designFiles.length > 0 ? designFiles[0].name : t('noFile')}</p>
               <p className="text-xs text-blue-600">{designFiles.length > 0 ? "Design Loaded" : "Upload Required"}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">{t('recentFiles')}</h2>
          <button onClick={() => setPage('upload')} className="text-sm text-indigo-600 font-medium hover:underline">Manage</button>
        </div>
        {designFiles.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
            {t('uploadDesc')}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {designFiles.map((f, i) => (
              <li key={i} className="py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${f.type === 'ifc' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                    {f.type.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{f.name}</p>
                    <p className="text-xs text-slate-400">{f.size} • {f.uploadDate}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button 
        onClick={() => { setPage('scan'); startScan(); }}
        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
      >
        <ICONS.Scan /> {t('scanNow')}
      </button>
    </div>
  );

  const renderScan = () => (
    <div className="h-full flex flex-col relative bg-black rounded-xl overflow-hidden">
      <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-80"></video>
      <canvas ref={canvasRef} className="hidden" />
      
      {/* HUD Overlay */}
      <div className="relative z-10 flex flex-col justify-between h-full p-6">
        <div className="bg-black/50 backdrop-blur text-white p-2 rounded-lg self-start">
          <p className="text-xs font-mono text-green-400">LIDAR_SIM_V1.0 // ONLINE</p>
        </div>

        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
             <div className="text-center">
               <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
               <p className="text-white font-mono animate-pulse">{t('scanning')}</p>
             </div>
          </div>
        )}

        <div className="flex justify-center pb-8">
           <button 
             onClick={captureScan}
             className="w-20 h-20 rounded-full border-4 border-white bg-red-500 hover:bg-red-600 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
           ></button>
        </div>
      </div>
      
      {/* Grid Lines Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-6 animate-fade-in">
      {analysisMetrics && (
        <>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider">{t('deviationMap')}</h3>
            <div className="flex justify-center">
               <Heatmap data={scanData} width={300} height={300} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
               <p className="text-xs text-slate-500 mb-1">{t('avgDev')}</p>
               <p className="text-2xl font-bold text-slate-800">{analysisMetrics.averageDeviation.toFixed(2)}mm</p>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
               <p className="text-xs text-slate-500 mb-1">{t('maxDev')}</p>
               <p className={`text-2xl font-bold ${analysisMetrics.maxDeviation > 5 ? 'text-red-500' : 'text-slate-800'}`}>
                 {analysisMetrics.maxDeviation.toFixed(2)}mm
               </p>
             </div>
          </div>

          <button 
            onClick={triggerGeminiAnalysis}
            disabled={isAnalyzing}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <><span className="animate-spin">✨</span> {t('analyzing')}</>
            ) : (
              <><span className="text-xl">✨</span> {t('aiInsights')}</>
            )}
          </button>
        </>
      )}
    </div>
  );

  const renderReport = () => (
    <div className="space-y-6 animate-fade-in print:space-y-4">
       <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 border-b pb-4">
             <div>
                <h1 className="text-2xl font-bold text-slate-900">Slab QC Report</h1>
                <p className="text-slate-500 text-sm">{t('project')}</p>
                <p className="text-xs text-slate-400 mt-1">{reportData?.metrics.timestamp}</p>
             </div>
             <div className="text-right">
                <div className="text-3xl font-black text-slate-900">{reportData?.metrics.flatnessScore}</div>
                <div className="text-xs uppercase text-slate-500 font-bold">Score</div>
             </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-8 bg-slate-50 p-4 rounded-lg print:border print:bg-white">
             <div>
                <span className="block text-xs text-slate-500">Avg Deviation</span>
                <span className="block text-lg font-bold">{reportData?.metrics.averageDeviation.toFixed(2)} mm</span>
             </div>
             <div>
                <span className="block text-xs text-slate-500">Max Deviation</span>
                <span className="block text-lg font-bold text-red-600">{reportData?.metrics.maxDeviation.toFixed(2)} mm</span>
             </div>
             <div>
                <span className="block text-xs text-slate-500">Tolerance</span>
                <span className="block text-lg font-bold">±5 mm</span>
             </div>
          </div>
          
          {/* Heatmap in Report */}
          <div className="mb-8 flex justify-center print:break-inside-avoid">
             <Heatmap data={scanData} width={250} height={250} />
          </div>

          {/* AI Content */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <ICONS.Analysis /> {t('analysis')}
            </h3>
            <p className="text-slate-700 leading-relaxed text-sm bg-blue-50 p-4 rounded-lg print:bg-white print:border">
              {reportData?.aiAnalysis}
            </p>
          </div>

          <div>
             <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
               <ICONS.Alert /> {t('remedialAction')}
             </h3>
             <ul className="list-disc pl-5 space-y-2 text-slate-700 text-sm">
               {reportData?.recommendations.map((rec, i) => (
                 <li key={i}>{rec}</li>
               ))}
             </ul>
          </div>
       </div>

       <button 
         onClick={exportPDF}
         className="w-full py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 no-print"
       >
         <ICONS.Pdf /> {t('exportPdf')}
       </button>
    </div>
  );

  const renderSettings = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold mb-6">{t('settings')}</h2>
      
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-700 mb-3">{t('language')}</label>
        <div className="flex gap-4">
          <button 
            onClick={() => setLang(Language.EN)}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${lang === Language.EN ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            English
          </button>
          <button 
            onClick={() => setLang(Language.ZH)}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${lang === Language.ZH ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            中文
          </button>
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500">
        <p>SlabScan AI v1.0.2</p>
        <p>Gemini Model: 2.5-flash</p>
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col justify-center items-center text-center">
      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-6">
        <ICONS.Upload />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">{t('upload')}</h2>
      <p className="text-slate-500 mb-8 max-w-xs">{t('uploadDesc')}</p>
      
      <label className="w-full max-w-xs relative cursor-pointer">
        <div className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg">
          Select File
        </div>
        <input type="file" className="hidden" accept=".dwg,.ifc,.rvt" onChange={handleFileUpload} />
      </label>
      <p className="mt-4 text-xs text-slate-400">Supported: .DWG, .IFC, .RVT</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-20">
      {/* Top Mobile Bar */}
      <div className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between sticky top-0 z-50">
        <span className="font-bold text-indigo-700 text-lg">{t('appTitle')}</span>
        <button onClick={() => setPage('settings')} className="text-slate-500"><ICONS.Settings/></button>
      </div>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto p-4 md:p-8">
        {page === 'dashboard' && renderDashboard()}
        {page === 'scan' && renderScan()}
        {page === 'upload' && renderUpload()}
        {page === 'analysis' && renderAnalysis()}
        {page === 'report' && renderReport()}
        {page === 'settings' && renderSettings()}
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-16 flex items-center justify-around px-2 z-50 no-print">
        <NavButton active={page === 'dashboard'} onClick={() => setPage('dashboard')} icon={<ICONS.Home />} label={t('dashboard')} />
        <NavButton active={page === 'scan'} onClick={() => { setPage('scan'); startScan(); }} icon={<ICONS.Scan />} label={t('scan')} />
        <NavButton active={page === 'upload'} onClick={() => setPage('upload')} icon={<ICONS.Upload />} label="File" />
        <NavButton active={page === 'analysis' || page === 'report'} onClick={() => setPage(reportData ? 'report' : 'analysis')} icon={<ICONS.Analysis />} label={t('analysis')} />
      </nav>

      {/* Side Nav (Desktop) */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-white border-r border-slate-200 flex-col items-center py-6 gap-8 z-50">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">S</div>
        <div className="flex flex-col gap-6 w-full">
           <NavButtonDesktop active={page === 'dashboard'} onClick={() => setPage('dashboard')} icon={<ICONS.Home />} />
           <NavButtonDesktop active={page === 'scan'} onClick={() => { setPage('scan'); startScan(); }} icon={<ICONS.Scan />} />
           <NavButtonDesktop active={page === 'upload'} onClick={() => setPage('upload')} icon={<ICONS.Upload />} />
           <NavButtonDesktop active={page === 'analysis' || page === 'report'} onClick={() => setPage(reportData ? 'report' : 'analysis')} icon={<ICONS.Analysis />} />
           <NavButtonDesktop active={page === 'settings'} onClick={() => setPage('settings')} icon={<ICONS.Settings />} />
        </div>
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <div className="scale-90">{icon}</div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const NavButtonDesktop = ({ active, onClick, icon }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex justify-center py-3 border-l-4 transition-colors ${active ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
  >
    {icon}
  </button>
);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
