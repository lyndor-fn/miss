import React, { useRef, useEffect } from 'react';

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ onSave, onClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1A5C4A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 150;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    draw(e);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.beginPath();
      onSave(canvas.toDataURL());
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      onClear();
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs uppercase tracking-widest text-medical-slate opacity-60 font-medium">
        Signature du médecin
      </label>
      <div className="border border-medical-slate/20 rounded-lg bg-white overflow-hidden relative">
        <canvas
          ref={canvasRef}
          className="signature-canvas w-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <button
          type="button"
          onClick={clear}
          className="absolute bottom-2 right-2 text-[10px] uppercase tracking-tighter text-medical-blue hover:text-medical-green transition-colors font-bold"
        >
          Effacer
        </button>
      </div>
    </div>
  );
};
