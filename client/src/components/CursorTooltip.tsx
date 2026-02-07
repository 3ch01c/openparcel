import { useState, useCallback } from "react";
import { createPortal } from "react-dom";

interface CursorTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
}

export function CursorTooltip({ children, content }: CursorTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      className="min-w-0"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onMouseMove={handleMouseMove}
      data-testid="cursor-tooltip-trigger"
    >
      {children}
      {visible && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md"
          style={{ left: pos.x + 12, top: pos.y + 12 }}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
}
